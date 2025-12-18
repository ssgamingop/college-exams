import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Search = ({ students, onSelectStudent }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (query.length > 1) {
            const filtered = students.filter(student =>
                student.name.toLowerCase().includes(query.toLowerCase()) ||
                student.rollNo.includes(query)
            );
            setSuggestions(filtered.slice(0, 5));
        } else {
            setSuggestions([]);
        }
    }, [query, students]);

    const handleSelect = (student) => {
        setQuery(student.name);
        setSuggestions([]);
        onSelectStudent(student);
    };

    return (
        <div className="relative w-full max-w-lg mx-auto z-50">
            <div className={`relative flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-300 ${isFocused ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <SearchIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 ml-4 transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder="Search by Name or Roll No..."
                    className="w-full bg-transparent text-slate-900 dark:text-white text-base px-4 py-4 outline-none placeholder-slate-500 dark:placeholder-slate-500 transition-colors"
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
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto z-50"
                    >
                        {suggestions.map((student) => (
                            <div
                                key={student.rollNo}
                                onClick={() => handleSelect(student)}
                                className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-700/50 last:border-none group"
                            >
                                <div className="text-slate-700 dark:text-slate-200 font-medium group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{student.name}</div>
                                <div className="text-xs text-slate-500">{student.rollNo}</div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Search;
