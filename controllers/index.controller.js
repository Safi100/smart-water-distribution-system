const Customer = require("../models/customer.model");
const City = require("../models/city.model");
const Admin = require("../models/admin.model");
const Bill = require("../models/bill.model");
const MainTank = require("../models/main_tank.model");
const Tank = require("../models/tank.model");
const HandleError = require("../utils/HandleError");

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
    const totalPaidBills = await Bill.countDocuments({ status: "Paid" });
    const totalUnPaidBills = await Bill.countDocuments({ status: "Unpaid" });
    res.status(200).json({
      totalCustomers,
      totalEmployees,
      totalCities,
      totalPaidBills,
      totalUnPaidBills,
    });
  } catch (e) {
    next(e);
  }
};

module.exports.pumpWater = async (req, res, next) => {
  try {
    const main_tank = await MainTank.findOne();
    if (!main_tank) throw new HandleError("No main tank found", 404);
    let tanks = await Tank.find().lean();

    if (!tanks || tanks.length === 0)
      throw new HandleError("No tanks found to pump", 404);
    res.status(200).json(tanks);
    // const response = await axios.post("http://localhost:5000/pump_water");
  } catch (e) {
    next(e);
  }
};

function calculateWaterUsage(tank) {
  const dailyUsage = tank.amount_per_month?.days || {};
  const totalUsed = Object.values(dailyUsage).reduce(
    (sum, val) => sum + val,
    0
  );
  return;
}

async function CountOfBillsNotPaid(tankId) {
  const bills = await Bill.find({ tank: tankId, status: "Unpaid" });
}
