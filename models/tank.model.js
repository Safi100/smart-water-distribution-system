const mongoose = require("mongoose");

const tankSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
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
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true }, // Link tank to a city
    family_members: [
      {
        name: { type: String, required: true },
        dob: { type: Date, required: true }, // Date of Birth
        identity_id: { type: String, required: true, unique: true }, // Unique identity for each member
        gender: {
          type: String,
          enum: ["Male", "Female"],
          required: true,
        },
      },
    ],
    current_level: { type: Number, default: 0, min: 0 }, // Track current water level
    amount_per_month: {
      month: { type: Number, required: true }, // Current month (1-12)
      days: { type: Object, required: true }, // Object with keys as days (1-31) and values as amounts
    },

    coordinates: {
      latitude: { type: Number, required: true }, // Latitude coordinate
      longitude: { type: Number, required: true }, // Longitude coordinate
    },
  },
  { timestamps: true }
);
// Include virtuals in the output
tankSchema.set("toJSON", {
  virtuals: true, // Include virtuals when converting to JSON
});

// Function to generate default monthly data
tankSchema.statics.generateMonthlyData = function () {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // Get current month (1-12)
  const daysInMonth = new Date(now.getFullYear(), currentMonth, 0).getDate();

  let daysObject = {};
  for (let i = 1; i <= daysInMonth; i++) {
    daysObject[i] = 0; // Default value for each day
  }

  return { month: currentMonth, days: daysObject };
};

tankSchema.virtual("monthly_capacity").get(function () {
  const dailyUsage = (member) => {
    const age = Math.floor(
      (Date.now() - new Date(member.dob).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    );

    if (age <= 5) return 50; // Infants & toddlers
    if (age <= 12) return member.gender === "Male" ? 80 : 75; // Children
    if (age <= 17) return member.gender === "Male" ? 120 : 100; // Teenagers
    if (age <= 59) return member.gender === "Male" ? 140 : 110; // Adults
    return member.gender === "Male" ? 120 : 100; // Elderly
  };

  return this.family_members.reduce(
    (total, member) => total + dailyUsage(member) * 30,
    0
  );
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

module.exports = mongoose.model("Tank", tankSchema);
