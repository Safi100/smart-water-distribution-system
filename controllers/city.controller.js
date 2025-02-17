const City = require("../models/city.model");
const HandleError = require("../utils/HandleError");

module.exports.addCity = async (req, res, next) => {
  try {
    let { name } = req.body;
    // Validate required fields
    if (!name) {
      throw new HandleError("Name is required", 400);
    }
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const city = new City({
      name: name.trim(),
    });
    await city.save();
    res.status(201).json({ message: "City added successfully", city });
  } catch (err) {
    next(err);
  }
};
module.exports.getCities = async (req, res, next) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.status(200).json(cities);
  } catch (err) {
    next(err);
  }
};
