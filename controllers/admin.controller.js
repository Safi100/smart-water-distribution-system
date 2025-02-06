const Admin = require("../models/admin.model");
const HandleError = require("../utils/HandleError");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/SendEmail");

module.exports.addAdmin = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    // Validate required fields
    if (!name || !phone || !email) {
      throw new HandleError("All fields are required", 400);
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HandleError("Invalid email format", 400);
    }
    // Check if admin already exists by email
    const isExist = await Admin.findOne({ email: email.toLowerCase() });
    console.log(isExist);

    if (isExist) {
      throw new HandleError("Email already exists", 400);
    }
    // generate random password
    const RandomPassword = Math.random().toString(36);
    // hash password

    const hashedPassword = await bcrypt.hash(RandomPassword, 10);
    await sendEmail(
      email,
      "Welcome to the Admin Team - Your Account Details Inside!",
      `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #007BFF;">Welcome to the Admin Team, ${name}!</h2>
      <p>We’re excited to have you on board. Your account has been created successfully. Below are your login details:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password: </strong> <span style="font-weight: bold; color: #d9534f;">${RandomPassword}</span></p>
      </div>
      <p>⚠️ <strong>For security reasons, please change your password upon your first login.</strong></p>
      <h3>How to Get Started?</h3>
      <ol>
        <li>Log in to your admin panel using the credentials above.</li>
        <li>Navigate to the <strong>Settings</strong> section and update your password.</li>
        <li>Explore the admin dashboard and manage operations with ease!</li>
      </ol>
      <p>If you have any questions or need assistance, feel free to reach out.</p>
      <p>Best regards,<br><strong>Water management system</strong></p>
    </div>`
    );
    // Create a new admin
    const newAdmin = new Admin({
      name: name.trim(),
      phone,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });
    await newAdmin.save();
    res
      .status(201)
      .json({ message: "Admin added successfully", admin: newAdmin });
  } catch (e) {
    next(e);
  }
};
