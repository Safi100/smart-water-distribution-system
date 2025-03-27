const express = require("express");
const env = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

const app = express();

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// routes
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

app.use((err, req, res, next) => {
  if (!err.message) err.message = "Internal Server Error";
  const { statusCode = 500 } = err;
  console.log(err.message);
  res.status(statusCode).json(err.message);
});

const axios = require("axios");

cron.schedule("*/5 * * * *", async () => {
  await axios
    .get("https://smart-water-distribution-system.onrender.com/")
    .then((response) => {
      console.log("Data fetched from external API");
    })
    .catch((error) => {
      console.error("Error fetching data from external API");
    });
});

const Tank = require("./models/tank.model");

const resetMonthlyAmount = async () => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Fetch all tanks
    const allTanks = await Tank.find();

    for (const tank of allTanks) {
      // Check if the stored month is different from the current month
      if (
        !tank.amount_per_month ||
        tank.amount_per_month.month !== currentMonth
      ) {
        tank.amount_per_month = Tank.generateMonthlyData(); // Generate new data
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

// Run every minute to check and reset if needed
cron.schedule(
  "0 */2 * * *",
  async () => {
    console.log("🔄 Checking if monthly reset is needed...");
    await resetMonthlyAmount();
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
