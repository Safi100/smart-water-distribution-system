const mongoose = require("mongoose");

const tankSchema = new mongoose.Schema(
  {
    radius: {
      type: Number,
      required: true,
      min: 1,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
    },
    current_level: { type: Number, default: 0, min: 0 }, // Track current water level
    hardware: {
      ultrasonic_sensor_echo: {
        type: Number,
        required: true,
      },
      ultrasonic_sensor_trig: {
        type: Number,
        required: true,
      },
    },
  },
  { timestamps: true }
);
// Include virtuals in the output
tankSchema.set("toJSON", {
  virtuals: true, // Include virtuals when converting to JSON
});

tankSchema.virtual("max_capacity").get(function () {
  // Volume in cubic centimeters
  const volumeInCubicCentimeters =
    Math.PI * Math.pow(this.radius, 2) * this.height;

  // Convert cm³ -> liters
  const volumeInLiters = volumeInCubicCentimeters / 1000;

  // Round to 2 decimal places and convert string to number
  return parseFloat(volumeInLiters.toFixed(2));
});

module.exports = mongoose.model("MainTank", tankSchema);
