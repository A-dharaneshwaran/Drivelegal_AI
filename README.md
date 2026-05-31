# 🛣️ DriveLegal AI — Smart Travel & Road Safety Platform

DriveLegal is an intelligent, full-stack MERN-based web application engineered to consolidate map routing with road safety diagnostics and modern legal compliance. By combining interactive maps with AI-driven compliance advisors, real-time document OCR scanners, and automated reminder engines, the platform makes travel legally compliant, safe, and educational for families.

---

## 🚀 Tech Stack

### Frontend Tier
* **Core:** React.js (built on Vite for lightning-fast HMR)
* **Styling & Motion:** Tailwind CSS v4 with custom Glassmorphism and Framer Motion animations
* **Mapping:** Leaflet & React Leaflet for interactive path mapping and accident hotspot visualization
* **Data Visualization:** Recharts for driver compliance score progress and telemetry analytics
* **Routing:** Axios for client-server API orchestration

### Backend API Tier
* **Server Framework:** Node.js with Express.js REST API Architecture
* **Database & ODM:** MongoDB Atlas utilizing Mongoose with custom schema validation indexes
* **Security & Sanitization:** Helmet headers, NoSQL query injection sanitization, standard & resource-specific rate-limiters
* **Authentication:** Stateful JSON Web Token (JWT) with bcrypt password hashing
* **Scheduler Daemon:** Node-Cron executing background checks and notification sweeps

### Intelligent Services
* **AI Engine:** Google Gemini API (cascading fallback from `gemini-2.5-flash` to `gemini-2.5-pro`)
* **OCR Service:** Jimp-enhanced image preprocessing feeding into a self-terminating Tesseract.js WASM worker thread

---

## 🛠️ Key Features

* **Intelligent Route Planning:** Visualizes routes on a dark-inverted custom map container, overlaying real-time hazard markers and generating a safety score out of 100.
* **AI-Powered OCR Fine Hub:** Drag-and-drop traffic challans (images or PDFs), run server-side OCR, refine extracted fields with Gemini AI, and save to a compound unique index database.
* **Compliance Timeline Feed:** Chronological visualization of uploaded documents, document expiration warnings, ticket dates, and payments.
* **Driver Learning Center:** Gamified portal featuring regional rules by state, educational road signal flashcards, and a kid-safe Gemini explain mode.
* **Deduplicated Alarm Sweeper:** Node-cron background daemon that sweeps the database hourly to dispatch alerts at specific due date offset intervals.

---

## 📁 Repository Structure

```
Drivelegal_AI/
├── client/                 # React.js Frontend Portal (Vite)
│   ├── public/             # Static page assets & favicons
│   ├── src/
│   │   ├── assets/         # App images (hero, graphics)
│   │   ├── components/     # Navbar, Chatbot, ProtectedRoute, etc.
│   │   ├── pages/          # Dashboard, DocumentVault, Fines, etc.
│   │   ├── index.css       # Tailwind v4 import & custom glass styles
│   │   └── main.jsx        # Vite mount compiler
│   └── vite.config.js      # Bundler configurations
│
└── server/                 # Express.js Backend Server
    ├── controllers/        # MVC request routing logic
    ├── middleware/         # Security gates, auth checks, file limiters
    ├── models/             # Database Mongoose Schemas
    ├── routes/             # API routes
    ├── services/           # Gemini API wrappers & OCR pipelines
    ├── utils/              # seeder functions & regex parsing helpers
    ├── server.js           # Server bootstrap entry point
    └── .env.example        # Local development environment template
```

---

## 🔧 Installation & Local Setup

### Prerequisite Accounts & API Keys
To run the full suite, you will need:
1. **MongoDB Atlas Account:** To spin up a free database cluster.
2. **Google AI Studio Key:** Access to Gemini models.
3. **OpenRouteService Token:** Map routing services.

---

### Step 1 — Backend Configuration

1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to create your own configuration file:
   ```bash
   cp .env.example .env
   ```
4. Open the newly created `.env` file and replace the placeholder values with your credentials:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/drivelegal
   JWT_SECRET=your_jwt_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   OPENROUTESERVICE_API_KEY=your_openrouteservice_api_key
   ```
5. Start the backend development server:
   ```bash
   node server.js
   ```

---

### Step 2 — Frontend Configuration

1. Open a new terminal and navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Launch the application in your browser at [http://localhost:5173](http://localhost:5173).

---

## 🌍 Deployment

### Frontend (Vercel)
1. Push your repository to GitHub.
2. Link your Vercel account to the repo and add a new project.
3. Set the **Root Directory** to `client`.
4. Configure framework preset to `Vite`.
5. Run Build: `npm run build` (outputs to `dist`).
6. Click **Deploy**.

### Backend (Render)
1. Register on Render and create a new **Web Service**.
2. Select your GitHub repository.
3. Set the **Root Directory** to `server`.
4. Build Command: `npm install`.
5. Start Command: `node server.js`.
6. Inject all Environment Variables defined in `.env`.
7. Click **Create Web Service**.

---

## 👨‍💻 Developer Information

* **Developer:** Dharaneshwaran
* **Role:** Full Stack AI Engineer
* **GitHub Profile:** [A-dharaneshwaran](https://github.com/A-dharaneshwaran)
* **LinkedIn:** [Connect on LinkedIn](https://www.linkedin.com/in/dharaneshwarana)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
