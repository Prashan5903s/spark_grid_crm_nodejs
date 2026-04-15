const mongoose = require("mongoose")
const ExportCenter = require("../../model/ExportCenter");
const { successResponse } = require("../../util/response");

exports.getExportCenterController = async (req, res, next) => {
    try {

        const userId = req?.userId;

        const exportCenter = await ExportCenter.aggregate([
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
            },
            {
                $match: {
                    $expr: {
                        $in: [mongoose.Types.ObjectId.createFromHexString(userId), "$allowedUser"]
                    }
                }
            }
        ]);

        return successResponse(res, "Export User fetched successfully", exportCenter)


    } catch (error) {
        next(error)
    }
}