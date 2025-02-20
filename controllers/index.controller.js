const Customer = require("../models/customer.model");
const City = require("../models/city.model");
const Admin = require("../models/admin.model");

module.exports.generalSearch = async (req, res, next) => {
  try {
    let data = [];
    // users
    const { q } = req.query;
    if (q.length < 1) return 0;

    const searchRegex = new RegExp(q.trim(), "i"); // Case-insensitive search

    const customers = await Customer.find({
      $or: [
        { email: searchRegex },
        { identity_number: searchRegex },
        { name: searchRegex },
      ],
    })
      .select(["identity_number", "name", "email"])
      .sort({ name: 1 });

    // push all customers sort
    for (let i = 0; i < customers.length; i++) {
      data.push({
        type: "customer",
        _id: customers[i]._id,
        identity_number: customers[i].identity_number,
        title: customers[i].name,
        email: customers[i].email,
      });
    }

    // sort data
    data.sort((a, b) => {
      const titleA = a.title.toUpperCase();
      const titleB = b.title.toUpperCase();

      if (titleA > titleB) {
        return 1; // Change the order here
      }
      if (titleA < titleB) {
        return -1; // Change the order here
      }
      return 0;
    });
    // send data to client
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};
module.exports.dashboard_data = async (req, res, next) => {
  try {
    const totalCustomers = await Customer.countDocuments({});
    const totalEmployees = await Admin.countDocuments({});
    const totalCities = await City.countDocuments({});
    res.status(200).json({
      totalCustomers,
      totalEmployees,
      totalCities,
    });
  } catch (e) {
    next(e);
  }
};
