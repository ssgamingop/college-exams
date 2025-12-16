import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, Code, AlertCircle, MapPin } from 'lucide-react';

const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
};

const ExamItem = ({ exam, type }) => {
    const isTheory = type === 'theory';
    const accentColor = isTheory ? 'text-purple-400' : 'text-cyan-400';
    const borderColor = isTheory ? 'group-hover:border-purple-500/50' : 'group-hover:border-cyan-500/50';
    const shadowColor = isTheory ? 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]';
    const badgeBg = isTheory ? 'bg-purple-400/10 text-purple-300 border-purple-400/20' : 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20';

    return (
        <motion.div
            variants={item}
            className={`group relative bg-slate-900/80 backdrop-blur-sm rounded-xl p-5 border border-white/5 ${borderColor} transition-all duration-300 ${shadowColor}`}
        >
            <div className="flex flex-col gap-4">
                {/* Subject Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <h4 className={`text-lg md:text-xl font-bold text-slate-100 leading-tight group-hover:text-white transition-colors flex-1`}>
                        {exam.subject}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {exam.location && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                                <MapPin size={12} />
                                <span>{exam.location}</span>
                            </div>
                        )}
                        {exam.panel && exam.panel !== 'Unknown' && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                                <span>{exam.panel}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Details */}
                <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-400">
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                        <Calendar size={14} className={accentColor} />
                        {exam.date || 'NA'}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock size={14} className={accentColor} />
                        {exam.time || 'NA'}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

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

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full space-y-8"
        >
            {/* Student Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-center border border-white/10 shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px]" />
                <div className="relative">
                    <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-3 tracking-tight">
                        {student.name}
                    </h2>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-white/10 text-cyan-400 font-mono text-lg md:text-xl tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        {student.rollNo}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Theory Section */}
                <div className="flex flex-col h-full bg-slate-900/20 rounded-3xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Theory</h3>
                            <p className="text-slate-500 text-sm">Pen Paper</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {theoryExams.length === 0 ? (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center bg-slate-900/40 rounded-2xl p-8 border border-white/5 border-dashed text-center text-slate-500">
                                <AlertCircle className="mb-3 opacity-50 w-12 h-12" />
                                <p>No theory exams scheduled.</p>
                            </div>
                        ) : (
                            theoryExams.map((exam, idx) => (
                                <ExamItem key={idx} exam={exam} type="theory" />
                            ))
                        )}
                    </div>
                </div>

                {/* Practical Section */}
                <div className="flex flex-col h-full bg-slate-900/20 rounded-3xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                            <Code size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Practical</h3>
                            <p className="text-slate-500 text-sm">Project & Vivas</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {practicalExams.length === 0 ? (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center bg-slate-900/40 rounded-2xl p-8 border border-white/5 border-dashed text-center text-slate-500">
                                <AlertCircle className="mb-3 opacity-50 w-12 h-12" />
                                <p>No practical exams scheduled.</p>
                            </div>
                        ) : (
                            practicalExams.map((exam, idx) => (
                                <ExamItem key={idx} exam={exam} type="practical" />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ScheduleCard;
