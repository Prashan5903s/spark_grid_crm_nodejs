const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/is-auth')
const languageController = require('../controller/Company/LanguageController');
const groupController = require('../controller/Company/GroupAPIContoller')
const zoneController = require('../controller/Company/ZoneAPIController');
const regionController = require('../controller/Company/RegionAPIController');
const appMenuController = require('../controller/Company/AppMenuController');
const companyValidation = require('../validation/Companyvalidation')
const branchController = require('../controller/Company/BranchAPIController');
const roleController = require('../controller/Company/RoleAPIController')
const departmentController = require('../controller/Company/DepartmentAPIController');
const channelController = require('../controller/Company/ChannelControllerAPI')
const certificateController = require('../controller/Company/CertificateAPIController')
const notificationController = require('../controller/Company/NotificationController');
const surveySettingController = require("../controller/Company/SurveySettingController")
const moduleSettingController = require("../controller/Company/ModuleSettingController")
const mailTemplateController = require("../controller/Company/MailTemplateController")
const exportCenterController = require("../controller/Company/ExportCenterAPIController")
const scheduleNotificationController = require('../controller/Company/ScheduleNotificationController');
const dashboardController = require("../controller/Company/DashboardAPIController")

const createUpload = require('../util/upload');

const uploadNotificationFiles = require('../util/createUploader');

const {
    middleware: imageExportCenterUpload
} = createUpload(
    [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'image/x-icon',

        // PDF
        'application/pdf',

        // Word
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx

        // Excel
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ],
    'export_center'
);

//This route is for zone
router.get('/zone', isAuth, zoneController.getZoneAPIData);
router.get('/zone/create/data', isAuth, zoneController.getZoneCreateData)
router.post('/zone', isAuth, zoneController.postZoneAPI);
router.put('/zone/:id', isAuth, zoneController.putZoneAPI);

//This route is for region
router.get('/region', isAuth, regionController.getRegionAPI);
router.get('/region/create', isAuth, regionController.createRegionAPI);
router.post('/region', isAuth, regionController.postRegionAPI);
router.post('/data/region', isAuth, regionController.postRegionDataAPI);
router.put('/data/region/:id', isAuth, regionController.putRegionData);

//This route is for language
router.get('/language', isAuth, languageController.getLanguageAPI);
router.post('/language', isAuth, companyValidation.postLanguageAPI, languageController.postLanguageAPI);
router.put('/language/:id', isAuth, companyValidation.postLanguageAPI, languageController.putLanguageAPI);
router.get('/language/menu', isAuth, languageController.getMenuAPI);

//This route is for label
router.get('/terminology', isAuth, appMenuController.getAppMenuAPI);
router.get('/terminology/label/create', isAuth, appMenuController.createLabelAPI);
router.post('/terminology/label', isAuth, appMenuController.postLabelAPI);
router.post('/terminology/app/menu', isAuth, appMenuController.postAppMenuAPI);
router.get('/menu/list', isAuth, appMenuController.getMenuListingAPI)

router.get('/app/menu/label/listing/:sn', isAuth, appMenuController.getAppMenuCompanyListAPI);
router.post('/app/menu/label/listing/:sn', isAuth, appMenuController.postCompanyMenuListAPI);

//This route is for branch
router.get('/branch', isAuth, branchController.getBranchAPI);
router.post('/branch/data', isAuth, branchController.postBranchAPI)
router.put('/branch/data/:branchId', isAuth, branchController.putBranchUpdateAPI);
router.post('/branch/unique/check', isAuth, branchController.postBranchUniqueCheck)
router.post('/app/branch/region/:regionId', isAuth, branchController.postRegionBranchAPI)

//This route is for department
router.get('/department', isAuth, departmentController.getDepartmentAPI)
router.post('/department', isAuth, departmentController.postDepartmentAPI)
router.put('/department/:departmentId', isAuth, departmentController.putDepartmentAPI)

//This route is for channel
router.get('/channel', isAuth, channelController.getChannelAPI);
router.post('/channel', isAuth, channelController.postChannelAPI)
router.put('/channel/:channelId', isAuth, channelController.putChannelAPI)

//This route is for role
router.get('/role', isAuth, roleController.getRoleAPI)
router.get('/role/create', isAuth, roleController.createRoleAPI);
router.post('/role', isAuth, roleController.postRoleAPI)
router.put('/role/:roleId', isAuth, roleController.putRoleAPI)

//This route is for group
router.get('/group', isAuth, groupController.getGroupAPI);
router.post('/group', isAuth, groupController.postGroupAPI);
router.put('/group/:groupId', isAuth, groupController.putGroupAPI);
router.get('/check/group/empId/:uploadData', isAuth, groupController.getCheckEmpId);

//This route is for certificate
router.get('/certificate/create', isAuth, certificateController.getCreateDataAPI)
router.get('/certificate/data', isAuth, certificateController.getCertificateAPI)
router.get('/certificate/edit/:id', isAuth, certificateController.getEditCertificateAPI)
router.post('/certificate/change/frame/:id', isAuth, certificateController.putChangeFrameAPI)

//This route is for notification
router.get('/notification', isAuth, notificationController.getNotificationDataAPI)
router.get('/notification/create', isAuth, notificationController.getCreateNotificationAPI)
router.post('/notification', isAuth, uploadNotificationFiles, notificationController.postNotificationDataAPI)
router.get('/notification/edit/:id', isAuth, notificationController.getEditNotificationAPI);
router.put('/notification/update/:id', isAuth, uploadNotificationFiles, notificationController.putUpdateNotificationAPI)
router.get('/notification/form/:id', isAuth, notificationController.getFormNotificationAPI);
router.put('/notification/form/update/:id', isAuth, uploadNotificationFiles, notificationController.updateNotificationAPI)
router.put("/notification/check/select/:id", isAuth, notificationController.getCheckSelectNotificationAPI)

//This is the route for module survey setting
router.get('/module/survey/setting/:moduleId', isAuth, surveySettingController.getSurveySettingAPI);
router.post('/module/survey/setting/:moduleId', isAuth, surveySettingController.postSurveySettingAPI);

// This route is fpr module setting
router.get('/modules/save/settings/:moduleId', isAuth, moduleSettingController.getModuleSettingAPI);
router.post('/modules/save/settings/:moduleId', isAuth, moduleSettingController.postModuleSettingAPI);

//This route is for mail template
router.get("/mail/template/data", isAuth, mailTemplateController.getMailTemplateController)
router.post("/mail/template/data", isAuth, mailTemplateController.postMailTemplateController)
router.put("/mail/template/data/:id", isAuth, mailTemplateController.putMailTemplateController)

//This route is for export center
router.get("/export/center/data", isAuth, exportCenterController.getExportCenterController)
router.get("/export/create/data", isAuth, exportCenterController.getCreateDataController)
router.post('/export/post/data', isAuth, imageExportCenterUpload("file"), exportCenterController.postExportDataController)
router?.put("/export/put/data/:id", isAuth, imageExportCenterUpload("file"), exportCenterController.putExportCenterController)

//This route is for schedule notification
router.get("/schedule/notification", isAuth, scheduleNotificationController.getScheduleNotification)
router.post("/schedule/notification/data", isAuth, scheduleNotificationController.postScheduleNotification)
router.get('/schedule/notification/edit/data/:id', isAuth, scheduleNotificationController.getEditSchedNotification)
router.get("/schedule/notification/create/data", isAuth, scheduleNotificationController.getCreateScheduleNotification)
router.delete("/schedule/notification/delete/:id", isAuth, scheduleNotificationController.deleteScheduleNotificationController)

router.get("/dashboard/company/data", isAuth, dashboardController.getDashboardAPIController)

router.get("/user/level/data", isAuth, dashboardController?.getUserLevelController)

module.exports = router;