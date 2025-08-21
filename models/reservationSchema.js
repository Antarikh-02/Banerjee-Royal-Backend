// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true, trim: true },
  guests: { type: Number, required: true, min: 1 },
  specialRequest: { type: String, trim: true },
  status: { type: String, enum: ['Pending','Confirmed','Cancelled'], default: 'Pending' }
}, { timestamps: true });

// Prevent duplicate phone+date+timeSlot unless status === 'Cancelled'
reservationSchema.index(
  { phone: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'Cancelled' } } }
);

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
