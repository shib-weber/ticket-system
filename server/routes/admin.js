const mongoose = require("mongoose");
const Admin = require("../models/admin");
const Booking = require('../models/booking')
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dns = require('dns');
const bcrypt = require('bcryptjs'); 
const axios = require('axios'); 
const json2xls = require('json2xls');
const PDFDocument = require('pdfkit');
const fs = require('fs');


router.use(bodyParser.json());
router.use(cookieParser());
router.use(json2xls.middleware);

function TokenVerify(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('login'); 
    }
    const key = process.env.secret_key || 'hello';

    jwt.verify(token, key, (err, decoded) => {
        if (err) {
            return res.redirect('login'); 
        }
        req.user = decoded;
        next();
    });
}

router.get('/', (req, res) => {
    res.render('main');
});

router.get('/about', (req, res) => {
    res.send("You are in about section of admin");
});

function validateEmailFormat(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateEmailDomain(email) {
    return new Promise((resolve, reject) => {
        const domain = email.split('@')[1];
        dns.resolveMx(domain, (err, addresses) => {
            if (err || addresses.length === 0) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

router.get('/signup', (req, res) => {
    return res.render('signup');
});

router.post('/signup', async (req, res) => {
    const email = req.body.email;

    if (!validateEmailFormat(email)) {
        return res.render('signup', { message: 'Invalid email format' });
    }

    const isValidDomain = await validateEmailDomain(email);
    if (!isValidDomain) {
        return res.render('signup', { message: 'Invalid email domain' });
    }

    const password = req.body.password;
    if (password.length < 8) {
        return res.render('signup', { message: 'Minimum 8 digit password required' });
    }

    const data = req.body;
    const allDbUsers = await Admin.find({});
    const userExists = allDbUsers.find(user => user.email === data.email);

    if (userExists) {
        return res.render('signup', { message: 'User-Email already exists' });
    } else {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10); 

            await Admin.create({
                email: data.email,
                password: hashedPassword 
            });
            return res.render('login', { message: "Try Logging in" });
        } catch (err) {
            return res.render('signup', { message: 'Email already exists' });
        }
    }
});

router.get('/login', (req, res) => {
    return res.render('login');
});

router.post('/login', async (req, res) => {
    const user = await Admin.findOne({ email: req.body.email });

    if (!user) {
        return res.render('login', { message: 'Incorrect Email or Password' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
        return res.render('login', { message: 'Incorrect Email or Password' });
    } else {
        const key = process.env.secret_key || 'hello';
        const token = jwt.sign({ username: user.email, userid: user._id }, key, { expiresIn: '30d' });
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 
        });
        return res.redirect('home');
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('login');
});

router.get('/home', TokenVerify, (req, res) => {
    res.render('home', { name: req.user.username });
});


router.get('/ticket-stats', async (req, res) => {
    try {
        const bookings = await Booking.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    tickets: { $sum: "$tickets" }
                }
            }
        ]);
        res.json(bookings);
    } catch (err) {
        res.status(500).send("Error fetching ticket stats");
    }
});

router.get('/ticket-stats2', async (req, res) => {
    try {
        const bookings = await Booking.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    tickets: { $sum: "$tickets" }
                }
            }
        ]);
        res.json(bookings);
    } catch (err) {
        res.status(500).send("Error fetching ticket stats");
    }
});


router.post('/control-booking', async (req, res) => {
    const { action } = req.body;
    try {
        const response = await axios.post('s/api/bookings', { action });
        res.json({ success: true, message: response.data });
    } catch (err) {
        res.status(500).send("Error controlling ticket booking");
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await Booking.find().sort({ date: 1 }).lean(); // Sort by event date ascending
        const categorizedUsers = {};

        // Categorize by individual event date (day, month, year)
        users.forEach(user => {
            const eventDate = new Date(user.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }); // e.g., "September 17, 2024"

            // Check if the category for this event date exists, otherwise initialize it
            if (!categorizedUsers[formattedDate]) {
                categorizedUsers[formattedDate] = [];
            }

            // Add the user to the relevant event date category
            categorizedUsers[formattedDate].push(user);
        });

        // Sort users within each category by tickets in descending order (most tickets first)
        for (const date in categorizedUsers) {
            categorizedUsers[date].sort((a, b) => b.tickets - a.tickets); // Sort users by tickets
        }

        res.json(categorizedUsers); // Send the categorized and sorted data to the client
    } catch (error) {
        res.status(500).send("Error fetching users");
    }
});



router.get('/download/excel', async (req, res) => {
    try {
        const users = await Booking.find().lean(); // Fetch user data
        res.xls('users.xlsx', users); // Export the data to Excel
    } catch (error) {
        res.status(500).send("Error exporting data to Excel");
    }
});


router.get('/download/pdf', async (req, res) => {
    try {
        const users = await Booking.find().lean(); // Fetch user data
        const doc = new PDFDocument();
        const filePath = 'users.pdf';
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        users.forEach(user => {
            doc.text(`Name: ${user.fname} ${user.lname}, Email: ${user.email}, Tickets: ${user.tickets}`);
            doc.moveDown();
        });

        doc.end();

        stream.on('finish', () => {
            res.download(filePath, err => {
                if (err) {
                    res.status(500).send("Error downloading the PDF");
                } else {
                    fs.unlinkSync(filePath); // Remove the file after download
                }
            });
        });
    } catch (error) {
        res.status(500).send("Error exporting data to PDF");
    }
});

module.exports = router;
