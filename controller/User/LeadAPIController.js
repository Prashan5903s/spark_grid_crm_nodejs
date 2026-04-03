const mongoose = require("mongoose")
const Lead = require("../../model/Leads");
const Country = require("../../model/Country")
const AppConfig = require("../../model/AppConfig")
const { successResponse, errorResponse } = require("../../util/response");

exports.getLeadAPIController = async (req, res, next) => {
    try {

        const userId = req?.userId;

        const { type } = req?.params;

        let finalData = [];

        if (type === "kanban") {

            const data = await AppConfig.aggregate([
                {
                    $match: { type: "leads_data" }
                },
                {
                    $unwind: "$leads_status_data"
                },
                {
                    $lookup: {
                        from: "leads",
                        let: {
                            statusId: "$leads_status_data._id",
                            userId: mongoose.Types.ObjectId.createFromHexString(userId)
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$lead_status_id", "$$statusId"] },
                                            { $eq: ["$created_by", "$$userId"] } // ✅ FILTER HERE
                                        ]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "follow_up",
                                    let: { leadId: "$_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: { $eq: ["$lead_id", "$$leadId"] }
                                            }
                                        },
                                        { $sort: { created_at: -1 } }
                                    ],
                                    as: "followUp"
                                }
                            },
                            {
                                $unwind: {
                                    path: "$followUp",
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $addFields: {
                                    followUp: {
                                        $cond: [
                                            { $ifNull: ["$followUp._id", false] },
                                            "$followUp",
                                            null
                                        ]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "app_config",
                                    let: {
                                        statusId: "$followUp.status",
                                        priorityId: "$followUp.priority",
                                        typeId: "$followUp.follow_up_type"
                                    },
                                    pipeline: [
                                        { $match: { type: "follow_up_data" } },
                                        {
                                            $addFields: {
                                                status: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$follow_up_status_data",
                                                                as: "item",
                                                                cond: {
                                                                    $eq: ["$$item._id", "$$statusId"]
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                priority: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$follow_up_priority_data",
                                                                as: "item",
                                                                cond: {
                                                                    $eq: ["$$item._id", "$$priorityId"]
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                follow_up_type: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$follow_up_type_data",
                                                                as: "item",
                                                                cond: {
                                                                    $eq: ["$$item._id", "$$typeId"]
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            $project: {
                                                _id: 0,
                                                status: 1,
                                                priority: 1,
                                                follow_up_type: 1
                                            }
                                        }
                                    ],
                                    as: "followUpConfig"
                                }
                            },
                            {
                                $addFields: {
                                    "followUp.status_data": {
                                        $arrayElemAt: ["$followUpConfig.status", 0]
                                    },
                                    "followUp.priority_data": {
                                        $arrayElemAt: ["$followUpConfig.priority", 0]
                                    },
                                    "followUp.type_data": {
                                        $arrayElemAt: ["$followUpConfig.follow_up_type", 0]
                                    }
                                }
                            },
                            {
                                $project: {
                                    followUpConfig: 0
                                }
                            },
                            {
                                $group: {
                                    _id: "$_id",
                                    doc: { $first: "$$ROOT" },
                                    followUps: {
                                        $push: {
                                            $cond: [
                                                { $ifNull: ["$followUp._id", false] },
                                                "$followUp",
                                                "$$REMOVE"
                                            ]
                                        }
                                    }
                                }
                            },
                            {
                                $addFields: {
                                    "doc.followUp": { $ifNull: ["$followUps", []] }
                                }
                            },
                            {
                                $replaceRoot: { newRoot: "$doc" }
                            }
                        ],
                        as: "leads"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        status: "$leads_status_data",
                        leads: 1
                    }
                }
            ]);

            finalData = data;

        } else {

            const leads = await Lead.aggregate([
                {
                    $match: {
                        created_by: mongoose.Types.ObjectId.createFromHexString(userId)
                    }
                },

                // 1. Get follow ups
                {
                    $lookup: {
                        from: "follow_up",
                        let: { leadId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$lead_id", "$$leadId"] }
                                }
                            },
                            {
                                $sort: { created_at: -1 } // descending order
                            }
                        ],
                        as: "followUp"
                    }
                },

                // 2. Unwind followUp
                {
                    $unwind: {
                        path: "$followUp",
                        preserveNullAndEmptyArrays: true
                    }
                },

                // 3. Normalize empty followUp → null
                {
                    $addFields: {
                        followUp: {
                            $cond: [
                                { $ifNull: ["$followUp._id", false] },
                                "$followUp",
                                null
                            ]
                        }
                    }
                },

                // 4. Lookup app_config for followUp mappings
                {
                    $lookup: {
                        from: "app_config",
                        let: {
                            statusId: "$followUp.status",
                            priorityId: "$followUp.priority",
                            typeId: "$followUp.follow_up_type"
                        },
                        pipeline: [
                            {
                                $match: {
                                    type: "follow_up_data"
                                }
                            },
                            {
                                $project: {
                                    follow_up_status_data: 1,
                                    follow_up_priority_data: 1,
                                    follow_up_type_data: 1
                                }
                            },
                            {
                                $addFields: {
                                    status: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$follow_up_status_data",
                                                    as: "item",
                                                    cond: {
                                                        $eq: ["$$item._id", "$$statusId"]
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    priority: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$follow_up_priority_data",
                                                    as: "item",
                                                    cond: {
                                                        $eq: ["$$item._id", "$$priorityId"]
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    follow_up_type: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$follow_up_type_data",
                                                    as: "item",
                                                    cond: {
                                                        $eq: ["$$item._id", "$$typeId"]
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    status: 1,
                                    priority: 1,
                                    follow_up_type: 1
                                }
                            }
                        ],
                        as: "followUpConfig"
                    }
                },

                // 5. Merge config into followUp
                {
                    $addFields: {
                        "followUp.status_data": {
                            $arrayElemAt: ["$followUpConfig.status", 0]
                        },
                        "followUp.priority_data": {
                            $arrayElemAt: ["$followUpConfig.priority", 0]
                        },
                        "followUp.type_data": {
                            $arrayElemAt: ["$followUpConfig.follow_up_type", 0]
                        }
                    }
                },

                // 6. Remove temp field
                {
                    $project: {
                        followUpConfig: 0
                    }
                },

                // 7. Regroup followUps safely (NO empty objects)
                {
                    $group: {
                        _id: "$_id",
                        doc: { $first: "$$ROOT" },
                        followUps: {
                            $push: {
                                $cond: [
                                    { $ifNull: ["$followUp._id", false] },
                                    "$followUp",
                                    "$$REMOVE"
                                ]
                            }
                        }
                    }
                },

                // 8. Ensure empty array if none
                {
                    $addFields: {
                        "doc.followUp": {
                            $ifNull: ["$followUps", []]
                        }
                    }
                },

                {
                    $replaceRoot: {
                        newRoot: "$doc"
                    }
                },

                // 9. Lead status lookup (your existing logic)
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
                                    status: "$leads_status_data"
                                }
                            }
                        ],
                        as: "lead_status"
                    }
                },

                {
                    $unwind: {
                        path: "$lead_status",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]);

            finalData = leads;

        }


        return successResponse(res, "Lead fetched successfully", finalData)

    } catch (error) {

        next(error)
    }
}

exports.getCreateLeadAPIController = async (req, res, next) => {
    try {

        const country = await Country.findOne({ _id: "6821e073c67f35e8ab742e21" })
        const states = country?.states || [];

        const appConfig = await AppConfig.findOne({ type: "leads_data" })
        const sourceData = appConfig?.leads_source_data || [];
        const statusData = appConfig?.leads_status_data || [];
        const solutionData = appConfig?.solution_data || [];

        const finalData = {
            states,
            statusData,
            sourceData,
            solutionData,
        }

        return successResponse(res, "Leads create data fetched successfully", finalData)

    } catch (error) {

        next(error)
    }
}

const convertVar = (val) => {

    return (val === "" ? undefined : val);
}

exports.postLeadController = async (req, res, next) => {
    try {

        const userId = req?.userId;

        const { company_name, solution_id, address, average_monthly_consumption, city_id, email, lead_status_id, name, phone, pincode, sanctioned_load, source_id, state_id } = req?.body

        console.log("Data", company_name, solution_id, address, average_monthly_consumption, city_id, email, lead_status_id, name, phone, pincode, sanctioned_load, source_id, state_id);

        const lead = new Lead({
            name,
            address,
            company_name,
            solution_id: convertVar(solution_id),
            pincode,
            email,
            phone,
            average_monthly_consumption,
            city_id,
            state_id,
            lead_status_id,
            source_id: convertVar(source_id),
            sanctioned_load,
            assigned_user_id: userId,
            created_by: userId,
            created_at: Date.now()
        })

        await lead.save();

        return successResponse(res, "Leads saved successfully")

    } catch (error) {

        next(error)
    }
}

exports.putLeadAPIController = async (req, res, next) => {
    try {

        const userId = req?.userId;
        const { id } = req?.params;

        const { company_name, solution_id, address, average_monthly_consumption, city_id, email, lead_status_id, name, phone, pincode, sanctioned_load, source_id, state_id } = req?.body

        const existingLead = await Lead.findById(id);

        if (!existingLead) {
            return errorResponse(res, "Leads does not exist", {}, 404)
        }

        await Lead.findByIdAndUpdate(id, {
            company_name,
            name,
            address,
            pincode,
            email,
            phone,
            average_monthly_consumption,
            city_id,
            state_id,
            lead_status_id,
            source_id: convertVar(source_id),
            solution_id: convertVar(solution_id),
            sanctioned_load,
            assigned_user_id: userId,
            updated_by: userId,
            updated_at: Date.now()
        })

        return successResponse(res, "Leads updated successfully")

    } catch (error) {
        next(error)
    }
}