const Tank = require("../models/tank.model");
const HandleError = require("../utils/HandleError"); // Assuming you have a custom error handling class
const City = require("../models/city.model");
const Customer = require("../models/customer.model");

module.exports.addTank = async (req, res, next) => {
  try {
    const { customer, city, tank_size, coordinates, hardware, family_members } =
      req.body;
    // Validate required fields

    if (
      (!customer || !city || !tank_size || !coordinates,
      !hardware,
      !family_members)
    ) {
      throw new HandleError("All fields are required", 400);
    }
    // Validate family_members structure
    if (!Array.isArray(family_members) || family_members.length === 0) {
      throw new HandleError(
        "Family members should be an array and at least one member",
        400
      );
    }
    // Validate that each family member has necessary fields
    family_members.forEach((member) => {
      const { name, dob, identity_id, gender } = member;
      if (!name || !dob || !identity_id || !gender) {
        throw new HandleError(
          "Each family member must have a name, dob, identity_id, and gender",
          400
        );
      }
      if (!["Male", "Female"].includes(gender)) {
        throw new HandleError("Gender must be either 'Male' or 'Female'", 400);
      }
    });
    // Validate coordinates
    if (
      typeof coordinates.latitude !== "number" ||
      typeof coordinates.longitude !== "number"
    ) {
      throw new HandleError("Coordinates must be valid numbers", 400);
    }
    // Handle customer and city
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      throw new HandleError("Invalid customer id", 400);
    }
    const cityExists = await City.findById(city);
    if (!cityExists) {
      throw new HandleError("Invalid city id", 400);
    }
    // Create and save new tank object and return it to the client
    const tank = new Tank({
      owner: customerExists._id,
      city: cityExists._id,
      family_members,
      height: tank_size.height,
      radius: tank_size.radius,
      coordinates: {
        longitude: coordinates.longitude,
        latitude: coordinates.latitude,
      },
      hardware: {
        ultrasonic_sensor: hardware.ultrasonic_sensor,
        waterflow_sensor: hardware.waterflow_sensor,
        solenoid_valve: hardware.solenoid_valve,
        lcd_scl: hardware.lcd_scl,
        lcd_sda: hardware.lcd_sda,
      },
    });
    await tank.save();
    customerExists.tanks.push(tank);
    cityExists.tanks.push(tank);
    await cityExists.save();
    await customerExists.save();
    res
      .status(201)
      .json({ message: "Tank added successfully", tank_id: tank._id });
  } catch (e) {
    next(e);
  }
};
module.exports.tankProfile = async (req, res, next) => {
  try {
    const tank = await Tank.findById(req.params.id)
      .populate({
        path: "city",
        select: ["name"],
      })
      .populate({
        path: "owner",
        select: ["name", "email", "identity_number", "phone"],
      });
    if (!tank) {
      throw new HandleError("Tank not found", 404);
    }
    res.status(200).json(tank);
  } catch (e) {
    next(e);
  }
};

module.exports.getTanks = async (req, res, next) => {
  try {
    const user = await Customer.findById(req.user.id);
    if (!user) {
      throw new HandleError("User not found", 404);
    }
    const tanks = await Tank.find({ owner: user._id });
    res.status(200).json(tanks);
  } catch (e) {
    next(e);
  }
};

module.exports.ProfileTankForCustomer = async (req, res, next) => {
  try {
    const current_customer = await Customer.findById(req.user.id);
    if (!current_customer) {
      throw new HandleError("Customer not found", 404);
    }
    const tank = await Tank.findById(req.params.id)
      .populate({
        path: "city",
        select: ["name"],
      })
      .populate({
        path: "owner",
        select: ["name", "email", "identity_number", "phone"],
      });

    if (!tank) {
      throw new HandleError("Tank not found", 404);
    }

    if (tank.owner._id.toString() !== current_customer._id.toString()) {
      throw new HandleError("Unauthorized access", 401);
    }
    res.status(200).json(tank);
  } catch (e) {
    next(e);
  }
};
