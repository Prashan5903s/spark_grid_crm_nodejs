const AppConfig = require("../../model/AppConfig");
const { successResponse } = require("../../util/response");

exports.getCreateProposalAPIController = async (req, res, next) => {
    try {

        const appConfig = await AppConfig.findOne({ type: "proposal_data" })
        const industrialSectorData = appConfig?.industrial_sector_data || [];

        const finalData = {
            industrialSectorData
        }

        return successResponse(res, "Proposal create data fetched successfully", finalData)

    } catch (error) {
        next(error)
    }
}

exports.postProposalAPIController = async (req, res, next) => {
    try {

        const userId = req?.userId;

        const {
            _id,
            industrial_sector_id,
            base_unit_cost,
            base_unit_solar_rate,
            name,
            email,
            phone,
            address,
            pincode,
            average_monthly_consumption,
            sanctioned_load,
            company_name
        } = req?.body;

        return successResponse(res, "Proposal sent successfully", data)

    } catch (error) {
        next(error)
    }
}