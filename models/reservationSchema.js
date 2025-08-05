// models/Reservation.js

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const reservationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        date: { type: Date, required: true },
        timeSlot: { type: String, required: true, trim: true },
        guests: {type: Number, required: true, min: 1},
        specialRequest: {type: String, trim: true},
        status: {type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending'}
    },
    {
        timestamps: true
    }
);

// Prevent the same phone+date+timeSlot from booking twice (unless cancelled)
reservationSchema.index(
    { phone: 1, date: 1, timeSlot: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: 'Cancelled' } } }
);


module.exports = mongoose.model('Reservation', reservationSchema);
