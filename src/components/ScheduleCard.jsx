import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, Code, AlertCircle } from 'lucide-react';

const ScheduleCard = ({ student }) => {
    if (!student) return null;

    const theoryExams = student.theory;
    const practicalExams = student.practical;

    const container = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full space-y-8"
        >
            {/* Student Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 md:p-8 text-center border border-white/10 shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                    {student.name}
                </h2>
                <p className="text-cyan-400 font-mono text-lg md:text-xl tracking-wider">{student.rollNo}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Theory Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Theory Exams</h3>
                    </div>

                    <div className="space-y-4">
                        {theoryExams.length === 0 ? (
                            <div className="bg-slate-900/50 rounded-2xl p-8 border border-white/5 text-center text-slate-500">
                                <AlertCircle className="mx-auto mb-3 opacity-50 w-12 h-12" />
                                <p>No theory exams scheduled.</p>
                            </div>
                        ) : (
                            theoryExams.map((exam, idx) => (
                                <motion.div
                                    key={idx}
                                    variants={item}
                                    className="group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                                >
                                    <div className="absolute left-0 top-6 w-1 h-12 bg-purple-500 rounded-r-full opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <div className="ml-4">
                                        <h4 className="text-xl font-semibold text-slate-100 mb-3 group-hover:text-purple-300 transition-colors">
                                            {exam.subject}
                                        </h4>
                                        <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm font-medium text-slate-400">
                                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                                                <Calendar size={16} className="text-purple-400" />
                                                {exam.date}
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                                                <Clock size={16} className="text-purple-400" />
                                                {exam.time}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Practical Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                            <Code size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Practical Exams</h3>
                    </div>

                    <div className="space-y-4">
                        {practicalExams.length === 0 ? (
                            <div className="bg-slate-900/50 rounded-2xl p-8 border border-white/5 text-center text-slate-500">
                                <AlertCircle className="mx-auto mb-3 opacity-50 w-12 h-12" />
                                <p>No practical exams scheduled.</p>
                            </div>
                        ) : (
                            practicalExams.map((exam, idx) => (
                                <motion.div
                                    key={idx}
                                    variants={item}
                                    className="group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                                >
                                    <div className="absolute left-0 top-6 w-1 h-12 bg-cyan-500 rounded-r-full opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <div className="ml-4">
                                        <h4 className="text-xl font-semibold text-slate-100 mb-3 group-hover:text-cyan-300 transition-colors">
                                            {exam.subject}
                                        </h4>
                                        <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm font-medium text-slate-400">
                                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                                                <Calendar size={16} className="text-cyan-400" />
                                                {exam.date}
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                                                <Clock size={16} className="text-cyan-400" />
                                                {exam.time}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ScheduleCard;
