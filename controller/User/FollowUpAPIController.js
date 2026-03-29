const Lead = require("../../model/Leads")
const AppConfig = require("../../model/AppConfig")
const FollowUp = require("../../model/FollowUp");
const { successResponse, errorResponse } = require("../../util/response");

exports.getFollowUpController = async (req, res, next) => {
    try {

        const userId = req?.userId;
        const { leadId } = req?.params;

        const followUp = await FollowUp.find({
            created_by: userId,
            lead_id: leadId
        })

        return successResponse(res, "Follow up fetched successfully", followUp)

    } catch (error) {
        next(error)
    }
}

exports.getCreateFollowUpController = async (req, res, next) => {
    try {

        const appConfig = await AppConfig.findOne({
            type: "follow_up_data"
        })

        const leadAppConfig = await AppConfig.findOne({
            type: "leads_data"
        })

        const followUpType = appConfig?.follow_up_type_data || [];
        const followUpStatus = appConfig.follow_up_status_data || [];
        const followUpPriority = appConfig.follow_up_priority_data || [];
        const leadStatusData = leadAppConfig?.leads_status_data || [];

        const finalData = {
            followUpPriority,
            followUpStatus,
            followUpType,
            leadStatusData
        }

        return successResponse(res, "Follow up create data fetched successfully", finalData)

    } catch (error) {

        next(error)
    }
}

exports.postFollowUpController = async (req, res, next) => {
    try {

        const userId = req?.userId;
        const { leadId } = req?.params;

        const { lead_status_id, follow_up_date, follow_up_type, next_follow_up_date, notes, priority, reminder_before, status } = req?.body;

        const lead = await Lead.findById(leadId)

        if (!lead) {

            return errorResponse(res, "Lead does not exist", {}, 404)
        }

        const follow_up = new FollowUp({
            lead_data: {
                lead_status_id,
                company_name: lead?.company_name,
                name: lead?.name,
                email: lead?.email,
                phone: lead?.phone,
                state_id: lead?.state_id,
                city_id: lead?.city_id,
                address: lead?.address,
                pincode: lead?.pincode,
            },
            lead_id: leadId,
            follow_up_date,
            follow_up_type,
            next_follow_up_date,
            notes,
            priority,
            reminder_before,
            status,
            assigned_to: userId,
            created_by: userId
        })

        await follow_up.save();

        await Lead.findByIdAndUpdate(leadId, {
            lead_status_id
        })

        return successResponse(res, "Follow Up created successfully")

    } catch (error) {
        next(error)
    }
}