# Exam Scheduler 📅

A premium, modern web application for students to view their Theory and Practical exam schedules. Built with React, Vite, and Tailwind CSS.

**Created by [Somyajeet Singh](https://github.com/ssgamingop)**

**Deployed on Vercel [Exam-Scheduler](https://college-exams.vercel.app/)**

## ✨ Features

*   **🔍 Smart Search**: Instantly find schedules by Student Name or Roll Number.
*   **🎨 Premium UI**: Dark mode aesthetic with neon accents, glassmorphism, and smooth animations.
*   **📱 Fully Responsive**: Optimized for both desktop and mobile devices.
*   **⚡ Fast Performance**: Powered by Vite for lightning-fast load times.
*   **📊 Comprehensive Data**: Displays both Theory and Practical exam details side-by-side.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v16 or higher)
*   npm (v7 or higher)

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

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the URL shown (usually `http://localhost:5173`).

## 🛠️ Data Processing

The application uses a static JSON file (`src/data/exam_data.json`) generated from CSV files.

**To update the data:**

1.  Place your new CSV files in the `csv_data/` directory.
2.  Run the processing script:
    ```bash
    node scripts/process_data.cjs
    ```
3.  The app will automatically reflect the changes.

## 📦 Deployment

### Deploy to Vercel

1.  Push your latest changes to GitHub:
    ```bash
    git add .
    git commit -m "Update app"
    git push origin main
    ```
2.  Go to [Vercel](https://vercel.com) and import your repository.
3.  Vercel will automatically detect the settings (Framework: Vite).
4.  Click **Deploy**.

## 💻 Tech Stack

*   **Frontend**: React, Vite
*   **Styling**: Tailwind CSS, PostCSS
*   **Animations**: Framer Motion
*   **Icons**: Lucide React

---

*Thanks me Later* 😉
