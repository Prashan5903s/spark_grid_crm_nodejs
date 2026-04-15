const Handlebars = require("handlebars");
const NotificationLog = require("../model/NotificationLog");
const sendMail = require("./sendMail");

const html_to_pdf = require("html-pdf-node");

const sendMailFunction = async ({
    to,
    subject,
    html,
    pdfHtml,
    isAttachment = false,
    templateName,
    templateId,
    userId
}) => {

    let attachments = [];

    if (isAttachment && pdfHtml) {
        const file = { content: pdfHtml };
        const options = { format: "A4" };

        const pdfBuffer = await html_to_pdf.generatePdf(file, options);

        attachments.push({
            filename: "Proposal.pdf",
            content: pdfBuffer,
            contentType: "application/pdf"
        });
    }

    await sendMail({ to, subject, html, attachments });

    const notificationLog = new NotificationLog({
        user_id: userId,
        email_sent: to,
        template_id: templateId,
        template_name: templateName,
        schedule_date: new Date(),
        created_at: new Date()
    });
        
    await notificationLog.save();
};

// Main function
module.exports = async ({
    userId,
    to,
    emailMessage,
    emailSubject,
    pdfMessage,
    pdfSubject,
    finalData,
    templateId,
    templateName
}) => {
    try {

        // IMPORTANT: No {{ }} here
        const replacements = {
            proposal_for: finalData?.finalProposalFor || "",
            address: finalData?.finalAddress || "",
            totalload: finalData?.finalTotalLoad || "",
            solarCapacity: finalData?.finalSolarCapacity || "",
            totalload_kw: finalData?.finalTotalLoad || "",
            annual_consumption: finalData?.finalAnnualConsumption || "",
            monthly_consumption: finalData?.finalMonthlyConsumption || "",
            solarCapacityMw: finalData?.finalSolarCapacity || "",
            monthly_solar_generation: finalData?.finalMonthlySolarGeneration || "",
            gridRate: finalData?.finalGridRate || "",
            sparkGridSolarCost: finalData?.finalSparkGridSolarCost || "",
            immediate_savings: finalData?.finalImmediateSaving || "",
            total_investment_crore: finalData?.finalTotalInvestmentCrore || "",
            captive_investment_crore: finalData?.finalCaptiveInvestmentCrore || "",
            table_rows: finalData?.table_rows || "",
            cumulative_savings: finalData?.finalCumulativeSavings || "",
            formatted_savings_crores: finalData?.finalFomativeSaving || "",
            sparkGridFixed: finalData?.sparkGridFixed || "",
            omChargeInitial: finalData?.omChargeInitial || "",
            today_date: finalData?.finalTodayDate || "",
            logoUrl: finalData?.logoUrl || "",
            coverImageUrl: finalData?.coverImageUrl || "",
        };

        // Compile subject & message ONCE
        const compiledEmailSubject = Handlebars.compile(emailSubject || "Notification");
        const compiledEmailMessage = Handlebars.compile(emailMessage || "");

        const compiledPDFMessage = Handlebars.compile(pdfMessage);

        const finalEmailSubject = compiledEmailSubject(replacements);
        const emailHtml = compiledEmailMessage(replacements);

        const pdfHtml = compiledPDFMessage(replacements);

        await sendMailFunction({
            to,
            subject: finalEmailSubject,
            html: emailHtml,
            pdfHtml,
            templateId,
            templateName,
            isAttachment: true,
            userId
        });

    } catch (err) {
        console.error("Notification Mail Error:", err);
        throw err;
    }
};
