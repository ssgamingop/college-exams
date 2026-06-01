import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, CheckCircle, AlertTriangle, Database, Sparkles, RefreshCw, Lock, Link as LinkIcon, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import { uploadAndSyncCsv, verifyPassword, getSyncConfig, syncGoogleSheets } from '../utils/api';

const AdminModal = ({ isOpen, onClose, onSyncSuccess }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('sheets'); // 'sheets' | 'manual'
  
  // Google Sheets states
  const [sheetUrls, setSheetUrls] = useState({
    mapping: '',
    theory: '',
    practical: ''
  });
  const [useAi, setUseAi] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasServerApiKey, setHasServerApiKey] = useState(false);

  // Manual file upload states
  const [files, setFiles] = useState({
    mapping: null,
    theory: null,
    practical: null
  });

  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [seededCount, setSeededCount] = useState(0);

  const fileInputRefs = {
    mapping: useRef(null),
    theory: useRef(null),
    practical: useRef(null)
  };

  // Check session storage on mount / open
  useEffect(() => {
    if (isOpen) {
      const savedPass = sessionStorage.getItem('adminPassword');
      if (savedPass) {
        setPassword(savedPass);
        handleUnlock(savedPass);
      } else {
        setIsAuthenticated(false);
        setStatus('idle');
      }
    }
  }, [isOpen]);

  const handleUnlock = async (passToVerify) => {
    const checkPass = passToVerify || password;
    if (!checkPass) {
      setErrorMsg('Please enter the administrator authorization password.');
      return;
    }

    try {
      setStatus('loading');
      setStatusMsg('Authorizing session...');
      setErrorMsg('');

      await verifyPassword(checkPass);
      
      // Save password in session storage
      sessionStorage.setItem('adminPassword', checkPass);
      setPassword(checkPass);
      setIsAuthenticated(true);
      
      // Load current configurations
      await loadConfig();
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify the admin password.');
      setStatus('idle');
      sessionStorage.removeItem('adminPassword');
      setIsAuthenticated(false);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await getSyncConfig();
      setSheetUrls({
        mapping: config.mappingUrl || '',
        theory: config.theoryUrl || '',
        practical: config.practicalUrl || ''
      });
      setUseAi(!!config.useAi);
      setHasServerApiKey(!!config.hasApiKey);
      
      // Restore locally saved Gemini API key if present
      const savedKey = localStorage.getItem('geminiApiKey');
      if (savedKey) setGeminiApiKey(savedKey);
    } catch (err) {
      console.error('Failed to load sync configurations:', err);
    }
  };

  const handleFileChange = (type, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Invalid file type. Please upload a .csv file.');
      return;
    }
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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!files.mapping || !files.theory || !files.practical) {
      setErrorMsg('Please select all three CSV files.');
      return;
    }

    try {
      setStatus('loading');
      setStatusMsg('Ingesting files and database records...');
      setErrorMsg('');

      const [mappingText, theoryText, practicalText] = await Promise.all([
        readFileText(files.mapping),
        readFileText(files.theory),
        readFileText(files.practical)
      ]);

      const result = await uploadAndSyncCsv(mappingText, theoryText, practicalText, password);
      setSeededCount(result.count);
      setStatus('success');
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Manual CSV sync failed.');
      setStatus('error');
    }
  };

  const handleSheetsSubmit = async (e) => {
    e.preventDefault();
    if (!sheetUrls.mapping || !sheetUrls.theory || !sheetUrls.practical) {
      setErrorMsg('Please enter Google Sheet URLs for all three categories.');
      return;
    }

    try {
      setStatus('loading');
      setStatusMsg(useAi ? 'AI-Assisted parsing & syncing... (Consulting Gemini)' : 'Downloading & processing Google Sheets data...');
      setErrorMsg('');

      // Save API key locally if user entered one
      if (geminiApiKey.trim()) {
        localStorage.setItem('geminiApiKey', geminiApiKey.trim());
      } else {
        localStorage.removeItem('geminiApiKey');
      }

      const result = await syncGoogleSheets(
        sheetUrls.mapping,
        sheetUrls.theory,
        sheetUrls.practical,
        useAi,
        geminiApiKey.trim() || null,
        password
      );

      setSeededCount(result.count);
      setStatus('success');
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Google Sheets sync failed.');
      setStatus('error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    setIsAuthenticated(false);
    setPassword('');
    setErrorMsg('');
  };

  const handleReset = () => {
    setFiles({ mapping: null, theory: null, practical: null });
    setStatus('idle');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (status === 'loading') return;
    setErrorMsg('');
    setStatus('idle');
    onClose();
  };

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 z-10 text-left"
          >
            <button
              onClick={handleClose}
              disabled={status === 'loading'}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors border border-slate-200 dark:border-white/5"
            >
              <X size={18} />
            </button>

            <div className="mt-2 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Database className="text-cyan-500" size={22} />
                  <span>Update Scheduler Database</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage the college schedules stored in MongoDB.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* 1. PASSWORD AUTHENTICATION SCREEN */}
                {!isAuthenticated ? (
                  <motion.form
                    key="auth-gate"
                    onSubmit={(e) => { e.preventDefault(); handleUnlock(); }}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex flex-col gap-2 p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl text-center items-center justify-center">
                      <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-500 mb-2">
                        <Lock size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Session Authorization Required</h4>
                      <p className="text-xs text-slate-500 max-w-xs">Provide your admin password to view options and sync schedules.</p>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter authorization password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 focus:outline-none text-sm text-slate-800 dark:text-white transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      {status === 'loading' ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                      <span>Unlock Dashboard</span>
                    </button>
                  </motion.form>
                ) : status === 'loading' ? (
                  /* 2. LOADING STATE */
                  <motion.div
                    key="loading-indicator"
                    className="min-h-[250px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                    <h4 className="text-md font-bold text-slate-800 dark:text-white mb-2">
                      {statusMsg}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Updating your databases. Please do not close this window or navigate away.
                    </p>
                  </motion.div>
                ) : status === 'success' ? (
                  /* 3. SUCCESS STATE */
                  <motion.div
                    key="success-screen"
                    className="min-h-[250px] flex flex-col items-center justify-center text-center p-8 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <CheckCircle className="w-14 h-14 text-emerald-500 mb-3 animate-bounce" />
                    <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Synchronization Complete!
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-xs mb-5">
                      Successfully parsed and updated <span className="text-cyan-500 font-extrabold">{seededCount}</span> student schedules in MongoDB!
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all border border-slate-200 dark:border-white/5"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
                      >
                        Finish
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* 4. UNLOCKED PANEL */
                  <motion.div
                    key="admin-unlocked"
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Navigation Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('sheets'); setErrorMsg(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          activeTab === 'sheets' 
                            ? 'bg-white dark:bg-slate-950 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/50 dark:border-white/5' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <LinkIcon size={14} />
                        <span>Google Sheets Sync</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('manual'); setErrorMsg(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          activeTab === 'manual' 
                            ? 'bg-white dark:bg-slate-950 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/50 dark:border-white/5' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <UploadCloud size={14} />
                        <span>Manual CSV Upload</span>
                      </button>
                    </div>

                    {/* Tab Panels */}
                    {activeTab === 'sheets' ? (
                      /* GOOGLE SHEETS FORM */
                      <form onSubmit={handleSheetsSubmit} className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mapping Sheet URL</label>
                            <input
                              type="url"
                              required
                              placeholder="https://docs.google.com/spreadsheets/d/...edit#gid=0"
                              value={sheetUrls.mapping}
                              onChange={(e) => setSheetUrls(prev => ({ ...prev, mapping: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-800 dark:text-white transition-all"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Theory Schedule Sheet URL</label>
                            <input
                              type="url"
                              required
                              placeholder="https://docs.google.com/spreadsheets/d/...edit#gid=123"
                              value={sheetUrls.theory}
                              onChange={(e) => setSheetUrls(prev => ({ ...prev, theory: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-800 dark:text-white transition-all"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Practical Schedule Sheet URL</label>
                            <input
                              type="url"
                              required
                              placeholder="https://docs.google.com/spreadsheets/d/...edit#gid=456"
                              value={sheetUrls.practical}
                              onChange={(e) => setSheetUrls(prev => ({ ...prev, practical: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-800 dark:text-white transition-all"
                            />
                          </div>

                          {/* AI Ingestion Settings */}
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Sparkles size={14} className="text-cyan-500" />
                                  <span>AI-Assisted Self-Healing Parsing</span>
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Let Gemini parse if column names or table layouts change.</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(e) => setUseAi(e.target.checked)}
                                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer border-slate-300 dark:border-slate-800"
                              />
                            </div>

                            {useAi && (
                              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5 relative">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <span>Gemini API Key</span>
                                    {hasServerApiKey && <span className="text-[9px] text-emerald-500 normal-case font-normal">(Server API key configured)</span>}
                                  </label>
                                </div>
                                <div className="relative">
                                  <input
                                    type={showApiKey ? "text" : "password"}
                                    placeholder={hasServerApiKey ? "Using server environment key..." : "Paste your GEMINI_API_KEY here..."}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-800 dark:text-white transition-all font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                  >
                                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2.5 bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/10 rounded-xl p-3 text-[10px] text-cyan-700 dark:text-cyan-400">
                            <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                            <span><strong>Note:</strong> Google Sheets must be set to <strong>"Anyone with the link can view"</strong> for direct fetching to work.</span>
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all border border-slate-200 dark:border-white/5"
                          >
                            Lock
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw size={14} />
                            <span>Fetch & Sync Sheets</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* MANUAL CSV UPLOAD */
                      <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div className="space-y-3">
                          {renderFileInput('mapping', 'Mapping File', 'Upload Roll No ↔ Name mapping (.csv)')}
                          {renderFileInput('theory', 'Theory Schedule', 'Upload theory dates & locations (.csv)')}
                          {renderFileInput('practical', 'Practical Schedule', 'Upload lab viva slots (.csv)')}
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all border border-slate-200 dark:border-white/5"
                          >
                            Lock
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw size={14} />
                            <span>Sync Files</span>
                          </button>
                        </div>
                      </form>
                    )}
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
