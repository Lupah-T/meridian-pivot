# Solstice Events Co. - Check-In Kiosk (MVP)

This project is a minimal viable product (MVP) for the Solstice Events Co. badge printing check-in kiosk. It demonstrates an asynchronous architecture (the "Pivot") using RabbitMQ to decouple the check-in request from the actual printing process.

## Technology Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Message Broker:** RabbitMQ
- **Styling:** Vanilla CSS (Modern, Glassmorphism, Dark mode)

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- npm or yarn

## Setup Instructions

1. **Start Infrastructure (MongoDB & RabbitMQ)**
   ```bash
   docker-compose up -d
   ```
   Wait a few seconds for RabbitMQ and MongoDB to be fully ready.

2. **Setup Server**
   ```bash
   cd server
   npm install
   cp .env.example .env
   
   # Seed the database with test attendees (ATT001 through ATT015)
   npm run seed
   
   # Start the Express server (Terminal 1)
   npm run dev
   
   # Start the Printer Worker Simulator (Terminal 2)
   npm run worker
   ```

3. **Setup Client**
   ```bash
   cd client
   npm install
   
   # Start the React development server (Terminal 3)
   npm run dev
   ```

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`.

## Test Scenarios

### Test 1: Successful Check-In
1. Enter `ATT001` and click **CHECK IN**.
2. Notice the UI transitions to **"Printing badge... Please wait."**
3. Watch the `printerWorker` logs in the terminal; after ~2.5 seconds, it will send a webhook to the backend.
4. The UI will automatically poll the status and change to **"✓ CHECKED IN"**.

### Test 2: Duplicate Scan (Already Checked In)
1. Enter `ATT001` again after the previous successful check-in.
2. The UI will immediately show **"Already Checked In: This attendee has already received a badge."**
3. No duplicate badge is printed.

### Test 3: Duplicate Scan (While Printing)
1. Enter `ATT002` and click **CHECK IN**.
2. While it says "Printing badge...", open another tab or quickly try to check in `ATT002` again via API/Postman. (Or simulate a quick double-click if possible, though the button is disabled to prevent accidental clicks).
3. Using curl while it's pending: 
   ```bash
   curl -X POST http://localhost:5000/api/check-in -H "Content-Type: application/json" -d '{"attendeeId":"ATT002"}'
   ```
4. You will receive a `409 Conflict` response with the message: `"Attendee is already being checked in."`

### Test 4: Stale Webhook Protection
1. Enter `ATT003` and click **CHECK IN**.
2. Immediately manually trigger a stale webhook using curl with an incorrect/old `jobId`:
   ```bash
   curl -X POST http://localhost:5000/webhooks/print-complete \
   -H "Content-Type: application/json" \
   -d '{"jobId":"job-old123", "attendeeId":"ATT003", "status":"PRINTED"}'
   ```
3. Look at the Express server logs. You will see:
   `[Webhook] Rejected stale webhook. Expected job: job-XXXXX, got: job-old123`
4. The attendee's state remains unaffected, and the system waits for the correct `jobId` from the actual printer worker.

## Architecture Flow

1. **Staff Scans QR** -> Frontend sends POST request to `/api/check-in`.
2. **Backend creates Job** -> Sets attendee status to `PRINT_PENDING`, generates a `jobId`, and pushes it to RabbitMQ. Returns 202 Accepted.
3. **Frontend Polls** -> UI polls `/api/attendees/:id/status` every 1.5 seconds.
4. **Printer Worker Consumes** -> Worker reads from RabbitMQ queue, simulates a 2.5s print delay, and fires a POST to `/webhooks/print-complete`.
5. **Webhook Updates DB** -> Validates `jobId` to ensure it's not stale, then sets status to `CHECKED_IN`.
6. **Frontend Notified** -> The polling detects `CHECKED_IN` and updates the UI.

## Cloud Deployment (Render & Vercel)

This repository is fully configured for a free-tier deployment using **Render** (Backend) and **Vercel** (Frontend).

### 1. Backend (Render)
We run both the Express API and the Printer Worker on a single Render Web Service to stay within the free tier.

1. Create a free **CloudAMQP** (Little Lemur) instance for your managed RabbitMQ.
2. In your Render Dashboard, select **New > Blueprint**.
3. Connect your GitHub repository.
4. When prompted, ensure the **Blueprint Path** is set to `solstice-checkin/render.yaml`.
5. Enter your `MONGODB_URI` (Atlas) and `RABBITMQ_URL` (CloudAMQP).
6. Render will deploy the API and Worker concurrently. Copy your public Render API URL.

### 2. Frontend (Vercel)
1. In your Vercel Dashboard, select **Add New > Project** and import the repository.
2. Under "Root Directory", click Edit and choose **`client`** (Important!).
3. Under "Environment Variables", add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-render-api-url.onrender.com/api` (Use the URL generated from Render).
4. Deploy the frontend! The `vercel.json` will automatically handle routing.
