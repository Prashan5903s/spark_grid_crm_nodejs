const mongoose = require("mongoose")
const Zone = require("../../model/Zone");
const User = require("../../model/User");
const Group = require("../../model/Group");
const Department = require("../../model/Department");
const Designation = require("../../model/Designation");
const UserType = require("../../model/UserType")
const ScheduleUser = require("../../model/ScheduleUser")
const ScheduleType = require("../../model/ScheduleType")
const ExportCenter = require("../../model/ExportCenter");
const { successResponse } = require("../../util/response");

exports.getExportCenterController = async (req, res, next) => {
    try {

        const userId = req.userId;

        const exportData = await ExportCenter.aggregate([
            {
                $match: {
                    created_by: mongoose.Types.ObjectId.createFromHexString(userId)
                }
            },
            {
                $lookup: {
                    from: "schedule_type",
                    let: { scheduleId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$export_center_id", "$$scheduleId"]
                                }
                            }
                        }
                    ],
                    as: "scheduleType"
                }
            },
            {
                $lookup: {
                    from: "schedule_users",
                    let: { scheduleId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$export_center_id", "$$scheduleId"]
                                }
                            }
                        }
                    ],
                    as: "scheduleUser"
                }
            },
            {
                $addFields: {
                    targetPairs: {
                        $map: {
                            input: {
                                $setUnion: [
                                    {
                                        $map: {
                                            input: "$scheduleType",
                                            as: "st",
                                            in: "$$st.type"
                                        }
                                    }
                                ]
                            },
                            as: "type",
                            in: {
                                target: "$$type",
                                options: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$scheduleType",
                                                as: "st",
                                                cond: { $eq: ["$$st.type", "$$type"] }
                                            }
                                        },
                                        as: "filtered",
                                        in: { $toString: "$$filtered.type_id" }
                                    }
                                }
                            }
                        }
                    },
                    allowedUser: {
                        $let: {
                            vars: {
                                type5Data: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$scheduleType",
                                                as: "st",
                                                cond: { $eq: ["$$st.type", "5"] }
                                            }
                                        },
                                        as: "t1",
                                        in: "$$t1.type_id"
                                    }
                                },
                                typeOtherData: {
                                    $map: {
                                        input: "$scheduleUser",
                                        as: "t2",
                                        in: "$$t2.user_id"
                                    }
                                }
                            },
                            in: {
                                $setUnion: ["$$type5Data", "$$typeOtherData"]
                            }
                        }
                    }
                }
            }
        ]);

        return successResponse(res, "Export center data fetched successfully", exportData);

    } catch (error) {
        next(error)
    }
}

exports.getCreateDataController = async (req, res, next) => {
    try {

        const userId = req.userId;

        const finalData = {};

        const objectId = mongoose.Types.ObjectId.createFromHexString(userId);

        const regions = await Zone.aggregate([
            {
                $match: { created_by: objectId } // filter zones created by this user
            },
            {
                $unwind: "$region" // split region array into individual docs
            },
            {
                $replaceRoot: { newRoot: "$region" } // keep only region data
            }
        ]);

        finalData['department'] = await Department.find({ created_by: userId, status: true })
        finalData['designation'] = await Designation.find({ company_id: userId, status: true })
        finalData['group'] = await Group.find({ company_id: userId, status: true })
        finalData['user'] = await User.find({ created_by: userId, status: true }).populate('company_id')
        finalData['zone'] = await Zone.find({ created_by: userId })
        finalData['region'] = regions
        finalData['branch'] = await Zone.aggregate([
            {
                $match: { created_by: objectId }
            },
            {
                $unwind: "$region"
            },
            {
                $unwind: "$region.branch"
            },
            {
                $replaceRoot: { newRoot: "$region.branch" }
            }
        ]);
        finalData['docData'] = await UserType.aggregate([
            {
                $match: { created_by: mongoose.Types.ObjectId.createFromHexString(userId) }
            },
            {
                $lookup: {
                    from: "document_type",
                    localField: "_id",
                    foreignField: "user_type_id",
                    as: "document_type"
                }
            },
            {
                $addFields: {
                    document_types: {
                        $filter: {
                            input: "$document_type",
                            as: "doc",
                            cond: {
                                $eq: ["$$doc.created_by", mongoose.Types.ObjectId.createFromHexString(userId)]
                            }
                        }
                    }
                }
            }
        ]);

        return successResponse(res, "Report added to download center", finalData);
    } catch (error) {
        next(error);
    }
};

exports.postExportDataController = async (req, res, next) => {
    try {
        const userId = req?.userId;
        const imageUrl = req.file ? req.file.filename : '';

        let { targets, title, description, document_type_id, user_type_id } = req.body;

        //  IMPORTANT FIX
        if (targets) {
            try {
                targets = JSON.parse(targets);
            } catch (err) {
                return errorResponse(res, "Invalid targets format");
            }
        }

        const exportCenter = new ExportCenter({
            title,
            document_type_id,
            user_type_id,
            description,
            file_path: imageUrl,
            created_by: userId,
            created_at: Date.now()
        });

        await exportCenter.save();

        const scheduleTypes = [];

        //  SAFE LOOP
        if (Array.isArray(targets)) {
            for (const pair of targets) {
                if (!pair.target || !Array.isArray(pair.options)) continue;

                for (const optionId of pair.options) {
                    scheduleTypes.push({
                        created_by: userId,
                        export_center_id: exportCenter._id,
                        type: Number(pair.target),
                        type_id: mongoose.Types.ObjectId.isValid(optionId)
                            ? new mongoose.Types.ObjectId(optionId)
                            : optionId
                    });
                }
            }
        }

        if (scheduleTypes.length === 0) {
            return successResponse(res, "Settings saved successfully");
        }

        await ScheduleType.insertMany(scheduleTypes);

        const bulkUsers = [];
        const finalUserSet = new Set(); //  YOU MISSED THIS

        for (const item of scheduleTypes) {
            const { type, type_id } = item;

            let targetUsers = [];

            switch (type) {
                case 1:
                    targetUsers = await User.find({ designation_id: type_id }).select("_id");
                    break;
                case 2:
                    targetUsers = await User.find({ department_id: type_id }).select("_id");
                    break;
                case 3:
                    targetUsers = await User.find({ group_id: type_id }).select("_id");
                    break;
                case 4:
                    targetUsers = await User.find({ region_id: type_id }).select("_id");
                    break;
                case 6:
                    targetUsers = await User.find({ zone_id: type_id }).select("_id");
                    break;
                case 7:
                    targetUsers = await User.find({ branch_id: type_id }).select("_id");
                    break;
                case 5:
                    finalUserSet.add(type_id.toString());
                    bulkUsers.push({
                        export_center_id: exportCenter._id,
                        created_by: userId,
                        type,
                        type_id,
                        user_id: type_id
                    });
                    continue;
            }

            for (const u of targetUsers) {
                const userIdStr = u._id.toString();

                if (!finalUserSet.has(userIdStr)) {
                    finalUserSet.add(userIdStr);

                    bulkUsers.push({
                        export_center_id: exportCenter._id,
                        created_by: userId,
                        type,
                        type_id,
                        user_id: u._id
                    });
                }
            }
        }

        if (bulkUsers.length) {
            await ScheduleUser.insertMany(bulkUsers);
        }

        return successResponse(res, "Export center created successfully");

    } catch (error) {
        next(error);
    }
};

exports.putExportCenterController = async (req, res, next) => {
    try {
        const userId = req?.userId;
        const { id } = req?.params;

        let { targets, title, description, document_type_id, user_type_id } = req.body;

        //  Parse targets safely
        if (targets) {
            try {
                targets = JSON.parse(targets);
            } catch (err) {
                return errorResponse(res, "Invalid targets format");
            }
        }

        //  Check existing record
        const existExport = await ExportCenter.findOne({
            _id: id,
            created_by: userId
        });

        if (!existExport) {
            return errorResponse(res, "Export center not found");
        }

        //  File handling
        const filePath = req.file ? req.file.filename : existExport.file_path;

        //  Update and get updated doc
        const exportCenter = await ExportCenter.findOneAndUpdate(
            { _id: id, created_by: userId },
            {
                title,
                document_type_id,
                user_type_id,
                description,
                file_path: filePath,
                updated_at: Date.now()
            },
            { new: true }
        );

        //  Delete old mappings AFTER validation
        await Promise.all([
            ScheduleUser.deleteMany({
                export_center_id: id,
                created_by: userId
            }),
            ScheduleType.deleteMany({
                export_center_id: id,
                created_by: userId
            })
        ]);

        const scheduleTypes = [];

        //  Build schedule types
        if (Array.isArray(targets)) {
            for (const pair of targets) {
                if (!pair.target || !Array.isArray(pair.options)) continue;

                for (const optionId of pair.options) {
                    scheduleTypes.push({
                        created_by: userId,
                        export_center_id: exportCenter._id,
                        type: Number(pair.target),
                        type_id: mongoose.Types.ObjectId.isValid(optionId)
                            ? new mongoose.Types.ObjectId(optionId)
                            : optionId
                    });
                }
            }
        }

        if (scheduleTypes.length > 0) {
            await ScheduleType.insertMany(scheduleTypes);
        }

        //  Build users
        const bulkUsers = [];
        const finalUserSet = new Set();

        for (const item of scheduleTypes) {
            const { type, type_id } = item;
            let targetUsers = [];

            switch (type) {
                case 1:
                    targetUsers = await User.find({ designation_id: type_id }).select("_id");
                    break;
                case 2:
                    targetUsers = await User.find({ department_id: type_id }).select("_id");
                    break;
                case 3:
                    targetUsers = await User.find({ group_id: type_id }).select("_id");
                    break;
                case 4:
                    targetUsers = await User.find({ region_id: type_id }).select("_id");
                    break;
                case 6:
                    targetUsers = await User.find({ zone_id: type_id }).select("_id");
                    break;
                case 7:
                    targetUsers = await User.find({ branch_id: type_id }).select("_id");
                    break;
                case 5:
                    const uid = type_id.toString();

                    if (!finalUserSet.has(uid)) {
                        finalUserSet.add(uid);
                        bulkUsers.push({
                            export_center_id: exportCenter._id,
                            created_by: userId,
                            type,
                            type_id,
                            user_id: type_id
                        });
                    }
                    continue;
            }

            for (const u of targetUsers) {
                const uid = u._id.toString();

                if (!finalUserSet.has(uid)) {
                    finalUserSet.add(uid);

                    bulkUsers.push({
                        export_center_id: exportCenter._id,
                        created_by: userId,
                        type,
                        type_id,
                        user_id: u._id
                    });
                }
            }
        }

        if (bulkUsers.length > 0) {
            await ScheduleUser.insertMany(bulkUsers);
        }

        return successResponse(res, "Export center updated successfully");

    } catch (error) {
        next(error);
    }
};