const Bill = require("../models/bill.model");

module.exports.getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().populate({
      path: "customer",
      select: "identity_number name email phone",
    });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bills", error });
  }
};
module.exports.getMyBills = async (req, res) => {
  try {
    const bills = await Bill.find({ customer: req.user.id });
    res.status(200).json(bills);
  } catch (e) {
    next(e);
  }
};
