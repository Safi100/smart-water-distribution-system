const Admin = require("../models/admin.model");
const HandleError = require("../utils/HandleError");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/SendEmail");

module.exports.addAdminManager = async (req, res, next) => {
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
module.exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Validate required fields
    if (!email || !password) {
      throw new HandleError("Email and password are required", 400);
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HandleError("Invalid email format", 400);
    }
    // Check if admin exists by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new HandleError("Invalid email or password", 401);
    }
    // Check if password is correct
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new HandleError("Invalid email or password", 401);
    }
    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    const admin_id = admin._id.toString();
    res.cookie("c_user", admin._id.toString());
    res
      .cookie("access_token", token, { httpOnly: true })
      .status(200)
      .json({ message: "Login successful", token, admin_id });
  } catch (e) {
    next(e);
  }
};
module.exports.removeAdminManager = async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      throw new HandleError("Admin not found", 404);
    }
    res.status(200).json({ message: "Admin removed successfully", admin });
  } catch (e) {
    next(e);
  }
};
module.exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select("-password");
    res.status(200).json(admins);
  } catch (e) {
    next(e);
  }
};
module.exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    // Validate required fields
    if (!email) {
      throw new HandleError("Email is required", 400);
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HandleError("Invalid email format", 400);
    }
    // Check if admin exists by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new HandleError("Admin not found", 404);
    }
    // generate random password
    const RandomPassword = Math.random().toString(36);
    // hash password
    const hashedPassword = await bcrypt.hash(RandomPassword, 10);
    admin.password = hashedPassword;
    await admin.save();
    await sendEmail(
      email,
      "Password Reset - Your New Temporary Password",
      `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #007BFF;">Password Reset Request</h2>
        <p>We received a password reset request for your account. Below is your new temporary password:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Temporary Password: </strong> <span style="font-weight: bold; color: #d9534f;">${RandomPassword}</span></p>
        </div>
        <p>Please log in to your admin panel using the new password and change it as soon as possible.</p>
        <p>Best regards,<br><strong>Water management system</strong></p>
      </div>`
    );
    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (e) {
    next(e);
  }
};
module.exports.currentUser = async (req, res, next) => {
  try {
    const user = await Admin.findById(req.user.id);
    if (!user) {
      throw new HandleError("User not found", 404);
    }
    // extract password
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json(userWithoutPassword);
  } catch (e) {
    next(e);
  }
};
module.exports.logout = (req, res, next) => {
  res.clearCookie("c_user");
  res.clearCookie("access_token");
  res.status(200).json({ message: "Logged out successfully" });
};
module.exports.getAdminProfile = async (req, res, next) => {
  try {
    let currentAdmin = await Admin.findById(req.user.id).select("-password");
    if (req.user.id == req.params.id) {
      res.status(200).json(currentAdmin);
    } else if (currentAdmin.role == "admin") {
      const adminProfile = await Admin.findById(req.params.id).select(
        "-password"
      );
      if (!adminProfile) {
        throw new HandleError("Admin not found", 404);
      }
      res.status(200).json(adminProfile);
    } else {
      throw new HandleError("Unauthorized access", 401);
    }
  } catch (e) {
    next(e);
  }
};
module.exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      throw new HandleError("Name, email, and phone number are required", 400);
    }

    const updatedAdmin = await Admin.findById(req.user.id).select("-password");
    if (!updatedAdmin) {
      throw new HandleError("Admin not found", 404);
    }
    // Check if the email is already in use by another admin
    const emailExist = await Admin.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.user.id },
    });
    if (emailExist) {
      throw new HandleError("Email is already in use", 400);
    }

    updatedAdmin.name = name.trim();
    updatedAdmin.email = email.toLowerCase().trim();
    updatedAdmin.phone = phone.trim();
    await updatedAdmin.save();

    res.status(200).json(updatedAdmin);
  } catch (e) {
    next(e);
  }
};
module.exports.updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password || !confirm_password) {
      throw new HandleError(
        "Current password, new password, and confirm new password are required",
        400
      );
    }
    const updatedAdmin = await Admin.findById(req.user.id);
    if (!updatedAdmin) {
      throw new HandleError("Admin not found", 404);
    }
    // Check if the current password is correct
    const isMatch = await bcrypt.compare(
      current_password,
      updatedAdmin.password
    );
    if (!isMatch) {
      throw new HandleError("Current password is incorrect", 401);
    }
    // Check if the new password and confirm new password match
    if (new_password !== confirm_password) {
      throw new HandleError(
        "New password and confirm new password do not match",
        400
      );
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    updatedAdmin.password = hashedPassword;
    await updatedAdmin.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (e) {
    next(e);
  }
};
