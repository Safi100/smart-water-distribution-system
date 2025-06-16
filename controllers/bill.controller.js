const Bill = require("../models/bill.model");
const HandleError = require("../utils/HandleError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports.getAllBills = async (req, res, next) => {
  try {
    const { status, customerId } = req.query;
    let query = {};
    if (status != "All") {
      query.status = status;
    }
    if (customerId) {
      query.customer = customerId;
    }
    const bills = await Bill.find(query)
      .populate({
        path: "customer",
        select: "identity_number name email phone",
      })
      .populate({
        path: "tank",
        populate: {
          path: "city",
          select: "name",
        },
      });
    res.status(200).json(bills);
  } catch (e) {
    next(e);
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
    if (!bill) {
      throw new HandleError("Bill not found", 404);
    }
    if (bill.customer.toString() !== req.user.id) {
      throw new HandleError("This is not your bill", 403);
    }
    res.status(200).json(bill);
  } catch (e) {
    console.log(e);

    next(e);
  }
};
module.exports.payBill = async (req, res, next) => {
  try {
    const { id } = req.params; // bill ID
    const bill = await Bill.findById(id);

    if (!bill) {
      throw new HandleError("Bill not found", 404);
    }

    // Check ownership
    if (bill.customer.toString() !== req.user.id) {
      throw new HandleError("You are not authorized to pay this bill", 403);
    }

    // Assume bill has a `totalAmount` field
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bill.total_price * 100), // convert to cents
      currency: "ils",
      metadata: {
        billId: bill._id.toString(),
        customerId: req.user.id,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    next(e);
  }
};
module.exports.payBillByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);

    if (!bill) {
      throw new HandleError("Bill not found", 404);
    }

    // Assume bill has a `totalAmount` field
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bill.total_price * 100), // convert to cents
      currency: "ils",
      metadata: {
        billId: bill._id.toString(),
        customerId: req.user.id,
      },
    });
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    next(e);
  }
};
module.exports.successPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByIdAndUpdate(
      id,
      { status: "Paid" },
      { new: true }
    )
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
