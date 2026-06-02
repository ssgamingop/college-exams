import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Instagram, Sun, Moon, Database, Activity, Users, Calendar, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import Search from './components/Search';
import ScheduleCard from './components/ScheduleCard';
import AdminModal from './components/AdminModal';
import { getStudentCount } from './utils/api';

function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [dbStatus, setDbStatus] = useState('connecting'); // connecting | online | offline
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const count = await getStudentCount();
        setStudentCount(count);
        setDbStatus('online');
      } catch (err) {
        console.error('Failed to fetch database stats:', err);
        setDbStatus('offline');
      }
    }
    fetchStats();
  }, [selectedStudent]); // re-fetch when student is cleared (e.g. after sync success)

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-[#070b14] text-slate-800 dark:text-slate-200 font-sans selection:bg-cyan-500/30 transition-colors duration-500">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4 flex justify-between items-center bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 transition-colors duration-500"
      >
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Created by <a href="https://somyacodes.in" target="_blank" rel="noopener noreferrer" className="text-cyan-500 font-bold hover:underline">Somyajeet Singh</a>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAdminOpen(true)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
            title="Admin: Sync Database"
          >
            <Database size={20} className="text-cyan-500" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <a href="https://github.com/ssgamingop" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">
            <Github size={20} />
          </a>
          <a href="https://instagram.com/somyajeet.op" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-pink-500 transition-colors">
            <Instagram size={20} />
          </a>
        </div>
      </motion.header>

      {/* Subtle Background */}
      < div className="fixed inset-0 overflow-hidden pointer-events-none" >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[128px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -30, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-blue-500/5 dark:bg-indigo-500/5 rounded-full blur-[128px]"
        />
      </div >

      <div className="relative z-10 container mx-auto px-4 pt-32 pb-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-slate-900 dark:text-white transition-colors duration-500">
            Exam Scheduler
          </h1>
          <p className="text-slate-400 text-lg">
            Multi-Batch • Semester Exam Schedules
          </p>
        </motion.div>

        <Search
          onSelectStudent={setSelectedStudent}
        />

        <div className="mt-12">
          <ScheduleCard
            key={selectedStudent ? selectedStudent.rollNo : 'empty'}
            student={selectedStudent}
          />
        </div>

        {!selectedStudent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16 bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-2xl relative overflow-hidden transition-colors duration-500"
          >
            {/* Header info */}
            <div className="flex items-center gap-3 justify-center mb-8">
              <Activity className="text-cyan-500 w-5 h-5 animate-pulse" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors uppercase">
                System Status & Info
              </h3>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                <Database className="text-cyan-500 w-6 h-6 mb-2" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Database Status</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 justify-center">
                  <span className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'connecting' ? 'bg-amber-500 animate-spin' : 'bg-rose-500'}`} />
                  {dbStatus === 'online' ? 'Connected' : dbStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                <Users className="text-purple-500 w-6 h-6 mb-2" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Schedules</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {studentCount} Students
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                <Calendar className="text-pink-500 w-6 h-6 mb-2" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Batches</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  2023-27 • 2024-28 • 2025-29
                </span>
              </div>
            </div>

            {/* Quick guide */}
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-5 border border-slate-200/60 dark:border-white/5 transition-colors">
              <div className="flex gap-3 text-left">
                <HelpCircle className="text-cyan-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-slate-700 dark:text-slate-300">How to use</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Use the search box above to type your Name or Roll Number, and select it from the suggestions to view your theory & practical viva slot timings.</p>
                </div>
              </div>
              <div className="flex gap-3 text-left">
                <CheckCircle2 className="text-purple-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Calendar Integration</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Export your personalized exam timings directly to your Google or Apple Calendar using the calendar export button.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSyncSuccess={() => {
          setSelectedStudent(null);
        }}
      />
      <Analytics />
    </div >
  );
}

export default App;
