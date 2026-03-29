const AppConfig = require("../../model/AppConfig");
const Notification = require("../../model/Notifications");
const {
    successResponse
} = require("../../util/response");

exports.getCreateProposalAPIController = async (req, res, next) => {
    try {

        const appConfig = await AppConfig.findOne({
            type: "proposal_data"
        })
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

        const notificationTemplate = await Notification.findOne({
            notification_type: "proposal_for_spark_grid"
        })

        const monthlyConsumption = Number(average_monthly_consumption) || 0;
        const baseUnitCost = Number(base_unit_cost) || 0;
        const bseeUnitSolarRate = Number(base_unit_solar_rate) || 0;
        const totalload_kw = Number(sanctioned_load) || 0;

        const annualConsumption = monthlyConsumption * 12;

        const gridRate = baseUnitCost + round((baseUnitCost * 22 / 100), 2)

        const solarCapacity1 = (totalload_kw * 1.4) / 1000;

        let solarCapacity2 = 0;

        if (monthlyConsumption > 0) {
            solarCapacity2 = monthlyConsumption / 120000;
        }

        let solarCapacityMw = 0;

        if (solarCapacity1 > 0 && solarCapacity2 > 0) {
            solarCapacityMw = min(solarCapacity1, solarCapacity2);
        } else {
            solarCapacityMw = max(solarCapacity1, solarCapacity2);
        }
        if ($solarCapacityMw <= 0) {
            solarCapacityMw = 1.0;
        }

        const firstYearGeneration = 1440000 * solarCapacityMw;
        const monthlySolarGeneration = firstYearGeneration / 12;

        const sparkGridFixed = (industrial_sector_id === '69c6580065ad315756decec7') ? 4.75 : 5.75;
        const omChargeInitial = 0.30;
        const sparkGridSolarCost = sparkGridFixed + omChargeInitial;

        const immediate_savings = gridRate - sparkGridSolarCost;

        const total_investment_crore = 3.5 * solarCapacityMw;
        const captive_investment_lakh = 30 * solarCapacityMw;
        const captive_investment_crore = captive_investment_lakh / 100;

        // --- 3. BUILD 25-YEAR SAVINGS TABLE ROWS ---
        const lossFactor = 0.08;
        const annual_degradation = 0.008;
        const discom_escalation = 0.03;
        const omIncrement = 0.05;

        const current_generation = firstYearGeneration;
        const current_discom = gridRate;
        const current_om = omChargeInitial;
        const cumulative_savings = 0;
        const table_rows = "";

        const display_years = [1, 5, 10, 15, 20, 25];
        const row_count = 0;

        const senderEmail = "prashant@dreamweaversindia.com";
        const subjectNotification = notificationTemplate?.subject || "";
        const messageNotification = notificationTemplate?.message || "";

        return successResponse(res, "Proposal sent successfully", data)

    } catch (error) {
        next(error)
    }
}