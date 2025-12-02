import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Instagram } from 'lucide-react';
import Search from './components/Search';
import ScheduleCard from './components/ScheduleCard';
import examData from './data/exam_data.json';

function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5"
      >
        <div className="text-sm font-medium text-slate-400">
          Created by <span className="text-cyan-400 font-bold">Somyajeet Singh</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/ssgamingop" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
            <Github size={20} />
          </a>
          <a href="https://instagram.com/somyajeet.op" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors">
            <Instagram size={20} />
          </a>
        </div>
      </motion.header>

      {/* Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-[128px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -30, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[128px]"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-white">
            Exam Scheduler
          </h1>
          <p className="text-slate-400 text-lg">
            Batch 25-29 • Semester 1
          </p>
        </motion.div>

        <Search
          students={examData}
          onSelectStudent={setSelectedStudent}
        />

        <div className="mt-12">
          <ScheduleCard student={selectedStudent} />
        </div>

        {!selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-24 text-slate-600 text-sm"
          >
            <p>Search for your name or roll number to view your schedule.</p>
            <p className="mt-4 text-cyan-400 font-medium text-lg tracking-wide">Thanks me Later</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;
