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

billSchema.virtual("fees").get(function () {
  return 5;
});

billSchema.virtual("price_for_letters").get(function () {
  return (
    this.amount * pricePerLiter +
    (this.fees / 100) * (this.amount * pricePerLiter)
  );
});
billSchema.virtual("total_price").get(function () {
  return this.price_for_letters + this.price_for_letters * (this.fees / 100);
});

billSchema.set("toJSON", { virtuals: true });
billSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Bill", billSchema);
