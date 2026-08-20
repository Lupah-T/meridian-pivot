const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Attendee = require('../models/Attendee');
const { publishPrintRequest } = require('../services/rabbitmq');

// POST /api/check-in
router.post('/api/check-in', async (req, res) => {
  try {
    const { attendeeId } = req.body;

    if (!attendeeId) {
      return res.status(400).json({ error: 'attendeeId is required' });
    }

    const attendee = await Attendee.findOne({ attendeeId });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    if (attendee.status === 'CHECKED_IN') {
      return res.status(409).json({ error: 'Attendee is already checked in.' });
    }

    if (attendee.status === 'PRINT_PENDING') {
      return res.status(409).json({ error: 'Attendee is already being checked in.' });
    }

    // Generate unique job ID
    const jobId = `job-${crypto.randomBytes(4).toString('hex')}`;

    attendee.status = 'PRINT_PENDING';
    attendee.printJobId = jobId;
    await attendee.save();

    // Publish to RabbitMQ
    await publishPrintRequest(jobId, attendee.attendeeId, attendee.name);

    res.status(202).json({
      message: 'Badge printing started',
      status: 'PRINT_PENDING',
      jobId
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendees/:attendeeId/status
router.get('/api/attendees/:attendeeId/status', async (req, res) => {
  try {
    const attendee = await Attendee.findOne({ attendeeId: req.params.attendeeId });
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    res.json({
      attendeeId: attendee.attendeeId,
      name: attendee.name,
      status: attendee.status,
      printJobId: attendee.printJobId,
      checkedInAt: attendee.checkedInAt
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /webhooks/print-complete
router.post('/webhooks/print-complete', async (req, res) => {
  try {
    const { jobId, attendeeId, status } = req.body;

    if (!jobId || !attendeeId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const attendee = await Attendee.findOne({ attendeeId });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // STALE WEBHOOK PROTECTION
    if (attendee.printJobId !== jobId) {
      console.log(`[Webhook] Rejected stale webhook. Expected job: ${attendee.printJobId}, got: ${jobId}`);
      return res.status(409).json({ error: 'Stale webhook jobId' });
    }

    if (status === 'PRINTED') {
      attendee.status = 'CHECKED_IN';
      attendee.checkedInAt = new Date();
    } else {
      attendee.status = 'PRINT_FAILED';
    }

    await attendee.save();
    console.log(`[Webhook] Processed successfully for ${attendeeId}. Status: ${attendee.status}`);

    res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
