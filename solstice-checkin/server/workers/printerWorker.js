const amqp = require('amqplib');
const axios = require('axios');
require('dotenv').config({ path: '../.env' }); // Adjust relative path based on how it's run

async function startWorker() {
  try {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    // Automatically detect Render's live URL, otherwise fallback to local/env
    const webhookUrl = process.env.RENDER_EXTERNAL_URL 
      ? `${process.env.RENDER_EXTERNAL_URL}/webhooks/print-complete`
      : (process.env.WEBHOOK_URL || 'http://localhost:5000/webhooks/print-complete');

    console.log(`[Printer Worker] Connecting to RabbitMQ at ${rabbitUrl}...`);
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();
    
    await channel.assertQueue('print_requests', { durable: true });
    
    console.log('[Printer Worker] Waiting for messages in print_requests queue...');

    channel.consume('print_requests', async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`[Printer Worker] Received print request:`, content);
          
          // Simulate printer hardware delay (6 seconds as requested)
          await new Promise(resolve => setTimeout(resolve, 6000));
          
          console.log(`[Printer Worker] Printing completed for ${content.attendeeId}. Sending webhook to ${webhookUrl}...`);
          
          // Send webhook
          await axios.post(webhookUrl, {
            jobId: content.jobId,
            attendeeId: content.attendeeId,
            status: 'PRINTED'
          });
          
          console.log(`[Printer Worker] Webhook sent successfully for ${content.jobId}`);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('[Printer Worker] Error processing message:', error.message);
          if (error.response) {
            console.error('[Printer Worker] Webhook failed with response:', error.response.data);
          }
          // We'll ack so it doesn't block forever if backend is down.
          channel.ack(msg); 
        }
      }
    });

  } catch (error) {
    console.error('[Printer Worker] Failed to start:', error);
    process.exit(1);
  }
}

startWorker();
