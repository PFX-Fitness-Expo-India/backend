const contactModel = require("../models/contact.model");
const CommonResponse = require("../utils/common.response");
const sendEmail = require("../utils/email.util");

const submitInquiry = async (req, res) => {
  try {
    const { fullName, email, message } = req.body;

    const inquiry = new contactModel({
      fullName,
      email,
      message,
    });

    await inquiry.save();

    // Notify admin
    try {
      await sendEmail({
        email: process.env.EMAIL_USER,
        subject: `New Inquiry from ${fullName}`,
        message: `You have received a new inquiry.\n\nName: ${fullName}\nEmail: ${email}\nMessage: ${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #d32f2f;">New Contact Inquiry</h2>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
              <strong>Message:</strong><br>${message}
            </p>
            <hr>
            <p style="font-size: 0.8em; color: #777;">This is an automated notification from PFX Fitness Expo Backend.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError);
      // We don't fail the request if email fails, as the inquiry is saved in DB.
    }

    return res.status(201).json(new CommonResponse(201, "Inquiry submitted successfully", inquiry));
  } catch (error) {
    console.error("Submit inquiry error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json(new CommonResponse(400, error.message, null));
    }
    return res.status(500).json(new CommonResponse(500, "Internal server error", null));
  }
};

const getInquiries = async (req, res) => {
  try {
    const inquiries = await contactModel.find().sort({ createdAt: -1 });
    return res.status(200).json(new CommonResponse(200, "Inquiries fetched successfully", inquiries));
  } catch (error) {
    console.error("Get inquiries error:", error);
    return res.status(500).json(new CommonResponse(500, "Internal server error", null));
  }
};

const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await contactModel.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json(new CommonResponse(404, "Inquiry not found", null));
    }

    return res.status(200).json(new CommonResponse(200, "Inquiry deleted successfully", null));
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return res.status(500).json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  submitInquiry,
  getInquiries,
  deleteInquiry,
};
