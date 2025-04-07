const Bill = require("../models/bill.model");
const HandleError = require("../utils/HandleError");

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
module.exports.getBillProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id)
      .populate({
        path: "customer",
        select: "-tanks -password -bills",
      })
      .populate({
        path: "tank",
        select: "-amount_per_month -coordinates -owner",
        populate: {
          path: "city",
          select: "name",
        },
      });

    res.status(200).json(bill);
  } catch (e) {
    next(e);
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
module.exports.getMyBillProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (bill.customer.toString() !== req.user.id) {
      throw new HandleError("This is not your bill", 403);
    }
    res.status(200).json(bill);
  } catch (e) {
    next(e);
  }
};
