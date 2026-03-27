const ExportCenter = require("../../model/ExportCenter");
const { reportQueue } = require("../../queues/reportQueue");
const { successResponse } = require("../../util/response");

exports.getExportCenterController = async (req, res, next) => {
    try {

        const userId = req.userId;

        const exportData = await ExportCenter.find({ user_id: userId })

        return successResponse(res, "Export center data fetched successfully", exportData);

    } catch (error) {
        next(error)
    }
}

exports.postExportCenterController = async (req, res, next) => {
    try {

        const userId = req.userId;

        return successResponse(res, "Report added to download center");
    } catch (error) {
        next(error);
    }
};
