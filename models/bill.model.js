const mongoose = require("mongoose");

const billSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tank",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
  },
  { timestamps: true }
);

const pricePerLiter = 0.0055;

billSchema.virtual("price").get(function () {
  return this.amount * pricePerLiter;
});

billSchema.set("toJSON", { virtuals: true });
billSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Bill", billSchema);
