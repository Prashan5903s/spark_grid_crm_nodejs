const express = require('express')
const router = express.Router();
const isAuth = require('../middleware/is-auth')
const programController = require('../controller/User/MyCourseController');
const moduleController = require('../controller/User/ModuleControllerAPI');
const selfEnrollController = require("../controller/User/SelfEnrollmentAPIController")
const leadController = require("../controller/User/LeadAPIController")
const userSurveryReportController = require("../controller/User/UserSurveyReportController")
const dashboardController = require("../controller/User/DashboardAPIController")
const followUpController = require("../controller/User/FollowUpAPIController")
const proposalController = require("../controller/User/ProposalAPIController")

router.get('/program/data', isAuth, programController.getCourseAPIController);

router.get('/module/data/:id', isAuth, moduleController.getModuleAPIController);

router.get("/survey/report/:moduleId", isAuth, userSurveryReportController.getSurveyDetail)
router.post("/survey/report/:moduleId", isAuth, userSurveryReportController.postSuveyDetail)

router.get("/self/enroll/data", isAuth, selfEnrollController.getSelfEnrollData)
router.get("/self/enroll/data/:moduleId", isAuth, selfEnrollController.getInsertSelfEnrollData)

//This is the route for leads
router.get("/leads/data", isAuth, leadController.getLeadAPIController)
router.get("/leads/create/data", isAuth, leadController.getCreateLeadAPIController)
router.post("/leads/data", isAuth, leadController.postLeadController)
router.put("/leads/data/:id", isAuth, leadController.putLeadAPIController)

//This is the route for follow up
router.get("/follow-up/create/data", isAuth, followUpController.getCreateFollowUpController)
router.post("/follow-up/post/:leadId", isAuth, followUpController.postFollowUpController)

//This is the API of dashboard
router.get("/dashboard/user/data", isAuth, dashboardController.getDashboardAPI)

//This route is for proposal data
router.get("/proposal/create/data", isAuth, proposalController.getCreateProposalAPIController)
router.post("/proposal/post/data", isAuth, proposalController?.postProposalAPIController)

module.exports = router;