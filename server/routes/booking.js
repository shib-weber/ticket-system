const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const io = require('socket.io-client'); // Ensure Socket.IO is properly configured

router.get('/', (req, res) => {
  res.render('clientf');
});

// POST: Create a new booking
router.post('/', async (req, res) => {
  const { fname, lname, dob, email, phone, address, date, tickets, discountCode } = req.body;

  try {
    const newBooking = await Booking.create({
      fname,
      lname,
      dob,
      email,
      phone,
      address,
      date,
      tickets,
      discountCode,
    });

    // Emit updated stats
    const io = req.app.get('io');
    io.emit('update-ticket-stats', await Booking.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          tickets: { $sum: "$tickets" }
        }
      }
    ]));

    io.emit('update-ticket-stats2', await Booking.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          tickets: { $sum: "$tickets" }
        }
      }
    ]));

    res.status(201).json({ message: 'Booking successful!' });
  } catch (error) {
    console.error('Error while saving booking:', error);
    res.status(400).json({ message: 'Error while saving booking', error });
  }
});

module.exports = router;
