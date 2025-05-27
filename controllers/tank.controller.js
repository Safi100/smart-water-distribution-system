const Tank = require("../models/tank.model");
const MainTank = require("../models/main_tank");
const City = require("../models/city.model");
const Customer = require("../models/customer.model");
const HandleError = require("../utils/HandleError"); // Assuming you have a custom error handling class
const axios = require("axios");

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
        ultrasonic_sensor_trig: hardware.ultrasonic_sensor_trig,
        ultrasonic_sensor_echo: hardware.ultrasonic_sensor_echo,
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
module.exports.fetchMainTank = async (req, res, next) => {
  try {
    const id = req.params.id;
    const tank = await MainTank.findById(id);
    if (!tank) {
      throw new HandleError("Tank not found", 404);
    }
    res.status(200).json(tank);
  } catch (e) {
    next(e);
  }
};

module.exports.updateTank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tank_size, coordinates, hardware, family_members, city } = req.body;

    // Find the tank
    const tank = await Tank.findById(id);
    if (!tank) {
      throw new HandleError("Tank not found", 404);
    }

    // Prepare update object
    const updateData = {};

    // Update tank size if provided
    if (tank_size) {
      if (
        tank_size.height &&
        typeof tank_size.height === "number" &&
        tank_size.height >= 1
      ) {
        updateData.height = tank_size.height;
      }
      if (
        tank_size.radius &&
        typeof tank_size.radius === "number" &&
        tank_size.radius >= 1
      ) {
        updateData.radius = tank_size.radius;
      }
    }

    // Update coordinates if provided
    if (coordinates) {
      if (
        coordinates.latitude !== undefined &&
        coordinates.longitude !== undefined &&
        typeof coordinates.latitude === "number" &&
        typeof coordinates.longitude === "number"
      ) {
        updateData.coordinates = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      } else if (
        coordinates.latitude !== undefined ||
        coordinates.longitude !== undefined
      ) {
        throw new HandleError(
          "Both latitude and longitude must be provided as valid numbers",
          400
        );
      }
    }

    // Update hardware if provided
    if (hardware) {
      const hardwareFields = [
        "ultrasonic_sensor_trig",
        "ultrasonic_sensor_echo",
        "waterflow_sensor",
        "solenoid_valve",
        "lcd_scl",
        "lcd_sda",
      ];

      const updatedHardware = {};
      let hasValidHardwareUpdate = false;

      hardwareFields.forEach((field) => {
        if (
          hardware[field] !== undefined &&
          typeof hardware[field] === "number"
        ) {
          updatedHardware[field] = hardware[field];
          hasValidHardwareUpdate = true;
        }
      });

      if (hasValidHardwareUpdate) {
        updateData.hardware = {
          ...tank.hardware.toObject(),
          ...updatedHardware,
        };
      }
    }

    // Update family members if provided
    if (family_members) {
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
          throw new HandleError(
            "Gender must be either 'Male' or 'Female'",
            400
          );
        }
      });

      updateData.family_members = family_members;
    }

    // Update city if provided
    if (city) {
      const cityExists = await City.findById(city);
      if (!cityExists) {
        throw new HandleError("Invalid city id", 400);
      }

      // If city is changing, update the references
      if (tank.city.toString() !== city) {
        // Remove tank from old city
        const oldCity = await City.findById(tank.city);
        if (oldCity) {
          oldCity.tanks = oldCity.tanks.filter(
            (tankId) => tankId.toString() !== id
          );
          await oldCity.save();
        }

        // Add tank to new city
        cityExists.tanks.push(id);
        await cityExists.save();

        updateData.city = city;
      }
    }

    // Update the tank if there are changes
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid update data provided" });
    }

    // Apply updates
    const updatedTank = await Tank.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "city",
        select: ["name"],
      })
      .populate({
        path: "owner",
        select: ["name", "email", "identity_number", "phone"],
      });

    res.status(200).json({
      message: "Tank updated successfully",
      tank: updatedTank,
    });
  } catch (e) {
    next(e);
  }
};

module.exports.setCustomerMainTank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const current_customer = await Customer.findById(req.user.id);

    if (!current_customer) {
      throw new HandleError("Customer not found", 404);
    }

    const tank = await Tank.findById(id).select("_id owner family_members");

    if (!tank) {
      throw new HandleError("Tank not found", 404);
    }
    if (tank.owner.toString() !== current_customer._id.toString()) {
      throw new HandleError("Unauthorized access", 401);
    }
    if (current_customer.main_tank._id.toString() === tank._id.toString()) {
      return res.status(200).json("Customer's main tank is already set");
    }
    current_customer.main_tank = tank._id;
    await current_customer.save();
    res.status(200).json("Customer's main tank set successfully");
  } catch (e) {
    console.log(e);

    next(e);
  }
};
module.exports.readTankValueUltraSonic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tank = await Tank.findById(id).select(
      "hardware owner height radius current_level max_capacity"
    );
    if (!tank) throw new HandleError("Tank not found", 404);
    if (tank.owner.toString() !== req.user.id) {
      throw new HandleError("You are not the owner of this tank", 403);
    }
    const response = await axios.post(
      "http://localhost:5000/calculate_tank_capacity",
      tank
    );
    tank.current_level = response.data.estimated_volume_liters;
    await tank.save();
    res.status(200).json(response.data);
  } catch (e) {
    console.error("Error in readTankValueUltraSonic:", e);
    next(e);
  }
};
module.exports.readMainTankValueUltraSonic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tank = await MainTank.findById(id).select(
      "hardware height radius current_level max_capacity"
    );
    if (!tank) throw new HandleError("Tank not found", 404);

    const response = await axios.post(
      "http://localhost:5000/calculate_tank_capacity",
      tank
    );
    tank.current_level = response.data.estimated_volume_liters;
    await tank.save();
    res.status(200).json(response.data);
  } catch (e) {
    console.error("Error in readTankValueUltraSonic:", e);
    next(e);
  }
};
