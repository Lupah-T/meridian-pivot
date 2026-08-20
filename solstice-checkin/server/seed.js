require('dotenv').config();
const mongoose = require('mongoose');
const Attendee = require('./models/Attendee');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solstice';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding');

    await Attendee.deleteMany({});
    console.log('Cleared existing attendees');

    const attendees = [
      { attendeeId: 'ATT001', name: 'Alice Kamau', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT002', name: 'Bob Smith', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT003', name: 'Charlie Davis', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT004', name: 'Diana Prince', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT005', name: 'Evan Wright', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT006', name: 'Fiona Gallagher', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT007', name: 'George Miller', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT008', name: 'Hannah Abbott', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT009', name: 'Ian Malcolm', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT010', name: 'Julia Roberts', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT011', name: 'Kevin Hart', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT012', name: 'Laura Dern', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT013', name: 'Michael Scott', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT014', name: 'Nina Simone', status: 'NOT_CHECKED_IN' },
      { attendeeId: 'ATT015', name: 'Oscar Isaac', status: 'NOT_CHECKED_IN' }
    ];

    await Attendee.insertMany(attendees);
    console.log('Inserted attendees:', attendees.map(a => a.attendeeId).join(', '));

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
