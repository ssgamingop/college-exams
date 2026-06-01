import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, CheckCircle, AlertTriangle, Database, Sparkles, RefreshCw, Lock } from 'lucide-react';
import { uploadAndSyncCsv } from '../utils/api';

const AdminModal = ({ isOpen, onClose, onSyncSuccess }) => {
  const [files, setFiles] = useState({
    mapping: null,
    theory: null,
    practical: null
  });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | parsing | syncing | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [seededCount, setSeededCount] = useState(0);

  const fileInputRefs = {
    mapping: useRef(null),
    theory: useRef(null),
    practical: useRef(null)
  };

  const handleFileChange = (type, file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Invalid file type. Please upload a .csv file.');
      return;
    }

    // 5MB limit to prevent browser memory/payload issues
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File ${file.name} exceeds the 5MB limit.`);
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));
    setErrorMsg('');
  };

  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.mapping || !files.theory || !files.practical) {
      setErrorMsg('Please select all three CSV files to synchronize the database.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter the administrator password.');
      return;
    }

    try {
      setStatus('parsing');
      setErrorMsg('');

      // Read all files as text in parallel
      const [mappingText, theoryText, practicalText] = await Promise.all([
        readFileText(files.mapping),
        readFileText(files.theory),
        readFileText(files.practical)
      ]);

      setStatus('syncing');

      // Upload and sync via API including password
      const result = await uploadAndSyncCsv(mappingText, theoryText, practicalText, password);

      setSeededCount(result.count);
      setStatus('success');
      
      // Notify parent to refresh states if needed
      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while uploading and parsing the files.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setFiles({ mapping: null, theory: null, practical: null });
    setPassword('');
    setStatus('idle');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (status === 'syncing' || status === 'parsing') return;
    setFiles({ mapping: null, theory: null, practical: null });
    setPassword('');
    setErrorMsg('');
    setStatus('idle');
    onClose();
  };

  // Helper to render file input fields
  const renderFileInput = (type, label, description) => {
    const isSelected = !!files[type];
    return (
      <div 
        onClick={() => fileInputRefs[type].current.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(type, e.dataTransfer.files[0]);
          }
        }}
        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
          isSelected 
            ? 'border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10' 
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            {isSelected ? <CheckCircle size={18} /> : <UploadCloud size={18} />}
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h4>
            <p className="text-xs text-slate-500">{isSelected ? files[type].name : description}</p>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRefs[type]}
          onChange={(e) => handleFileChange(type, e.target.files[0])}
          accept=".csv"
          className="hidden"
        />
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          {isSelected ? 'Change' : 'Upload'}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 z-10 text-left"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={status === 'syncing' || status === 'parsing'}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors border border-slate-200 dark:border-white/5"
            >
              <X size={18} />
            </button>

            {/* Modal Content */}
            <div className="mt-2 space-y-6">
              {/* Header Title */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  Update Schedule Data
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload CSV files to securely sync your MongoDB cluster.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {status === 'idle' || status === 'error' ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {errorMsg && (
                      <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {renderFileInput(
                        'mapping',
                        'Mapping File',
                        'Upload Roll No ↔ Name mapping (.csv)'
                      )}
                      {renderFileInput(
                        'theory',
                        'Theory Schedule',
                        'Upload theory dates & locations (.csv)'
                      )}
                      {renderFileInput(
                        'practical',
                        'Practical Schedule',
                        'Upload lab viva slots (.csv)'
                      )}
                    </div>

                    {/* Admin Password Input */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock size={14} className="text-cyan-500" />
                        <span>Admin Authorization Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Enter admin authorization password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 dark:focus:border-cyan-500/30 focus:outline-none text-sm text-slate-800 dark:text-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all border border-slate-200 dark:border-white/5 text-center text-sm shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                      >
                        <RefreshCw size={16} />
                        <span>Sync Database</span>
                      </button>
                    </div>
                  </motion.form>
                ) : status === 'parsing' || status === 'syncing' ? (
                  <motion.div
                    key="loading"
                    className="min-h-[220px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <RefreshCw className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                      {status === 'parsing' ? 'Reading CSV Files...' : 'Updating MongoDB...'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {status === 'parsing'
                        ? 'Converting table inputs to JSON collections directly in your browser.'
                        : 'Verifying auth password and writing new student records to your database.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    className="min-h-[220px] flex flex-col items-center justify-center text-center p-8 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <CheckCircle className="w-14 h-14 text-emerald-500 mb-4 animate-bounce" />
                    <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                      Database Synced Successfully!
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium max-w-xs mb-6">
                      Successfully processed and seeded <span className="text-cyan-500 font-extrabold">{seededCount}</span> student schedules into your database!
                    </p>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
                    >
                      Upload More
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;
