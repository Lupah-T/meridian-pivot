const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  attendeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['NOT_CHECKED_IN', 'PRINT_PENDING', 'CHECKED_IN', 'PRINT_FAILED'],
    default: 'NOT_CHECKED_IN'
  },
  printJobId: {
    type: String,
    default: null
  },
  checkedInAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Attendee', attendeeSchema);
