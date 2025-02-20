const Customer = require("../models/customer.model");
const HandleError = require("../utils/HandleError");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/SendEmail");

module.exports.addCustomer = async (req, res, next) => {
  try {
    const { identity_number, name, email, phone } = req.body;
    // Validate required fields
    if (!identity_number || !name || !email || !phone) {
      throw new HandleError("All fields are required", 400);
    }
    // Validate identity number length and numeric format
    if (!/^[0-9]{9}$/.test(identity_number)) {
      throw new HandleError(
        "Identity number must be exactly 9 number digits",
        400
      );
    }
    // Check if customer already exists by identity_number OR email OR phone
    const existingCustomer = await Customer.findOne({
      $or: [{ identity_number }, { email }, { phone }],
    });
    if (existingCustomer) {
      throw new HandleError(
        "Customer with provided identity number, email, or phone already exists",
        409
      );
    }
    // password same as identity_number
    const hashedPassword = await bcrypt.hash(identity_number, 10);

    // Create and save new customer
    const newCustomer = new Customer({
      identity_number,
      name,
      email,
      phone,
      password: hashedPassword,
    });
    await newCustomer.save();
    res
      .status(201)
      .json({ message: "Customer added successfully", customer: newCustomer });
  } catch (error) {
    next(error);
  }
};
module.exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find().select("-password");
    res.status(200).json(customers);
  } catch (error) {
    next(error);
  }
};
module.exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).select("-password");
    if (!customer) {
      throw new HandleError("Customer not found", 404);
    }
    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
};
module.exports.loginCustomer = async (req, res, next) => {
  try {
    const { identity_number, password } = req.body;
    // Validate required fields
    if (!identity_number || !password) {
      throw new HandleError("ID and password are required", 400);
    }
    // Validate id format at least 9 digits of numbers only
    if (!/^[0-9]{9}$/.test(identity_number)) {
      throw new HandleError(
        "Identity number must be exactly 9 number digits",
        400
      );
    }
    // Check if customer exists by identity_number
    const customer = await Customer.findOne({ identity_number });
    if (!customer) {
      throw new HandleError("Invalid id or password", 401);
    }
    // Check if password is correct
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      throw new HandleError("Invalid email or password", 401);
    }
    // Generate JWT token
    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.cookie("c_user", customer._id.toString());
    res
      .cookie("access_token", token, { httpOnly: true })
      .status(200)
      .json({ message: "Login successful", token });
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
    // Check if customer exists by email
    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) {
      throw new HandleError("Customer not found", 404);
    }
    // generate random password
    const RandomPassword = Math.random().toString(36);
    // hash password
    const hashedPassword = await bcrypt.hash(RandomPassword, 10);
    customer.password = hashedPassword;
    await customer.save();
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
module.exports.updateCustomer = async (req, res, next) => {
  try {
    const { identity_number, name, email, phone } = req.body;

    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      throw new HandleError("Customer not found", 404);
    }

    // Validate required fields
    if (!identity_number || !name || !email || !phone) {
      throw new HandleError("All fields are required", 400);
    }
    // Validate identity number length and numeric format
    if (!/^[0-9]{9}$/.test(identity_number)) {
      throw new HandleError(
        "Identity number must be exactly 9 number digits",
        400
      );
    }
    // Check if customer already exists by identity_number OR email and not the current customer
    const existingCustomer = await Customer.findOne({
      $and: [
        {
          $or: [{ identity_number }, { email }],
        },
        { _id: { $ne: req.user.id } },
      ],
    });
    console.log(existingCustomer);

    if (existingCustomer) {
      throw new HandleError(
        "Customer with provided identity number or email already exists",
        409
      );
    }
    customer.identity_number = identity_number;
    customer.name = name;
    customer.email = email;
    customer.phone = phone;
    await customer.save();
    res
      .status(200)
      .json({ message: "Customer updated successfully", customer });
  } catch (error) {
    next(error);
  }
};
module.exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // Validate required fields
    if (!currentPassword || !newPassword) {
      throw new HandleError(
        "Current password and new password are required",
        400
      );
    }
    // Check if customer exists by id
    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      throw new HandleError("Customer not found", 404);
    }
    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, customer.password);
    if (!isMatch) {
      throw new HandleError("Invalid current password", 401);
    }
    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPassword;
    await customer.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (e) {
    next(e);
  }
};
module.exports.fetchProile = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.user.id).select("-password");
    if (!customer) {
      throw new HandleError("Customer not found", 404);
    }
    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
};
module.exports.currentUser = async (req, res, next) => {
  try {
    const user = await Customer.findById(req.user.id);
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
