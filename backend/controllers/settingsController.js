import BusinessSetting from '../models/BusinessSetting.js';
import Admin from '../models/Admin.js';

/**
 * @desc    Get Business Settings and Admin Info
 * @route   GET /api/settings
 * @access  Private
 */
export const getSettings = async (req, res, next) => {
  try {
    let settings = await BusinessSetting.findOne();
    if (!settings) {
      settings = await BusinessSetting.create({
        businessName: 'CCTV Security Solutions',
        contactNumber: '+91 98765 43210',
        email: 'contact@cctvsolutions.com',
        address: 'Surat, Gujarat',
      });
    }

    const admin = await Admin.findById(req.admin._id).select('name email role lastLogin');

    res.status(200).json({
      success: true,
      data: {
        settings,
        admin,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update Business Settings
 * @route   PUT /api/settings
 * @access  Private
 */
export const updateSettings = async (req, res, next) => {
  try {
    const { businessName, contactNumber, email, address } = req.body;

    let settings = await BusinessSetting.findOne();
    if (!settings) {
      settings = new BusinessSetting();
    }

    if (businessName) settings.businessName = businessName.trim();
    if (contactNumber !== undefined) settings.contactNumber = contactNumber.trim();
    if (email !== undefined) settings.email = email.trim();
    if (address !== undefined) settings.address = address.trim();

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Business settings updated successfully',
      data: settings,
    });
  } catch (err) {
    next(err);
  }
};
