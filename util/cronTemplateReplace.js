const mongoose = require("mongoose");

const FollowUp = require("../model/FollowUp");
const CronSendMail = require('./cronSendMail')
const Notification = require("../model/Notifications");
const EmailTemplateLog = require("../model/EmailTemplateLog")

// --------------------------------------------
// Notification IDs
// --------------------------------------------
const LeadGenerationId = [
    "69e893b70a6495d10414f923",
    "69e8977b282b1b6c8f5671b5",
    "69e89e8360f4e0f3d5385b0e",
    "69e89efc60f4e0f3d5385b6c",
    "69e89f5d60f4e0f3d5385bc7"
];

const callNotPickedId = [
    "69e89fcf60f4e0f3d5385c23",
    "69e8a05060f4e0f3d5385c81",
    "69e8a0b060f4e0f3d5385cdc"
];

const customerContactedId = [
    "69e8a14360f4e0f3d5385d38",
    "69e8a1bb60f4e0f3d5385d93",
    "69e8a21c60f4e0f3d5385def"
];

const convertToObjectIds = (ids = []) => {
    return ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) =>
            mongoose.Types.ObjectId.createFromHexString(id)
        );
};

const normalizeScheduleDays = (scheduleDays) => {

    if (!scheduleDays) {
        return [];
    }

    // If already array -> convert strings to numbers
    if (Array.isArray(scheduleDays)) {
        return scheduleDays
            .map((day) => parseInt(day, 10))
            .filter((day) => !isNaN(day));
    }

    // If string like "1,2,3"
    if (typeof scheduleDays === "string") {

        return scheduleDays
            .split(",")
            .map((day) => parseInt(day.trim(), 10))
            .filter((day) => !isNaN(day));
    }

    // Single value
    if (
        typeof scheduleDays === "number" ||
        !isNaN(scheduleDays)
    ) {
        return [parseInt(scheduleDays, 10)];
    }

    return [];
};

const isScheduledForToday = (
    followUpTime,
    scheduleDays = []
) => {
    const today = new Date();

    // Remove time portion from today
    today.setHours(0, 0, 0, 0);

    const normalizedDays =
        normalizeScheduleDays(scheduleDays);

    if (!normalizedDays.length) {
        return false;
    }

    return normalizedDays.some((day) => {
        const scheduledDate = new Date(followUpTime);

        // Add schedule day offset
        scheduledDate.setDate(
            scheduledDate.getDate() + day
        );

        // Remove time portion
        scheduledDate.setHours(
            0,
            0,
            0,
            0
        );

        return (
            scheduledDate.getTime() ===
            today.getTime()
        );
    });
};

const sendMail = async ({
    email,
    name,
    senderId,
    notificationId,
    notification,
    followUpId,
    leadId,
    subject,
    message
}) => {
    try {

        // Start of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // End of today
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Check if mail already sent today
        const existingLog = await EmailTemplateLog.findOne({
            lead_id: leadId,
            sender_id: senderId,
            notification_id: notificationId,
            follow_up_id: followUpId,
            recipient_email: email,
            sender_date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (existingLog) {

            return;
        }

        await CronSendMail({
            toEmail: email,
            toName: name,
            subject,
            htmlContent: message
        })

        // Save email log after successful send
        await EmailTemplateLog.create({
            lead_id: leadId,
            notification_id: notificationId,
            follow_up_id: followUpId,
            sender_id: senderId,
            recipient_email: email,
            subject,
            message,
            sender_date: new Date()
        });

    } catch (error) {
        console.error("Mail error:", error);
    }
};

async function getNotifications(notificationIds) {
    const objectIds =
        convertToObjectIds(notificationIds);

    return Notification.aggregate([{
            $match: {
                _id: {
                    $in: objectIds
                }
            }
        },
        {
            $lookup: {
                from: "notification_log",
                let: {
                    notificationId: "$_id"
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: [
                                "$notification_id",
                                "$$notificationId"
                            ]
                        }
                    }
                }],
                as: "logData"
            }
        },
        {
            $addFields: {
                logData: {
                    $arrayElemAt: [
                        "$logData",
                        0
                    ]
                }
            }
        },
        {
            $project: {
                template_name: {
                    $ifNull: [
                        "$logData.template_name",
                        "$template_name"
                    ]
                },
                subject: {
                    $ifNull: [
                        "$logData.subject",
                        "$subject"
                    ]
                },
                message: {
                    $ifNull: [
                        "$logData.message",
                        "$message"
                    ]
                },
                schedule_days: {
                    $ifNull: [
                        "$logData.schedule_days",
                        "$schedule_days"
                    ]
                },
                default_select: {
                    $ifNull: [
                        "$logData.default_select",
                        "$default_select"
                    ]
                },
                notification_id: "$_id"
            }
        },
        {
            $match: {
                default_select: true
            }
        }
    ]);
}

async function getFollowUpsByStatus(statusId) {
    return FollowUp.find({
        "lead_data.lead_status_id": statusId
    }).populate("created_by");
}

async function processFollowUps(
    followUps,
    notifications
) {
    if (
        !followUps.length ||
        !notifications.length
    ) {

        console.log("Follow up and notification length 0")
        return;
    }

    for (const followUp of followUps) {

        const followUpTime = followUp.created_at;
        const followUpId = followUp._id;

        const leadId = followUp.lead_id;
        const leadEmail = followUp?.lead_data?.email;
        const leadName = followUp?.lead_data?.name;

        const senderId = followUp?.created_by?._id;

        const senderName = `${followUp?.created_by?.first_name} ${followUp?.created_by?.last_name}`

        if (!leadEmail) {

            console.log("Email not found")
            continue;
        }

        for (const notification of notifications) {

            const notificationId = notification?._id;

            const scheduleDays = notification.schedule_days;

            let notifMessage = notification?.message || "";

            notifMessage = notifMessage
                .replace(/{{client_name}}/g, leadName)
                .replace(/{{sender_name}}/g, senderName);

            const notifSubject = notification?.subject;

            if (
                isScheduledForToday(
                    followUpTime,
                    scheduleDays
                )
            ) {


                

                await sendMail({
                    notificationId,
                    senderId,
                    name: leadName,
                    email: "prashantchaubey1806@gmail.com",
                    subject: notifSubject,
                    message: notifMessage,
                    notification,
                    followUpId,
                    leadId
                });
            }
        }
    }
}

// --------------------------------------------
// Main cron function
// --------------------------------------------
async function cronTemplateReplace() {
    try {

        const [
            notificationLeadGen,
            notificationCallNotPick,
            notificationContacted,
            followUpLeadGeneration,
            followUpContactAttempted,
            followUpContacted
        ] = await Promise.all([

            getNotifications(
                LeadGenerationId
            ),
            getNotifications(
                callNotPickedId
            ),
            getNotifications(
                customerContactedId
            ),

            getFollowUpsByStatus(
                "69d5dfb78c890e742280d9c4"
            ),
            getFollowUpsByStatus(
                "69d5dfb78c890e742280d9c5"
            ),
            getFollowUpsByStatus(
                "69d5dfb78c890e742280d9c6"
            )
        ]);

        await processFollowUps(
            followUpLeadGeneration,
            notificationLeadGen
        );

        await processFollowUps(
            followUpContactAttempted,
            notificationCallNotPick
        );

        await processFollowUps(
            followUpContacted,
            notificationContacted
        );

    } catch (error) {
        console.error(
            "Cron template error:",
            error
        );
    }
}

module.exports = cronTemplateReplace;