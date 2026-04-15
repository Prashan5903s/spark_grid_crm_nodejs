const AppConfig = require("../../model/AppConfig");
const Notification = require("../../model/Notifications");
const {
    successResponse,
    errorResponse
} = require("../../util/response");

const ReplaceTemplateField = require("../../util/ReplaceTemplateField");

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

// Helper: Indian currency format
function formatIndianCurrency(num) {
    let numStr = num.toString();
    let lastThree = numStr.slice(-3);
    let restUnits = numStr.slice(0, -3);

    if (restUnits !== "") {
        // Add leading zero if length is odd
        if (restUnits.length % 2 === 1) {
            restUnits = "0" + restUnits;
        }

        let expUnit = restUnits.match(/.{1,2}/g); // split into groups of 2
        let formattedRest = "";

        expUnit.forEach((val, index) => {
            if (index === 0) {
                formattedRest += parseInt(val, 10) + ",";
            } else {
                formattedRest += val + ",";
            }
        });

        return formattedRest + lastThree;
    } else {
        return lastThree;
    }
}

// Helper: kW → MW
async function finalConvertKwToMw(kw) {
    return (Number(kw || 0) / 1000).toFixed(2);
}

exports.postProposalAPIController = async (req, res, next) => {
    try {
        const userId = req?.userId;

        const {
            industrial_sector_id,
            email,
            base_unit_cost,
            base_unit_solar_rate,
            address,
            average_monthly_consumption,
            sanctioned_load,
            company_name
        } = req.body;

        // --- TEMPLATE ---
        const notificationPDFTemplate = await Notification.findOne({
            notification_type: "proposal_email_pdf_template"
        });

        const notificationEmailTemplate = await Notification.findOne({
            notification_type: "email_proposal_template"
        })

        if (!notificationPDFTemplate || !notificationEmailTemplate) {
            return errorResponse(res, "Notification Template not found", {}, 404);
        }

        const todayDate = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

        // --- SAFE INPUTS ---
        const totalLoadKw = parseFloat(sanctioned_load || 0);
        const monthlyConsumption = parseFloat(average_monthly_consumption || 0);
        const baseUnitCost = parseFloat(base_unit_cost || 0);
        const baseUnitSolarRate = parseFloat(base_unit_solar_rate || 0);

        const annualConsumption = monthlyConsumption * 12;

        // --- GRID RATE (MATCH PHP ROUND) ---
        const gridRate =
            baseUnitCost + parseFloat(((baseUnitCost * 22) / 100).toFixed(2));

        // --- SOLAR CAPACITY ---
        const solarCapacity1 = (totalLoadKw * 1.4) / 1000;
        const solarCapacity2 =
            monthlyConsumption > 0 ? monthlyConsumption / 120000 : 0;

        let solarCapacityMw =
            solarCapacity1 > 0 && solarCapacity2 > 0
                ? Math.min(solarCapacity1, solarCapacity2)
                : Math.max(solarCapacity1, solarCapacity2);

        if (solarCapacityMw <= 0) solarCapacityMw = 1.0;

        // --- GENERATION ---
        const firstYearGeneration = 1440000 * solarCapacityMw;
        const monthlySolarGeneration = firstYearGeneration / 12;

        // --- PRICING LOGIC (FIXED) ---
        let sparkGridFixed =
            industrial_sector_id === "69c6580065ad315756decec5" ? 5.0 : 5.75;

        // Special override case
        if (industrial_sector_id === "69c6580065ad315756decec7") {
            sparkGridFixed = baseUnitSolarRate;
        }

        const omChargeInitial = 0.30;
        const sparkGridSolarCost = sparkGridFixed + omChargeInitial;

        const immediateSavings = gridRate - sparkGridSolarCost;

        // --- INVESTMENT ---
        const totalInvestmentCrore = 3.5 * solarCapacityMw;
        const captiveInvestmentCrore = (30 * solarCapacityMw) / 100;

        // --- 25 YEAR PROJECTION ---
        const lossFactor = 0.08;
        const annualDegradation = 0.008;
        const discomEscalation = 0.03;
        const omIncrement = 0.05;

        let currentGeneration = firstYearGeneration;
        let currentDiscom = gridRate;
        let currentOm = omChargeInitial;
        let cumulativeSavings = 0;

        let tableRows = "";

        const displayYears = [1, 5, 10, 15, 20, 25];
        let rowCount = 0;

        for (let year = 1; year <= 25; year++) {
            const netReceived = currentGeneration * (1 - lossFactor);
            const discomCost = netReceived * currentDiscom;
            const sparkTotalRate = sparkGridFixed + currentOm;
            const solarCost = currentGeneration * sparkTotalRate;

            const netSavings = discomCost - solarCost;
            const monthlySavings = netSavings / 12;

            cumulativeSavings += netSavings;

            if (displayYears.includes(year)) {
                const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#fcfcfc";

                tableRows += `
                <tr style="background-color:${bgColor}">
                    <td><strong>${year}</strong></td>
                    <td>${formatIndianCurrency(currentGeneration)}</td>
                    <td>${formatIndianCurrency(netReceived)}</td>
                    <td>₹ ${formatIndianCurrency(discomCost)}</td>
                    <td>₹ ${formatIndianCurrency(solarCost)}</td>
                    <td><strong>₹ ${formatIndianCurrency(netSavings)}</strong></td>
                    <td><strong>₹ ${formatIndianCurrency(monthlySavings)}</strong></td>
                </tr>`;

                rowCount++;
            }

            currentGeneration *= (1 - annualDegradation);
            currentDiscom *= (1 + discomEscalation);
            currentOm *= (1 + omIncrement);
        }

        // --- FINAL VALUES ---
        const savingsInCrores = cumulativeSavings / 10000000;

        const finalData = {
            logoUrl: "https://sparkgrid.co.in/assets/images/logo3d2.png",
            coverImageUrl: "https://sparkgrid.co.in/assets/images/Solution-1-720x480.jpg",

            finalTotalLoad: await finalConvertKwToMw(totalLoadKw),
            finalSolarCapacity: solarCapacityMw.toFixed(2),

            finalAnnualConsumption: formatIndianCurrency(annualConsumption),
            finalMonthlyConsumption: formatIndianCurrency(monthlyConsumption),
            finalMonthlySolarGeneration: formatIndianCurrency(monthlySolarGeneration),

            finalGridRate: gridRate.toFixed(2),
            finalSparkGridSolarCost: sparkGridSolarCost.toFixed(2),
            finalImmediateSaving: immediateSavings.toFixed(2),

            finalTotalInvestmentCrore: totalInvestmentCrore.toFixed(2),
            finalCaptiveInvestmentCrore: captiveInvestmentCrore.toFixed(2),

            finalFomativeSaving: savingsInCrores.toFixed(2),
            finalCumulativeSavings: cumulativeSavings.toFixed(2),

            finalTodayDate: todayDate,
            finalProposalFor: company_name || "",
            finalAddress: address || "",

            table_rows: tableRows,

            sparkGridFixed: sparkGridFixed.toFixed(2),
            omChargeInitial: omChargeInitial.toFixed(2),

            senderEmail: email,
            subjectNotification: notificationPDFTemplate.subject || "",
            messageNotification: notificationPDFTemplate.message || "",
        };

        // --- SEND EMAIL ---
        await ReplaceTemplateField({
            finalData,
            userId,
            emailSubject: notificationEmailTemplate?.subject || "",
            emailMessage: notificationEmailTemplate?.message || "",
            pdfSubject: notificationPDFTemplate.subject,
            pdfMessage: notificationPDFTemplate.message,
            templateId: notificationEmailTemplate._id,
            to: finalData.senderEmail,
            templateName: notificationEmailTemplate.template_name
        });

        const finalResult = {
            finalData,
            subject: notificationPDFTemplate.subject,
            message: notificationPDFTemplate.message
        }

        return successResponse(res, "Proposal sent successfully", finalResult);

    } catch (error) {
        next(error);
    }
};
