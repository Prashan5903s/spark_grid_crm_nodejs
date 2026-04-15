require('dotenv').config();
const Designation = require('../../model/Designation');
const {
  successResponse,
  errorResponse,
  warningResponse
} = require('../../util/response');

const getDesignationAPI = async (req, res, next) => {
  try {
    const companyId = req.userId;

    const data = await Designation.find({
      company_id: companyId,
      status: true
    }).select('name status');

    return successResponse(res, "Designation fetched successfully!", data);
  } catch (error) {
    next(error);
  }
};


const postDesignationAPI = async (req, res, next) => {
  try {

    const {
      name,
      status
    } = req.body;

    const userId = req.userId;

    if (!name || typeof status === 'undefined') {
      return warningResponse(res, "Name and status are required fields.", {}, 400);
    }

    //Check for existing designation with same name under same company
    const existing = await Designation.findOne({
      company_id: userId,
      name: {
        $regex: new RegExp(`^${name}$`, 'i')
      } // case-insensitive match
    });

    if (existing) {
      return warningResponse(res, "Designation with this name already exists.", {}, 409);
    }

    const designation = new Designation({
      company_id: userId,
      name,
      status
    });

    await designation.save();

    return successResponse(res, "Designation created successfully!", designation);
  } catch (err) {
    return errorResponse(res, "Failed to create designation", err, 500);
  }
};


const putDesignationAPI = async (req, res, next) => {
  try {
    const {
      name,
      status
    } = req.body;
    const userId = req.userId;

    if (!name || typeof status === 'undefined') {
      return warningResponse(res, "Name and status are required fields.", {}, 400);
    }

    const designation = await Designation.findOne({
      company_id: userId,
      _id: req.params.id
    });

    if (!designation) {
      return warningResponse(res, "Designation not found.", {}, 404);
    }

    const duplicate = await Designation.findOne({
      company_id: userId,
      name: {
        $regex: new RegExp(`^${name}$`, 'i')
      },
      _id: {
        $ne: req.params.id
      }
    });

    if (duplicate) {
      return warningResponse(res, "Another designation with this name already exists.", {}, 409);
    }

    await Designation.findOneAndUpdate({
      company_id: userId,
      _id: req.params.id
    }, {
      name,
      status
    })

    return successResponse(res, "Designation updated successfully!", designation);
  } catch (err) {
    return errorResponse(res, "Failed to update designation", err, 500);
  }
};


const deleteDesignationAPI = async (req, res, next) => {
  try {
    const userId = req.userId;
    const designationId = req.params.id;
    const designation = await Designation.findOne({
      company_id: userId,
      _id: designationId
    });

    if (!designation) {
      return warningResponse(res, "Designation not found.", {}, 404);
    }

    await Designation.findByIdAndDelete(designationId)

    return successResponse(res, "Designation deleted successfully!", {}, 200);
  } catch (err) {
    return errorResponse(res, "Failed to delete designation", err, 500);
  }
};

module.exports = {
  getDesignationAPI,
  postDesignationAPI,
  putDesignationAPI,
  deleteDesignationAPI,
};