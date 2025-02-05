const express = require('express');
const env = require('dotenv').config();
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

mongoose.connect(process.env.DATABASE)
.then(() => console.log('Connected to MongoDB'))
 .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// routes
const customerRoutes = require('./routes/customer.route');

app.use('/api/customer', customerRoutes);

app.use((err, req, res, next) => {
    if(!err.message) err.message = 'Internal Server Error'
    const {statusCode = 500 } = err
    console.log(err.message);
    res.status(statusCode).json(err.message)
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})