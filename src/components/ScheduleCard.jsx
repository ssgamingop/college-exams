import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, Code, AlertCircle, MapPin, Download, User as PersonIcon } from 'lucide-react';
import { generateICS, downloadICS } from '../utils/icsGenerator';
import tutVideo from '../assets/tut.mp4';

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
            className={`group relative bg-slate-950 text-left backdrop-blur-sm rounded-xl p-5 border border-white/5 ${borderColor} transition-all duration-300 ${shadowColor}`}
        >
            <div className="flex flex-col gap-4">
                {/* Subject Header */}
                <div className="flex flex-col gap-3">
                    <h4 className={`text-lg md:text-xl font-bold text-slate-100 leading-tight group-hover:text-white transition-colors flex-1`}>
                        {exam.subject}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                        {exam.location && exam.location !== 'TBD' && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                                <MapPin size={12} />
                                <span>{exam.location}</span>
                            </div>
                        )}
                        {exam.professor && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                                <PersonIcon size={12} />
                                <span>{exam.professor}</span>
                            </div>
                        )}
                        {/* Panel Display Logic */}
                        {exam.panel && exam.panel !== 'Unknown' && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg} opacity-90`}>
                                <span>
                                    {/* If professor is already shown, just show "Panel X" to avoid redundancy */}
                                    {exam.professor ?
                                        exam.panel.split(' ').slice(0, 2).join(' ') :
                                        exam.panel}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Details */}
                <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-300">
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

    const handleExport = () => {
        const icsContent = generateICS(student);
        downloadICS(`${student.name.replace(/\s+/g, '_')}_Schedule.ics`, icsContent);
    };

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
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-center border border-white/10 shadow-2xl group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px]" />

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExport}
                    className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 rounded-xl transition-colors border border-white/5 backdrop-blur-sm z-20"
                    title="Export to Calendar (.ics)"
                >
                    <Download size={20} />
                </motion.button>

                <div className="relative z-10">
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
                            <p className="text-slate-500 text-sm">Classroom Based</p>
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
                            <p className="text-slate-500 text-sm">Lab & Vivas</p>
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

            {/* Calendar Tutorial Section */}
            <motion.div
                variants={item}
                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="space-y-4 text-center md:text-left max-w-xl">
                        <div className="flex items-center justify-center md:justify-start gap-3 text-cyan-400 mb-2">
                            <Calendar size={24} />
                            <h3 className="text-2xl font-bold text-white">Sync with your Calendar</h3>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            Never miss an exam! Download your schedule and add it directly to your calendar in one click.
                        </p>
                        <ol className="text-sm text-slate-500 space-y-2 list-decimal list-inside bg-slate-950/50 p-4 rounded-xl border border-white/5">
                            <li>Click the <strong>Add to Calendar</strong> button</li>
                            <li>Open the downloaded <code className="text-cyan-400">.ics</code> file</li>
                            <li>Click <strong>Add All</strong> to save to your calendar</li>
                        </ol>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleExport}
                        className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-3 whitespace-nowrap"
                    >
                        <Download className="w-5 h-5 group-hover:animate-bounce" />
                        <span>Add to Calendar</span>
                    </motion.button>
                </div>

                <div className="mt-8 relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video
                        src={tutVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
                </div>

                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
        </motion.div>
    );
};

export default ScheduleCard;
