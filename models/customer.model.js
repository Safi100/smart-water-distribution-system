const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  identity_number: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  tanks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tank' }],
  bills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }],
  // Premium Subscription
  premium: {
    isActive: { type: Boolean, default: false }, // Whether the customer is premium
    expiryDate: { type: Date, default: null }, // When premium expires
    lastPaymentDate: { type: Date, default: null }, // When the last payment was made
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);