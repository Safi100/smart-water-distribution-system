const Bill = require("../models/bill.model");

function calculateWaterUsage(tank) {
  const dailyUsage = tank.amount_per_month?.days || {};
  const totalUsed = Object.values(dailyUsage).reduce(
    (sum, val) => sum + val,
    0
  );

  return totalUsed;
}

async function CountOfBillsNotPaid(tankId) {
  const bills = await Bill.find({ tank: tankId, status: "Unpaid" });
  console.log(bills.length);

  return bills.length;
}

module.exports = { calculateWaterUsage, CountOfBillsNotPaid };
