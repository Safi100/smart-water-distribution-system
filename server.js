const express = require("express");
const env = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const http = require("http");
const socket = require("./Socket");

const app = express();
const server = http.createServer(app);

const io = socket.init(server);

// MongoDB
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Middleware
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// Routes
const indexRoute = require("./routes/index.route");
const adminRoute = require("./routes/admin.route");
const customerRoutes = require("./routes/customer.route");
const CityRoute = require("./routes/city.route");
const TankRoute = require("./routes/tank.route");
const BillRoute = require("./routes/bill.route");

app.use("/api", indexRoute);
app.use("/api/admin", adminRoute);
app.use("/api/customer", customerRoutes);
app.use("/api/city", CityRoute);
app.use("/api/tank", TankRoute);
app.use("/api/bill", BillRoute);

// Error Handler
app.use((err, req, res, next) => {
  if (!err.message) err.message = "Internal Server Error";
  const { statusCode = 500 } = err;
  console.log(err.message);
  res.status(statusCode).json(err.message);
});

// Cron Keep-alive
const axios = require("axios");
cron.schedule("*/5 * * * *", async () => {
  await axios
    .get(process.env.SERVER_ALIVE_ENDPOINT)
    .then(() => console.log("Data fetched from external API"))
    .catch((error) => console.error("Error fetching data from external API"));
});

// Models
const Tank = require("./models/tank.model");
const Bill = require("./models/bill.model");
const Customer = require("./models/customer.model");
const { sendNotification } = require("./utils/Notification");

const sendNotificationWithSocket = async (message, userId) => {
  const notification = await sendNotification(message, userId);
  socket.getIO().emit("new_notification", { userId, notification });
};

const calculateTankUsage = (tank) => {
  if (!tank.amount_per_month || !tank.amount_per_month.days) return 0;
  return Object.values(tank.amount_per_month.days).reduce(
    (sum, dayUsage) => sum + (dayUsage || 0),
    0
  );
};

const generateBillForTank = async (tank) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const billMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const billYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    if (!tank.amount_per_month || !tank.amount_per_month.days) {
      console.log(`⚠️ Tank ${tank._id} has no usage data for billing`);
      return null;
    }

    const totalUsage = calculateTankUsage(tank);
    if (totalUsage <= 0) {
      console.log(
        `📊 Tank ${tank._id} has no usage (0 liters), no bill needed`
      );
      return null;
    }

    const bill = new Bill({
      customer: tank.owner,
      tank: tank._id,
      amount: totalUsage,
      year: billYear,
      month: billMonth,
    });

    await sendNotificationWithSocket(
      `Your tank ${tank._id} usage for ${billMonth}/${billYear} is ${totalUsage} liters`,
      tank.owner
    );

    await bill.save();

    const customer = await Customer.findById(tank.owner);
    if (customer) {
      customer.bills.push(bill._id);
      await customer.save();
    }

    console.log(
      `💰 Bill generated for tank ${tank._id} with usage: ${totalUsage} liters for ${billMonth}/${billYear}`
    );
    return bill;
  } catch (error) {
    console.error(`❌ Error generating bill for tank ${tank._id}:`, error);
    return null;
  }
};

const resetMonthlyAmount = async () => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const allTanks = await Tank.find().populate("owner");

    for (const tank of allTanks) {
      if (
        !tank.amount_per_month ||
        tank.amount_per_month.month !== currentMonth
      ) {
        if (tank.amount_per_month && tank.amount_per_month.days) {
          const totalUsage = calculateTankUsage(tank);
          if (totalUsage > 0) {
            await generateBillForTank(tank);
            console.log(
              `📊 Tank ${tank._id} had usage of ${totalUsage} liters, bill generated`
            );
          } else {
            console.log(
              `📊 Tank ${tank._id} had no usage (0 liters), no bill generated`
            );
          }
        }

        tank.amount_per_month = Tank.generateMonthlyData();
        await tank.save();
        console.log(
          `✔ Monthly reset done for tank ${tank._id} (all days set to 0)`
        );
      } else {
        console.log(
          `✔ Tank ${tank._id} already updated for month ${currentMonth}, skipping reset.`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error resetting monthly water amount:", error);
  }
};

cron.schedule(
  "0 */2 * * *",
  async () => {
    console.log("🔄 Checking if monthly reset is needed...");
    await resetMonthlyAmount();
  },
  { scheduled: true, timezone: "UTC" }
);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
