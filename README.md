<<<<<<< HEAD
# Exam Scheduler 📅

A premium, modern web application for students to view their Theory and Practical exam schedules. Built with React, Vite, and Tailwind CSS.

**Created by [Somyajeet Singh](https://github.com/ssgamingop)**

**Deployed on Vercel [Exam-Scheduler](https://college-exams.vercel.app/)**

## ✨ Features

*   **🔍 Smart Search**: Instantly find schedules by Student Name or Roll Number with a new "Clear" option.
*   **📅 Calendar Sync**: Download your schedule as an `.ics` file and add it to Google/Apple Calendar in one click.
*   **� Copy Roll No**: One-click copy button for your Roll Number with instant visual feedback.
*   **�📍 Detailed Info**: Complete exam details including Location, Panel Number, and **Professor Name** for practicals.
*   **� Adaptive Theme**: Seamlessly switch between a **Cyberpunk Dark Mode** and a clean **Professional Light Mode** with smooth transitions.
*   **⚡ Zero Lag**: Optimized performance with smart component rendering for instant feedback.
*   **📱 Fully Responsive**: Looks amazing on phones, tablets, and desktops.
*   **🛡️ Error Handling**: Gracefully handles missing data with "NA" fallbacks so the UI never breaks.
=======
# 🎓 Exam Finder Pro

A modern, dark-themed exam scheduling platform where students search by name or roll number to instantly view upcoming exams, room assignments, countdown timers, and more — no login required.

Built by **[Sasanka Sekhar Kundu](https://sasankawrites.in)** & **[Somyajeet Singh](https://somyacodes.in)**.

---

## ✨ Features

### For Students
- **Instant Search** — type your name or roll number, get results in real-time with debounced typeahead (300ms)
- **Exam Schedule** — view all exams with subject, date, time, room, and type (theory/practical)
- **Countdown Timer** — live countdown to your next exam (days, hours, minutes, seconds)
- **Download PDF** — export your full exam schedule as a PDF
- **Add to Calendar** — export any exam as an `.ics` calendar event
- **Project Assignments** — see your assigned project/problem statement
- **Dark/Light Theme** — toggle with persistent preference

### For Admins
- **Secure Login** — Supabase email/password auth with role-based access (`admin` role)
- **CSV Upload** — bulk import students, exams, and problem statements via CSV
- **3-Tab Dashboard** — manage Students, Exams, and Problem Statements
- **Paginated Tables** — 15 rows per page with ellipsis navigation
- **Delete Records** — remove individual entries from any table
- **Auto Roll Number Mapping** — exam/project CSVs use `roll_number` which auto-maps to `student_id`

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **Animations** | Framer Motion |
| **CSV Parsing** | PapaParse |
| **PDF Export** | jsPDF |
| **Icons** | Lucide React |
| **Toasts** | Sonner |
| **Date Utils** | date-fns |
| **Testing** | Vitest + Playwright |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── CountdownTimer.tsx    # Live exam countdown
│   ├── ExamCard.tsx          # Exam display card with status badges
│   ├── Footer.tsx            # Site footer
│   ├── NavLink.tsx           # Navigation link wrapper
│   ├── SearchBar.tsx         # Debounced typeahead search
│   ├── ThemeToggle.tsx       # Dark/light mode switch
│   └── ui/                   # 40+ shadcn/ui components
├── hooks/
│   ├── useAuth.tsx           # Auth context (Supabase + admin role check)
│   └── useTheme.tsx          # Theme context with localStorage
├── integrations/
│   └── supabase/
│       ├── client.ts         # Supabase client initialization
│       └── types.ts          # Generated TypeScript types
├── lib/
│   ├── exportUtils.ts        # PDF + ICS export functions
│   └── utils.ts              # Tailwind cn() helper
├── pages/
│   ├── Index.tsx             # Homepage with hero + search
│   ├── StudentResult.tsx     # Student schedule view
│   ├── AdminLogin.tsx        # Admin login form
│   ├── AdminDashboard.tsx    # Admin panel (3 tabs, CSV upload, pagination)
│   ├── Credits.tsx           # Creator credits page
│   ├── PrivacyPolicy.tsx     # Privacy policy
│   ├── TermsAndConditions.tsx # Terms & conditions
│   └── NotFound.tsx          # 404 page
└── App.tsx                   # Router + providers
```

---

## 🗄 Database Schema

The app uses **Supabase PostgreSQL** with Row Level Security (RLS).

### Tables

**`students`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | TEXT | Student name |
| `roll_number` | TEXT | Unique identifier |
| `batch` | TEXT | e.g. "2025-29" |
| `semester` | INTEGER | Current semester |
| `cohort` | TEXT | Cohort name |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**`exams`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `subject` | TEXT | Exam subject |
| `date` | DATE | Exam date |
| `time` | TIME | Exam time |
| `room` | TEXT | Room assignment |
| `type` | TEXT | `theory` or `practical` |
| `professor` | TEXT | Nullable |
| `student_id` | UUID | FK → students (CASCADE) |

**`projects`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `serial_no` | INTEGER | Project number |
| `project_name` | TEXT | Project title |
| `student_id` | UUID | FK → students (CASCADE) |

**`user_roles`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → auth.users |
| `role` | app_role | `admin` or `user` |

### Functions
- `has_role(user_id, role)` — security definer function for RLS policies
- `search_students(search_query)` — ILIKE search on name/roll_number (up to 8 results)

### RLS Policies
- **Public read** on students, exams, and projects
- **Admin-only write** (insert/update/delete) via `has_role()` checks

---
>>>>>>> main

## 🚀 Getting Started

### Prerequisites
<<<<<<< HEAD

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
    *   **Important**: Ensure the filenames match the following or update the paths in `scripts/process_data.cjs`:
        *   Mapping: `Batch25-29__Sem1-Sprint1 - Data.csv`
        *   Theory: `Scheduling Plan - Students  - 25 - 29 (Theory) - Sprint 2.csv`
        *   Practical: `Scheduling Plan - Students  - Batch25-29 (Sprint 2).csv`
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
=======
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```sh
git clone https://github.com/Sasanka14/exam-finder-pro.git
cd exam-finder-pro
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### 3. Database Setup

Run the migration SQL in the **Supabase SQL Editor**:

```sh
# The full schema is at:
supabase/migrations/20260311193039_7c99b0db-b542-4ec6-94ff-393b39983714.sql
```

### 4. Create Admin User

1. Go to Supabase Dashboard → Authentication → Users → **Add User**
2. Create an email/password user
3. Run in SQL Editor:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-uuid-from-step-2>', 'admin');
```

### 5. Start Development Server

```sh
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## 📄 CSV Formats

### Students CSV
```csv
name,roll_number,batch,semester,cohort
John Doe,150096725001,2025-29,2,Larry Page
```

### Exams CSV
```csv
roll_number,subject,date,time,room,type,professor
150096725001,C++,2026-03-18,09:30,Classroom 28,theory,
```

### Problem Statements CSV
```csv
serial_no,project_name,roll_number
1,Library Management System,150096725001
```

---

## 🗺 Routes

| Path | Page | Auth Required |
|------|------|--------------|
| `/` | Homepage with search | No |
| `/student/:id` | Student exam schedule | No |
| `/admin` | Admin login | No |
| `/admin/dashboard` | Admin panel | Yes (admin) |
| `/credits` | Creator credits | No |
| `/privacy-policy` | Privacy policy | No |
| `/terms-and-conditions` | Terms & conditions | No |

---

## 📜 Scripts

```sh
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
```

---

## 🚢 Deployment

Build for production:

```sh
npm run build
```

Deploy the `dist/` folder to any static hosting provider — **Vercel**, **Netlify**, **Cloudflare Pages**, etc.

> Make sure your environment variables are set in your hosting provider's dashboard.

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
>>>>>>> main
