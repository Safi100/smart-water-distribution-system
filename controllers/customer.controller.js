const Customer = require("../models/customer.model");
const HandleError = require("../utils/HandleError");
const bcrypt = require("bcrypt");

module.exports.addCustomer = async (req, res, next) => {
  try {
    const { identity_number, name, email, phone } = req.body;
    // Validate required fields
    if (!identity_number || !name || !email || !phone) {
      throw new HandleError("All fields are required", 400);
    }
    // Validate identity number length and numeric format
    if (!/^[0-9]{9}$/.test(identity_number)) {
      throw new HandleError("Identity number must be exactly 9 digits", 400);
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
    res.status(200).json({ customers });
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
