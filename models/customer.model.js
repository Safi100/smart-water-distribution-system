const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    identity_number: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    tanks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tank" }],
    bills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bill" }],
    main_tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tank",
      default: null,
    },
    avatar_url: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
