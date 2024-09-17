const connectDB = require('./configs/db');
const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const dotenv = require('dotenv');
const bookingRoutes = require('./routes/booking');
const adminRoute = require('./routes/admin');
const cors = require("cors");
const path = require("path")

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(express.static(path.join(__dirname, './public')))
app.use(cors());

// Routes
app.use('/api/bookings', bookingRoutes);
app.set('io', io);
app.use('/api/admin',adminRoute)

app.get('/', (req, res) => {
    res.send('Hello, World!');
});


app.set('view engine','ejs')
app.set('views', path.resolve('./views'))

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});