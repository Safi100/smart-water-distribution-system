const mongoose = require("mongoose");

const citySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    tanks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tank",
      },
    ],
  },
  { timestamps: true }
);

// Export the City model
module.exports = mongoose.model("City", citySchema);
