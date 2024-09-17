// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    dob: { type: Date, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: Date, required: true }, // Event date
    tickets: { type: Number, required: true },
    discountCode: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;