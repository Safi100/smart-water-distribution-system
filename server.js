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
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// routes
const adminRoute = require("./routes/admin.route");
const customerRoutes = require("./routes/customer.route");

app.use("/api/admin", adminRoute);
app.use("/api/customer", customerRoutes);

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
