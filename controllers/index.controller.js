const Customer = require("../models/customer.model");
const City = require("../models/city.model");
const Admin = require("../models/admin.model");
const Bill = require("../models/bill.model");
const MainTank = require("../models/main_tank.model");
const Tank = require("../models/tank.model");
const HandleError = require("../utils/HandleError");
const {
  CountOfBillsNotPaid,
  calculateWaterUsage,
} = require("../utils/CheckPumpFunctions");
const { sendNotification } = require("../utils/Notification");
const socket = require("../Socket");
const axios = require("axios");

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

const sendNotificationWithSocket = async (message, userId) => {
  const notification = await sendNotification(message, userId);

  const io = socket.getIO();
  io.emit("new_notification", {
    userId: userId,
    notification,
  });
};

module.exports.pumpWater = async (req, res, next) => {
  try {
    const tanks_to_pump = [];
    const main_tank = await MainTank.findOne();
    if (!main_tank) throw new HandleError("No main tank found", 404);

    let tanks = await Tank.find();
    if (!tanks || tanks.length === 0)
      throw new HandleError("No tanks found to pump", 404);

    const isTankEmpty =
      Number(main_tank.current_level) / Number(main_tank.max_capacity) <= 0.3;

    if (isTankEmpty) {
      throw new HandleError("Main tank is empty, can't pump water.", 400);
    }

    tanks = await Promise.all(
      tanks.map(async (tank) => {
        const tankObj = tank.toObject({ virtuals: true });
        const billsCount = await CountOfBillsNotPaid(tank._id);
        const usage = calculateWaterUsage(tankObj);

        return {
          ...tankObj,
          usage,
          remainCapacity: tankObj.monthly_capacity - Number(usage),
          billsCountNotPaid: billsCount,
          isTankFull:
            Number(tankObj.max_capacity) > 0 &&
            Number(tankObj.current_level) / Number(tankObj.max_capacity) >= 0.8,
        };
      })
    );

    for (let tank of tanks) {
      if (tank.billsCountNotPaid < 2 && !tank.isTankFull) {
        tanks_to_pump.push(tank);
      } else if (tank.billsCountNotPaid >= 2) {
        await sendNotificationWithSocket(
          `Tank ${tank._id} has more than one unpaid bills, we can't pump water for you now.`,
          tank.owner
        );
      } else if (tank.isTankFull) {
        await sendNotificationWithSocket(
          `Tank ${tank._id} is full, we can't pump water for you now.`,
          tank.owner
        );
      }
    }

    if (tanks_to_pump.length === 0)
      throw new HandleError("No tanks to pump", 404);

    console.log(`🚰 Found ${tanks_to_pump.length} tanks ready for pumping`);

    // Send pump request to hardware (with all tanks data)
    const response = await axios.post(
      "http://localhost:5000/control_water_pump",
      {
        tanks: tanks_to_pump,
        main_tank: {
          hardware: main_tank.hardware,
          water_pump_duration: main_tank.water_pump_duration,
        },
      }
    );

    // Read updated main tank capacity
    const updated_main_tank_response = await axios.post(
      "http://localhost:5000/calculate_tank_capacity",
      {
        hardware: main_tank.hardware,
        height: main_tank.height,
        radius: main_tank.radius,
      }
    );

    // Update main tank level using updateOne
    await MainTank.updateOne(
      { _id: main_tank._id },
      {
        current_level: updated_main_tank_response.data.estimated_volume_liters,
      }
    );

    // Update each tank's current_level and daily usage
    const currentDay = new Date().getDate();
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-based

    for (const tankResult of response.data.tanks) {
      if (
        tankResult.tank_id &&
        tankResult.final_liters !== undefined &&
        tankResult.liters !== undefined
      ) {
        try {
          // Find the tank
          const tank = await Tank.findById(tankResult.tank_id);
          if (!tank) {
            console.warn(`Tank ${tankResult.tank_id} not found for update`);
            continue;
          }

          // Update current_level with final_liters
          tank.current_level = tankResult.final_liters;

          // Update daily usage - add liters to current day
          if (!tank.amount_per_month) {
            tank.amount_per_month = { month: currentMonth, days: {} };
          }

          if (!tank.amount_per_month.days) {
            tank.amount_per_month.days = {};
          }

          // Add liters to current day (convert to number and add)
          const currentDayUsage =
            Number(tank.amount_per_month.days[currentDay]) || 0;
          const newDayUsage = currentDayUsage + Number(tankResult.liters);

          // Mark the nested object as modified for Mongoose
          tank.amount_per_month.days[currentDay] = newDayUsage;
          tank.amount_per_month.month = currentMonth;
          tank.markModified("amount_per_month");

          await tank.save();

          console.log(`✅ Updated tank ${tankResult.tank_id}:`, {
            current_level: tankResult.final_liters,
            daily_usage_added: tankResult.liters,
            day: currentDay,
            total_day_usage: tank.amount_per_month.days[currentDay],
          });
        } catch (updateError) {
          console.error(
            `❌ Error updating tank ${tankResult.tank_id}:`,
            updateError
          );
        }
      }
    }

    // Respond with updated data
    res.status(200).json({
      message: `Successfully pumped water to ${tanks_to_pump.length} tank(s)`,
      tank_response: response.data,
      main_tank_level: updated_main_tank_response.data,
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
