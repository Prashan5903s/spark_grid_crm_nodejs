    const mongoose = require("mongoose");
    const Lead = require("../../model/Leads");
    const User = require("../../model/User");
    const Zone = require("../../model/Zone");
    const {
        successResponse
    } = require("../../util/response");
    const dayjs = require("dayjs");

    // ================= HELPERS =================

    const getAllSubordinateIds = async (userId) => {
        const result = await User.aggregate([{
                $match: {
                    _id: userId
                }
            },
            {
                $graphLookup: {
                    from: "users",
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: "reporting_manager_id",
                    as: "subordinates"
                }
            },
            {
                $project: {
                    allIds: {
                        $setUnion: [
                            ["$_id"], "$subordinates._id"
                        ]
                    }
                }
            }
        ]);

        return result[0]?.allIds || [];
    };

    const buildMatch = (userIds, startDate, endDate) => {
        const match = {
            created_by: {
                $in: userIds
            }
        };

        if (startDate && endDate) {
            match.created_at = {
                $gte: startDate,
                $lte: endDate
            };
        }

        return match;
    };

    // ✅ NEW: dynamic months
    const getMonthsBetween = (start, end) => {
        const months = [];
        let current = start.startOf("month");

        while (current.isBefore(end) || current.isSame(end, "month")) {
            months.push(current.clone());
            current = current.add(1, "month");
        }

        return months;
    };

    // ================= API =================

    exports.getDashboardAPI = async (req, res, next) => {
        try {

            const userId = mongoose.Types.ObjectId.createFromHexString(req.userId);

            const {
                from,
                to,
                zoneId,
                regionId,
                branchId
            } = req.query;

            let startDate = null;
            let endDate = null;

            if (from && to) {
                startDate = dayjs(from).startOf("day").toDate();
                endDate = dayjs(to).endOf("day").toDate();
            }

            const filteredZoneId = zoneId ? zoneId.split(",") : [];
            const filteredRegionId = regionId ? regionId.split(",") : [];
            const filteredBranchId = branchId ? branchId.split(",") : [];

            const headUser = await User.findById(userId);
            const headUserId = headUser.created_by;

            const userIds = await getAllSubordinateIds(userId);

            // ================= TEAM PERFORMANCE =================
            const teamData = await User.find({
                _id: {
                    $in: userIds
                }
            }).select("first_name last_name");

            let maxUser = null;
            let minUser = null;
            let maxLeads = -Infinity;
            let minLeads = Infinity;

            for (const tD of teamData) {
                const subIds = await getAllSubordinateIds(tD._id);

                const count = await Lead.countDocuments(
                    buildMatch(subIds, startDate, endDate)
                );

                if (count > maxLeads) {
                    maxLeads = count;
                    maxUser = {
                        user: tD,
                        totalLeads: count
                    };
                }

                if (count < minLeads) {
                    minLeads = count;
                    minUser = {
                        user: tD,
                        totalLeads: count
                    };
                }
            }

            // ================= TOTAL =================
            const leads = await Lead.find(
                buildMatch(userIds, startDate, endDate)
            );

            const totalLead = leads.length;
            const totalConverted = leads.filter(l => l.is_converted).length;
            const convertPerc = totalLead ? (totalConverted / totalLead) * 100 : 0;
            const isPending = totalLead - totalConverted;

            // ================= ZONE =================
            const zones = await Zone.find({
                created_by: headUserId
            });

            const finalZoneLead = [];
            let finalFilterMessage = "Zone data";

            // helper to calculate stats
            const calculateStats = (leads) => ({
                totalLead: leads.length,
                totalConvert: leads.filter(l => l.is_converted).length
            });

            let filter = {
                created_by: headUserId
            };

            const level = headUser.user_level_id.toString();

            // DB FILTER
            if (level === "69d3a36f9e57cff228594aea") {
                filter._id = headUser.zone_id;

            } else if (level === "69d3a36f9e57cff228594aeb") {
                filter["region._id"] = headUser.region_id;

            } else if (level === "69d75130d9daa00434648316") {
                // no extra filter (only created_by)

            } else {
                filter["region.branch._id"] = headUser.branch_id;
            }

            const zoneData = await Zone.find(filter);

            // REGION DATA
            const regionData = zoneData.map(z => ({
                zoneId: z._id,
                region: (z.region || []).filter(r => {

                    //  ONLY REGION FILTER
                    if (level === "69d3a36f9e57cff228594aeb") {
                        return r._id.toString() === headUser.region_id.toString();
                    }

                    // NO FILTER for these levels
                    if (
                        level === "69d75130d9daa00434648316" ||
                        level === "69d3a36f9e57cff228594aea"
                    ) {
                        return true;
                    }

                    // ONLY BRANCH FILTER
                    return (r.branch || []).some(b =>
                        b._id.toString() === headUser.branch_id.toString()
                    );
                })
            }));

            // BRANCH DATA
            const branchData = regionData.flatMap(r =>
                (r.region || []).map(regionItem => ({
                    zoneId: r.zoneId,
                    regionId: regionItem._id,
                    branch: (regionItem.branch || []).filter(b => {

                        //  NO FILTER for these levels
                        if (
                            level === "69d75130d9daa00434648316" ||
                            level === "69d3a36f9e57cff228594aea"
                        ) {
                            return true;
                        }

                        //  NO branch filter for REGION level
                        if (level === "69d3a36f9e57cff228594aeb") {
                            return true;
                        }

                        // ONLY BRANCH FILTER
                        return b._id.toString() === headUser.branch_id.toString();
                    })
                }))
            );

            if (filteredBranchId?.length > 0) {

                finalFilterMessage = "Branch performance";

                const zonesData = await Zone.find({
                    "region.branch._id": {
                        $in: filteredBranchId
                    }
                });

                const branchMap = {};

                zonesData.forEach(z => {
                    z.region?.forEach(r => {
                        r.branch?.forEach(b => {
                            if (filteredBranchId.includes(b._id.toString())) {
                                branchMap[b._id.toString()] = b.name;
                            }
                        });
                    });
                });

                const branchIds = Object.keys(branchMap);

                const leads = await Lead.find({
                    branch_id: {
                        $in: branchIds
                    },
                    created_by: {
                        $in: userIds
                    }
                });

                const grouped = {};

                leads.forEach(l => {
                    const id = l.branch_id.toString();
                    if (!grouped[id]) grouped[id] = [];
                    grouped[id].push(l);
                });

                branchIds.forEach(id => {
                    const stats = calculateStats(grouped[id] || []);

                    finalZoneLead.push({
                        zoneName: branchMap[id],
                        ...stats
                    });
                });

            } else if (filteredRegionId?.length > 0) {

                finalFilterMessage = "Regional performance";

                const zonesData = await Zone.find({
                    "region._id": {
                        $in: filteredRegionId
                    }
                });

                const regionMap = {};
                let allBranchIds = [];

                zonesData.forEach(z => {
                    z.region?.forEach(r => {
                        if (filteredRegionId.includes(r._id.toString())) {
                            const branchIds = (r.branch || []).map(b => b._id.toString());

                            regionMap[r._id.toString()] = {
                                name: r.name,
                                branchIds
                            };

                            allBranchIds.push(...branchIds);
                        }
                    });
                });

                const leads = await Lead.find({
                    branch_id: {
                        $in: allBranchIds
                    },
                    created_by: {
                        $in: userIds
                    }
                });

                Object.values(regionMap).forEach(region => {

                    const regionLeads = leads.filter(l =>
                        region.branchIds.includes(l.branch_id.toString())
                    );

                    const stats = calculateStats(regionLeads);

                    finalZoneLead.push({
                        zoneName: region.name,
                        ...stats
                    });
                });

            } else if (filteredZoneId?.length > 0) {

                finalFilterMessage = "Zone performance";

                const zonesData = await Zone.find({
                    _id: {
                        $in: filteredZoneId
                    }
                });

                const zoneMap = {};
                let allBranchIds = [];

                zonesData.forEach(z => {
                    const branchIds = (z.region || []).flatMap(r =>
                        (r.branch || []).map(b => b._id.toString())
                    );

                    zoneMap[z._id.toString()] = {
                        name: z.name,
                        branchIds
                    };

                    allBranchIds.push(...branchIds);
                });

                const leads = await Lead.find({
                    branch_id: {
                        $in: allBranchIds
                    },
                    created_by: {
                        $in: userIds
                    }
                });

                Object.values(zoneMap).forEach(zone => {

                    const zoneLeads = leads.filter(l =>
                        zone.branchIds.includes(l.branch_id.toString())
                    );

                    const stats = calculateStats(zoneLeads);

                    finalZoneLead.push({
                        zoneName: zone.name,
                        ...stats
                    });
                });

            } else {

                finalFilterMessage = "Zone performance";

                if (
                    level === "69d3a36f9e57cff228594aea" ||
                    level === "69d75130d9daa00434648316"
                ) {

                    const zoneMap = {};
                    let allBranchIds = [];

                    zoneData.forEach(z => {
                        const branchIds = (z.region || []).flatMap(r =>
                            (r.branch || []).map(b => b._id.toString())
                        );

                        zoneMap[z._id.toString()] = {
                            name: z.name,
                            branchIds
                        };

                        allBranchIds.push(...branchIds);
                    });

                    const leads = await Lead.find({
                        branch_id: {
                            $in: allBranchIds
                        },
                        created_by: {
                            $in: userIds
                        }
                    });

                    Object.values(zoneMap).forEach(zone => {
                        const zoneLeads = leads.filter(l =>
                            zone.branchIds.includes(l.branch_id.toString())
                        );

                        const stats = calculateStats(zoneLeads);

                        finalZoneLead.push({
                            zoneName: zone.name,
                            ...stats
                        });
                    });

                } else if (level === "69d3a36f9e57cff228594aeb") {

                    finalFilterMessage = "Region performance";

                    const regionMap = {};
                    let allBranchIds = [];

                    // ✅ FIX: regionData structure
                    regionData?.forEach(z => {
                        (z.region || []).forEach(r => {

                            const branchIds = (r.branch || []).map(b => b._id.toString());

                            regionMap[r._id.toString()] = {
                                name: r.name,
                                branchIds
                            };

                            allBranchIds.push(...branchIds);
                        });
                    });

                    const leads = await Lead.find({
                        branch_id: {
                            $in: allBranchIds
                        },
                        created_by: {
                            $in: userIds
                        }
                    });

                    Object.values(regionMap).forEach(region => {

                        const regionLeads = leads.filter(l =>
                            region.branchIds.includes(l.branch_id.toString())
                        );

                        const stats = calculateStats(regionLeads);

                        finalZoneLead.push({
                            zoneName: region.name,
                            ...stats
                        });
                    });

                } else {

                    finalFilterMessage = "Branch performance";

                    const branchMap = {};

                    // ✅ FIX: branchData structure
                    branchData.forEach(item => {
                        (item.branch || []).forEach(b => {
                            branchMap[b._id.toString()] = b.name;
                        });
                    });

                    const branchIds = Object.keys(branchMap);

                    const leads = await Lead.find({
                        branch_id: {
                            $in: branchIds
                        },
                        created_by: {
                            $in: userIds
                        }
                    });

                    const grouped = {};

                    leads.forEach(l => {
                        const id = l.branch_id.toString();
                        if (!grouped[id]) grouped[id] = [];
                        grouped[id].push(l);
                    });

                    branchIds.forEach(id => {
                        const stats = calculateStats(grouped[id] || []);

                        finalZoneLead.push({
                            zoneName: branchMap[id],
                            ...stats
                        });
                    });
                }

            }

            // ================= MONTHLY =================

            let monthList = [];

            if (from && to) {
                monthList = getMonthsBetween(dayjs(from), dayjs(to));
            } else {
                // fallback (current year)
                monthList = Array.from({
                        length: 12
                    }, (_, i) =>
                    dayjs().month(i)
                );
            }

            const leadsFinancialYear = [];

            for (const m of monthList) {
                const start = m.startOf("month").toDate();
                const end = m.endOf("month").toDate();

                const monthlyLeads = await Lead.find(
                    buildMatch(userIds, start, end)
                );

                const total = monthlyLeads.length;
                const converted = monthlyLeads.filter(l => l.is_converted).length;

                leadsFinancialYear.push({
                    month: m.format("MMM YYYY"),
                    currentTotalLead: total,
                    isCurrentConvertedLead: converted,
                    currentConverPerc: total ? (converted / total) * 100 : 0
                });
            }

            const todayStartDate = dayjs().startOf("day").toDate();
            const todayEndDate = dayjs().endOf("day").toDate();

            const todayLeads = await Lead.aggregate([{
                    $match: buildMatch(userIds, todayStartDate, todayEndDate)
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "assigned_user_id",
                        foreignField: "_id",
                        as: "assignedUser"
                    }
                },
                {
                    $unwind: {
                        path: "$assignedUser",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "assignedUser.reporting_manager_id",
                        foreignField: "_id",
                        as: "reportingManagerUser"
                    }
                },
                {
                    $unwind: {
                        path: "$reportingManagerUser",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "app_config",
                        pipeline: [{
                            $match: {
                                type: "follow_up_data"
                            }
                        }],
                        as: "config"
                    }
                },
                {
                    $addFields: {
                        config: {
                            $arrayElemAt: ["$config", 0]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "app_config",
                        let: {
                            statusId: "$lead_status_id"
                        },
                        pipeline: [{
                                $match: {
                                    type: "leads_data"
                                }
                            },
                            {
                                $unwind: "$leads_status_data"
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$leads_status_data._id", "$$statusId"]
                                    }
                                }
                            }
                        ],
                        as: "lead_status"
                    }
                },
                {
                    $addFields: {
                        lead_status: {
                            $arrayElemAt: ["$lead_status.leads_status_data", 0]
                        }
                    }
                }
            ]);

            // ================= FINAL =================
            const finalData = {
                isPending,
                convertPerc,
                totalLead,
                userLevel: headUser.user_level_id || "",
                totalConverted,
                finalZoneLead,
                leadsFinancialYear,
                todayLeads,
                zoneData,
                regionData,
                branchData,
                filterMessage: finalFilterMessage,
                performance: {
                    maxUser,
                    minUser
                }
            };

            return successResponse(res, "Dashboard fetched successfully", finalData);

        } catch (error) {
            next(error);
        }
    };