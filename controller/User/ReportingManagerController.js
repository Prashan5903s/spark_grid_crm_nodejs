const mongoose = require("mongoose")

const User = require("../../model/User");
const Lead = require("../../model/Leads")
const AppConfig = require("../../model/AppConfig");
const FollowUp = require("../../model/FollowUp")
const Zone = require("../../model/Zone")
const Proposal = require("../../model/NotificationLog")
const { decrypt } = require("../../util/encryption");
const { successResponse, errorResponse } = require("../../util/response");

const getUserAndSubordinateProposal = async (userId) => {

    let allProposal = [];

    //  Get leads created by this user
    const userProposal = await Proposal.find({ user_id: userId })
        .populate("user_id template_id")
        .lean();
    allProposal.push(...userProposal);

    //  Find subordinates
    const subordinates = await User.find({ reporting_manager_id: userId }).lean();

    for (let sub of subordinates) {
        const subProposal = await getUserAndSubordinateProposal(sub._id);
        allProposal.push(...subProposal);
    }

    return allProposal;
};

const getAllSubordinateIds = async (userId) => {
    const result = await User.aggregate([
        {
            $match: {
                _id: (userId)
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
                    $concatArrays: [
                        ["$_id"],
                        "$subordinates._id"
                    ]
                }
            }
        }
    ]);

    return result[0]?.allIds || [];
};

const getUserAndSubordinateFollowUp = async (userId) => {

    const userIds = await getAllSubordinateIds(userId);

    const followUp = await FollowUp.aggregate([
        {
            $match: {
                created_by: { $in: userIds.map(id => (id)) }
            }
        },
        {
            $lookup: {
                from: "users",
                let: { createdId: "$created_by" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$createdId"]
                            }
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            first_name: 1,
                            last_name: 1,
                            reporting_manager_id: 1
                        }
                    }
                ],
                as: "createdUser"
            }
        },
        {
            $unwind: {
                path: "$createdUser",
                preserveNullAndEmptyArrays: true
            }
        },
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
            $unwind: "$config"
        },
        {
            $addFields: {
                status_data: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$config.follow_up_status_data",
                                as: "status",
                                cond: { $eq: ["$$status._id", "$status"] }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                follow_up_type_data: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$config.follow_up_type_data",
                                as: "type",
                                cond: { $eq: ["$$type._id", "$follow_up_type"] }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                priority_data: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$config.follow_up_priority_data",
                                as: "priority",
                                cond: { $eq: ["$$priority._id", "$priority"] }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $project: {
                config: 0
            }
        }
    ])

    return followUp;
};

const getUserAndSubordinateLeads = async (userId) => {
    const userIds = await getAllSubordinateIds(userId);

    const leads = await Lead.aggregate([
        {
            $match: {
                created_by: { $in: userIds.map(id => (id)) }
            }
        },

        // Get followups (no unwind)
        {
            $lookup: {
                from: "follow_ups",
                localField: "_id",
                foreignField: "lead_id",
                as: "followUp"
            }
        },

        // Sort followups inside array
        {
            $addFields: {
                followUp: {
                    $sortArray: {
                        input: "$followUp",
                        sortBy: { created_at: -1 }
                    }
                }
            }
        },
        {
            $lookup: {
                from: "users",
                let: { userId: "$assigned_user_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$userId"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            first_name: 1,
                            last_name: 1,
                            reporting_manager_id: 1
                        }
                    }
                ],
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
                let: { managerId: "$assignedUser.reporting_manager_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$managerId"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            first_name: 1,
                            last_name: 1
                        }
                    }
                ],
                as: "reportingManagerUser"
            }
        },
        {
            $unwind: {
                path: "$reportingManagerUser",
                preserveNullAndEmptyArrays: true
            }
        },
        // FollowUp Config Mapping
        {
            $lookup: {
                from: "app_config",
                pipeline: [
                    { $match: { type: "follow_up_data" } },
                    {
                        $project: {
                            follow_up_status_data: 1,
                            follow_up_priority_data: 1,
                            follow_up_type_data: 1
                        }
                    }
                ],
                as: "config"
            }
        },

        {
            $addFields: {
                config: { $arrayElemAt: ["$config", 0] }
            }
        },

        // Map config into each followUp
        {
            $addFields: {
                followUp: {
                    $map: {
                        input: "$followUp",
                        as: "fu",
                        in: {
                            $mergeObjects: [
                                "$$fu",
                                {
                                    status_data: {
                                        $first: {
                                            $filter: {
                                                input: "$config.follow_up_status_data",
                                                as: "s",
                                                cond: { $eq: ["$$s._id", "$$fu.status"] }
                                            }
                                        }
                                    },
                                    priority_data: {
                                        $first: {
                                            $filter: {
                                                input: "$config.follow_up_priority_data",
                                                as: "p",
                                                cond: { $eq: ["$$p._id", "$$fu.priority"] }
                                            }
                                        }
                                    },
                                    type_data: {
                                        $first: {
                                            $filter: {
                                                input: "$config.follow_up_type_data",
                                                as: "t",
                                                cond: { $eq: ["$$t._id", "$$fu.follow_up_type"] }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },

        // Lead Status Mapping
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
                    },
                    {
                        $project: {
                            _id: 0,
                            lead_status: "$leads_status_data"
                        }
                    }
                ],
                as: "lead_status"
            }
        },

        {
            $addFields: {
                lead_status: { $arrayElemAt: ["$lead_status.lead_status", 0] }
            }
        },

        {
            $project: {
                config: 0
            }
        }
    ]);

    return leads;
};

const getAllSubordinatesFlat = async (managerId, userLevels, result = []) => {

    const users = await User.find({ reporting_manager_id: managerId })
        .populate("reporting_manager_id", "first_name last_name reporting_manager_id")
        .lean();

    for (let user of users) {

        //  Manager Name
        const manager = user.reporting_manager_id;

        user.reporting_manager_name = manager
            ? `${manager.first_name || ""} ${manager.last_name || ""}`.trim()
            : null;

        const leads = await getUserAndSubordinateLeads(user._id);
        const followUp = await getUserAndSubordinateFollowUp(user._id)
        const proposal = await getUserAndSubordinateProposal(user._id)

        const zones = await Zone.find().lean();

        let location = {
            zone_name: null,
            region_name: null,
            branch_name: null
        };

        for (const zone of zones) {

            //  Zone match
            if (user.zone_id && zone._id.toString() === user.zone_id.toString()) {
                location.zone_name = zone.name;
                break;
            }

            //  Region match
            if (user.region_id && zone.region?.length) {
                const region = zone.region.find(
                    r => r._id.toString() === user.region_id.toString()
                );

                if (region) {
                    location.region_name = region.name;
                    break;
                }
            }

            //  Branch match
            if (user.branch_id && zone.region?.length) {
                for (const region of zone.region) {
                    const branch = region.branch?.find(
                        b => b._id.toString() === user.branch_id.toString()
                    );

                    if (branch) {
                        location.branch_name = branch.name;
                        break;
                    }
                }
            }

            if (location.branch_name) break;
        }

        // assign to user if needed
        user.location = location;

        user.leads = leads;
        user.followUp = followUp;
        user.proposal = proposal;

        //  User Level Mapping
        const level = userLevels.find(
            lvl => lvl._id.toString() === user.user_level_id?.toString()
        );
        user.user_level = level ? level.title : null;

        //  Decrypt fields
        user.email = user.email ? decrypt(user.email) : null;
        user.phone = user.phone ? decrypt(user.phone) : null;

        //  Clean response
        delete user.reporting_manager_id;

        // Instead push directly
        result.push(user);

        //  Recursive call (keep flattening)
        await getAllSubordinatesFlat(user._id, userLevels, result);
    }

    return result;
};

exports.getReportingManagerController = async (req, res, next) => {
    try {
        const userId = req.userId;

        const appConfig = await AppConfig.findOne({ type: "user_level_data" });
        const userLevels = appConfig?.user_level_data || [];

        //  Get flat hierarchy
        const hierarchy = await getAllSubordinatesFlat(userId, userLevels);

        return successResponse(
            res,
            "Hierarchy fetched successfully",
            hierarchy
        );

    } catch (error) {
        next(error);
    }
};

exports.getReportingInfoController = async (req, res, next) => {
    try {
        const reportingManagerId = req?.userId;
        const { userId } = req?.params;
        const { solution, source, status } = req.query;

        //  Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return errorResponse(res, "Invalid userId", {}, 400);
        }

        const finalUserId = new mongoose.Types.ObjectId(userId);

        //  Fetch users in parallel
        const [user, reportingHead] = await Promise.all([
            User.findById(finalUserId),
            User.findById(reportingManagerId)
        ]);

        //  Safe checks
        if (
            !user ||
            !reportingHead ||
            user?.created_by?.toString() !== reportingHead?.created_by?.toString()
        ) {
            return errorResponse(res, "User not found", {}, 404);
        }

        let lead = await getUserAndSubordinateLeads(finalUserId);
        let followUp = await getUserAndSubordinateFollowUp(finalUserId);
        let proposal = await getUserAndSubordinateProposal(finalUserId);

        //  Apply filters properly (use filter instead of find)
        if (solution) {
            lead = lead.filter(l => l.solution_id?.toString() === solution);
        }

        if (source) {
            lead = lead.filter(l => l.source_id?.toString() === source);
        }

        if (status) {
            lead = lead.filter(l => l.lead_status_id?.toString() === status);
            followUp = followUp.filter(f => f.lead_data?.lead_status_id?.toString() === status);
        }

        const finalData = {
            lead,
            followUp,
            proposal
        };

        return successResponse(
            res,
            "Reporting manager info fetched successfully",
            finalData
        );

    } catch (error) {
        next(error);
    }
};