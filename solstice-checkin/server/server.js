require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectRabbitMQ } = require('./services/rabbitmq');
const checkinRoutes = require('./routes/checkin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/', checkinRoutes);

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solstice';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start database or RabbitMQ:', error);
    // DO NOT process.exit(1) here! We want the server to still listen on PORT
    // so Render's deployment succeeds, allowing the user to set Env Vars later.
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} (Running without DB/RabbitMQ)`);
    });
  }
}

startServer();
