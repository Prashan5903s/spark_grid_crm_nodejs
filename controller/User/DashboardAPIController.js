    const mongoose = require("mongoose");
    const Lead = require("../../model/Leads");
    const User = require("../../model/User");
    const Zone = require("../../model/Zone");
    const { successResponse } = require("../../util/response");
    const dayjs = require("dayjs");

    // ================= HELPERS =================

    const getAllSubordinateIds = async (userId) => {
        const result = await User.aggregate([
            { $match: { _id: userId } },
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
                        $setUnion: [["$_id"], "$subordinates._id"]
                    }
                }
            }
        ]);

        return result[0]?.allIds || [];
    };

    const buildMatch = (userIds, startDate, endDate) => {
        const match = {
            created_by: { $in: userIds }
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
            const { from, to } = req.query;

            let startDate = null;
            let endDate = null;

            if (from && to) {
                startDate = dayjs(from).startOf("day").toDate();
                endDate = dayjs(to).endOf("day").toDate();
            }

            const headUser = await User.findById(userId);
            const headUserId = headUser.created_by;

            const userIds = await getAllSubordinateIds(userId);

            // ================= TEAM PERFORMANCE =================
            const teamData = await User.find({
                _id: { $in: userIds }
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
                    maxUser = { user: tD, totalLeads: count };
                }

                if (count < minLeads) {
                    minLeads = count;
                    minUser = { user: tD, totalLeads: count };
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
            const zones = await Zone.find({ created_by: headUserId });
            const finalZoneLead = [];

            for (const z of zones) {
                const zoneUsers = await User.find({ zone_id: z._id });

                let allZoneUserIds = [];

                for (const user of zoneUsers) {
                    const subIds = await getAllSubordinateIds(user._id);
                    allZoneUserIds = allZoneUserIds.concat(subIds);
                }

                const uniqueUserIds = [
                    ...new Set(allZoneUserIds.map(id => id.toString()))
                ];

                const zoneMatch = buildMatch(uniqueUserIds, startDate, endDate);
                const zoneLeads = await Lead.find(zoneMatch);

                const totalZoneLead = zoneLeads.length;
                const totalConvert = zoneLeads.filter(l => l.is_converted).length;

                finalZoneLead.push({
                    zoneName: z.name,
                    totalLead: totalZoneLead,
                    totalConvert
                });
            }

            // ================= MONTHLY =================

            let monthList = [];

            if (from && to) {
                monthList = getMonthsBetween(dayjs(from), dayjs(to));
            } else {
                // fallback (current year)
                monthList = Array.from({ length: 12 }, (_, i) =>
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

            const todayLeads = await Lead.aggregate([
                {
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
                { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "users",
                        localField: "assignedUser.reporting_manager_id",
                        foreignField: "_id",
                        as: "reportingManagerUser"
                    }
                },
                { $unwind: { path: "$reportingManagerUser", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "app_config",
                        pipeline: [
                            { $match: { type: "follow_up_data" } }
                        ],
                        as: "config"
                    }
                },
                {
                    $addFields: {
                        config: { $arrayElemAt: ["$config", 0] }
                    }
                },
                {
                    $lookup: {
                        from: "app_config",
                        let: { statusId: "$lead_status_id" },
                        pipeline: [
                            { $match: { type: "leads_data" } },
                            { $unwind: "$leads_status_data" },
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
                        lead_status: { $arrayElemAt: ["$lead_status.leads_status_data", 0] }
                    }
                }
            ]);

            // ================= FINAL =================
            const finalData = {
                isPending,
                convertPerc,
                totalLead,
                totalConverted,
                finalZoneLead,
                leadsFinancialYear,
                todayLeads,
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
