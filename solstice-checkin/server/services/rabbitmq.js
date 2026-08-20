const amqp = require('amqplib');

let channel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('print_requests', { durable: true });
    console.log('Connected to RabbitMQ and asserted queue: print_requests');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ', error);
    process.exit(1);
  }
}

async function publishPrintRequest(jobId, attendeeId, name) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const message = {
    jobId,
    attendeeId,
    name
  };

  channel.sendToQueue('print_requests', Buffer.from(JSON.stringify(message)), {
    persistent: true
  });
  console.log(`[RabbitMQ] Published print request for ${attendeeId} with jobId ${jobId}`);
}

module.exports = {
  connectRabbitMQ,
  publishPrintRequest
};
