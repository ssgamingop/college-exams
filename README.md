# Exam Scheduler 📅

A premium, modern web application for students to view their Theory and Practical exam schedules. Built with React, Vite, Tailwind CSS, Express, and MongoDB.

**Created by [Somyajeet Singh](https://github.com/ssgamingop)**

**Deployed on Vercel [Exam-Scheduler](https://college-exams.vercel.app/)**

## ✨ Features

*   **🔒 Secure Admin Sync**: Sync student data dynamically from the UI by uploading raw CSV files. Fully protected via backend password authentication.
*   **🔍 Smart Search**: Instantly find schedules by Student Name or Roll Number with a lightning-fast MongoDB index engine.
*   **📅 Calendar Sync**: Download your schedule as an `.ics` file and add it to Google/Apple Calendar in one click.
*   **📋 Copy Roll No**: One-click copy button for your Roll Number with instant visual feedback.
*   **📍 Detailed Info**: Complete exam details including Location, Panel Number, and Professor Name for practicals.
*   **🎨 Premium Glassmorphism UI**: High-fidelity dynamic blur effects, animations, and typography designed for a premium user experience.
*   **🌗 Adaptive Theme**: Seamlessly switch between a Cyberpunk Dark Mode and a clean Professional Light Mode.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v16 or higher)
*   npm (v7 or higher)
*   A MongoDB Database (Local or MongoDB Atlas)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone git@github.com:ssgamingop/college-exams.git
    cd exam-scheduler
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    In the `server/` directory, create a `.env` file (you can copy `.env.example`):
    ```env
    PORT=5001
    MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/exam_scheduler?retryWrites=true&w=majority
    ADMIN_PASSWORD=admin123
    NODE_ENV=development
    ```

4.  **Run the application**:
    ```bash
    npm run dev
    ```
    This single command starts both:
    *   **Vite React Frontend**: on `http://localhost:5173`
    *   **Express API Server**: on `http://localhost:5001`
    
    *Note: The frontend is configured to proxy all `/api` requests to the Express server automatically in development.*

## 🗄️ Database Syncing (The Admin UI)

This application parses data entirely in-memory directly in the browser and pushes the synchronized dataset to MongoDB, completely bypassing manual Node scripts!

1. Open the application at `http://localhost:5173`.
2. Click the **Cyan Database Icon** in the top-right header to open the Admin Modal.
3. Drag and drop your three CSV sheets:
   * **Mapping CSV** (Roll No ↔ Name)
   * **Theory CSV** (Theory Dates & Location)
   * **Practical CSV** (Practical Lab Viva Slots)
4. Enter your `ADMIN_PASSWORD` (defaults to `admin123`).
5. Click **Sync Database** to dynamically clear the old cloud database and populate the new schedules!

---

## 📦 Deployment

### Deploying the Full-Stack Application
Since the backend Express server is configured to serve the React production build (`dist/`) automatically, the entire application can be deployed to a single host (such as Render, Heroku, or Railway):

1.  Add your `MONGODB_URI` and `ADMIN_PASSWORD` database connection strings in your hosting provider's environment variables.
2.  Set `NODE_ENV=production`.
3.  Set the start command to:
    ```bash
    npm run build && node server/server.cjs
    ```

---

## 💻 Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Atlas), Mongoose
*   **Security**: Serverless-compliant memory streaming, Admin Payload Authentication

---

*Thanks me Later* 😉
