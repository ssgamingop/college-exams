import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudentByRoll, getSearchIndex } from '../utils/api';

const Search = ({ onSelectStudent }) => {
    const [query, setQuery] = useState('');
    const [searchIndex, setSearchIndex] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isIndexing, setIsIndexing] = useState(true);

    // Fetch lightweight search index on mount
    useEffect(() => {
        let active = true;
        const loadIndex = async () => {
            try {
                const index = await getSearchIndex();
                if (active) {
                    setSearchIndex(index);
                }
            } catch (err) {
                console.error('Failed to load search index:', err);
            } finally {
                if (active) {
                    setIsIndexing(false);
                }
            }
        };
        loadIndex();
        return () => {
            active = false;
        };
    }, []);

    // Filter suggestions instantaneously on query change
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const normalizedQuery = query.trim().toLowerCase();
        const filtered = searchIndex.filter(student => 
            (student.name && student.name.toLowerCase().includes(normalizedQuery)) ||
            (student.rollNo && student.rollNo.toLowerCase().includes(normalizedQuery))
        ).slice(0, 10);

        setSuggestions(filtered);
    }, [query, searchIndex]);

    const handleSelect = async (student) => {
        setQuery(student.name);
        setSuggestions([]);
        setIsLoading(true);
        try {
            const fullStudent = await getStudentByRoll(student.rollNo);
            if (fullStudent) {
                onSelectStudent(fullStudent);
            }
        } catch (err) {
            console.error('Failed to fetch full student details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-lg mx-auto z-50">
            <div className={`relative flex items-center bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${isFocused ? 'ring-2 ring-cyan-500/20 border-cyan-500/50 shadow-cyan-500/10' : 'hover:border-slate-300 dark:hover:border-white/20'}`}>
                {isLoading ? (
                    <Loader2 className="w-5 h-5 text-cyan-500 ml-4 animate-spin" />
                ) : (
                    <SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-4 transition-colors" />
                )}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder="Search by Name or Roll No..."
                    className="w-full bg-transparent text-slate-900 dark:text-white text-base px-4 py-4 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setSuggestions([]);
                            onSelectStudent(null);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-2"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {suggestions.length > 0 && isFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
                    >
                        {suggestions.map((student) => (
                            <div
                                key={student.rollNo}
                                onClick={() => handleSelect(student)}
                                className="px-5 py-3.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-colors border-b border-slate-200/50 dark:border-white/5 last:border-none group"
                            >
                                <div className="flex justify-between items-center gap-2">
                                    <div className="text-slate-700 dark:text-slate-200 font-bold group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{student.name}</div>
                                    {student.batch && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800/50 flex-shrink-0">
                                            {student.batch}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono tracking-wide">{student.rollNo}</div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Search;
