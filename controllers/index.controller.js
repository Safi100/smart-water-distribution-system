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
    let main_tank = await MainTank.findOne();
    if (!main_tank) throw new HandleError("No main tank found", 404);
    let tanks = await Tank.find();

    if (!tanks || tanks.length === 0)
      throw new HandleError("No tanks found to pump", 404);

    main_tank = {
      ...main_tank.toObject({ virtuals: true }),
      isTankEmpty:
        Number(main_tank.current_level) / Number(main_tank.max_capacity) <= 0.3,
    };

    if (main_tank.isTankEmpty) {
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
      if (tank.billsCountNotPaid < 2 && tank.isTankFull === false) {
        tanks_to_pump.push(tank);
      } else if (tank.billsCountNotPaid >= 2) {
        console.log(tank.owner);

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

    const tank = tanks_to_pump[0];
    console.log(`🚰 Found ${tanks_to_pump.length} tanks ready for pumping`);

    // Send pump request for all tanks to hardware.py
    const response = await axios.post(
      "http://localhost:5000/control_water_pump",
      { tank: tank, main_tank }
    );

    // Read main tank capacity after pumping water
    const updated_main_tank_response = await axios.post(
      `http://localhost:5000/calculate_tank_capacity`,
      main_tank
    );

    // Update main tank level
    const originalMainTank = await MainTank.findOne();
    if (originalMainTank) {
      originalMainTank.current_level =
        updated_main_tank_response.data.estimated_volume_liters;
      await originalMainTank.save();
    }

    const today = new Date().getDate().toString();
    const updatedTanks = [];

    // Update water usage for all pumped tanks
    // for (const tank of tanks_to_pump) {
    //   console.log(`💧 Updating usage for tank ${tank._id}`);

    //   // Find the original tank document to update it
    //   const originalTank = await Tank.findById(tank._id);
    //   if (!originalTank) {
    //     console.log(`⚠️ Tank ${tank._id} not found for update`);
    //     continue;
    //   }

    //   // تأكد أن اليوم ضمن 1 إلى 30 فقط
    //   if (parseInt(today) <= 30) {
    //     if (originalTank.amount_per_month.days[today] !== undefined) {
    //       originalTank.amount_per_month.days[today] += 5;
    //     } else {
    //       originalTank.amount_per_month.days[today] = 5; // Start with 5 liters instead of 22
    //     }
    //     // Mark the nested path as modified so Mongoose knows to save it
    //     originalTank.markModified("amount_per_month.days");
    //   }

    //   await originalTank.save();
    //   updatedTanks.push({
    //     tank_id: tank._id,
    //     daily_usage: originalTank.amount_per_month.days,
    //   });
    // }

    // res.status(200).json({
    //   message: `Successfully pumped water to ${tanks_to_pump.length} tanks`,
    //   pumped_tanks_count: tanks_to_pump.length,
    //   hardware_response: response.data,
    //   main_tank_level: updated_main_tank_response.data,
    //   updated_tanks: updatedTanks,
    // });
    res.status(200).json({ tanks: response.data, main_tank: originalMainTank });
  } catch (e) {
    next(e);
  }
};
