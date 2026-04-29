const mongoose = require("mongoose");

const AppConfig = require("../model/AppConfig");
const FollowUp = require("../model/FollowUp");
const CronSendMail = require("./cronSendMail");
const Notification = require("../model/Notifications");
const EmailTemplateLog = require("../model/EmailTemplateLog");

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

// --------------------------------------------
// Convert string ids to ObjectIds
// --------------------------------------------
const convertToObjectIds = (ids = []) => {
    return ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) =>
            mongoose.Types.ObjectId.createFromHexString(id)
        );
};

// --------------------------------------------
// Normalize schedule days
// --------------------------------------------
const normalizeScheduleDays = (scheduleDays) => {
    if (!scheduleDays) return [];

    if (Array.isArray(scheduleDays)) {
        return scheduleDays
            .map((day) => parseInt(day, 10))
            .filter((day) => !isNaN(day));
    }

    if (typeof scheduleDays === "string") {
        return scheduleDays
            .split(",")
            .map((day) => parseInt(day.trim(), 10))
            .filter((day) => !isNaN(day));
    }

    if (
        typeof scheduleDays === "number" ||
        !isNaN(scheduleDays)
    ) {
        return [parseInt(scheduleDays, 10)];
    }

    return [];
};

// --------------------------------------------
// Check if notification should be sent
// --------------------------------------------
const isScheduledOrMissed = (
    followUpTime,
    scheduleDays = []
) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const normalizedDays =
        normalizeScheduleDays(scheduleDays);

    if (!normalizedDays.length) {
        return false;
    }

    return normalizedDays.some((day) => {
        const scheduledDate = new Date(
            followUpTime
        );

        scheduledDate.setDate(
            scheduledDate.getDate() + day
        );

        scheduledDate.setHours(
            23,
            59,
            59,
            999
        );

        return (
            scheduledDate.getTime() <=
            today.getTime()
        );
    });
};

// --------------------------------------------
// Format name
// --------------------------------------------
const formatLeadName = (leadName = "") => {
    return leadName
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map(
            (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");
};

// --------------------------------------------
// Send mail
// --------------------------------------------
const sendMail = async ({
    email,
    name,
    senderId,
    notificationId,
    followUpId,
    leadId,
    subject,
    message
}) => {
    try {
        const existingLog =
            await EmailTemplateLog.findOne({
                lead_id: leadId,
                sender_id: senderId,
                notification_id: notificationId,
                follow_up_id: followUpId,
                recipient_email: email
            });

        if (existingLog) {
            console.log(
                `Mail already sent to ${email}`
            );
            return false;
        }

        await CronSendMail({
            toEmail: "ajaykumar@dreamweaversindia.com",
            toName: name,
            subject,
            htmlContent: message,
            cc: [],
            bcc: ["prashant@dreamweaversindia.com"]
        });

        await EmailTemplateLog.create({
            lead_id: leadId,
            notification_id: notificationId,
            follow_up_id: followUpId,
            sender_id: senderId,
            recipient_email: "ajaykumar@dreamweaversindia.com",
            subject,
            message,
            sender_date: new Date()
        });

        console.log(
            `Mail sent successfully to ${email}`
        );

        return true;
    } catch (error) {
        console.error(
            "Mail sending error:",
            error
        );
        return false;
    }
};

// --------------------------------------------
// Get notifications
// --------------------------------------------
async function getNotifications(
    notificationIds
) {
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
        },
        {
            $sort: {
                schedule_days: 1
            }
        },
        {
            $limit: 1
        }
    ]);
}

// --------------------------------------------
// Get followups by status
// --------------------------------------------
async function getFollowUpsByStatus(
    statusId
) {
    return FollowUp.find({
            "lead_data.lead_status_id": statusId
        })
        .populate("created_by")
        .sort({
            created_at: -1
        }) // oldest first
        .limit(1);
}

// --------------------------------------------
// Process followups
// --------------------------------------------
async function processFollowUps(
    followUps,
    notifications
) {
    if (
        !followUps.length ||
        !notifications.length
    ) {
        console.log(
            "Followups or notifications missing"
        );
        return;
    }

    const templateData =
        await AppConfig.findOne({
            type: "default_html_layout"
        });

    for (const followUp of followUps) {
        const followUpTime =
            followUp.created_at;
        const followUpId =
            followUp._id;

        const leadId =
            followUp.lead_id;
        const leadEmail =
            followUp?.lead_data?.email;
        const leadName =
            followUp?.lead_data?.name;

        const senderId =
            followUp?.created_by?._id;

        const senderName = `${followUp?.created_by?.first_name || ""
            } ${followUp?.created_by?.last_name || ""
            }`;

        if (!leadEmail) {
            console.log(
                `No email found for lead ${leadId}`
            );
            continue;
        }

        let emailSent = false;

        for (const notification of notifications) {
            const notificationId =
                notification.notification_id;

            const scheduleDays =
                notification.schedule_days;

            const shouldSend =
                isScheduledOrMissed(
                    followUpTime,
                    scheduleDays
                );

            if (!shouldSend) {
                continue;
            }

            let notifMessage =
                notification.message || "";

            notifMessage = notifMessage
                .replace(
                    /{{client_name}}/g,
                    formatLeadName(
                        leadName
                    )
                )
                .replace(
                    /{{sender_name}}/g,
                    formatLeadName(
                        senderName
                    )
                );

            const finalTemplateLayout =
                templateData?.default_html_layout
                ?.replace(
                    /{{{mainMessage}}}/g,
                    notifMessage
                )
                ?.replace(
                    /{{currentYear}}/g,
                    new Date().getFullYear()
                );

            const sent = await sendMail({
                notificationId,
                senderId,
                followUpId,
                leadId,
                email: leadEmail,
                name: formatLeadName(
                    leadName
                ),
                subject: notification.subject,
                message: finalTemplateLayout
            });
        }
    }
}

// --------------------------------------------
// Main cron
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

        console.log(
            "Cron completed successfully"
        );
    } catch (error) {
        console.error(
            "Cron template error:",
            error
        );
    }
}

module.exports = cronTemplateReplace;