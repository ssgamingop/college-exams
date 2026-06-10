const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const Student = require('./models/Student.cjs');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_scheduler';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '1h'; // 1 hour session tokens

// --- Security Middleware ---

// Helmet sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA compatibility (inline scripts from Vite)
  crossOriginEmbedderPolicy: false
}));

// Configure CORS — restrictive in production, open in development
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: process.env.NODE_ENV === 'production' && allowedOrigins.length > 0
    ? allowedOrigins
    : true, // Allow all origins in development
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// --- Rate Limiting ---

// General API rate limiter
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const rateLimitMaxRequests = 150;
const ipRequestCounts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now > data.resetTime) {
      ipRequestCounts.delete(ip);
    }
  }
}, rateLimitWindowMs);

const apiRateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, {
      count: 1,
      resetTime: now + rateLimitWindowMs
    });
    return next();
  }
  
  const limitData = ipRequestCounts.get(ip);
  if (now > limitData.resetTime) {
    limitData.count = 1;
    limitData.resetTime = now + rateLimitWindowMs;
    return next();
  }
  
  limitData.count++;
  if (limitData.count > rateLimitMaxRequests) {
    return res.status(429).json({ 
      error: 'Too Many Requests', 
      details: 'You have exceeded the request limit. Please try again after 15 minutes.' 
    });
  }
  next();
};

// Brute-Force Protection for Admin password attempts
const loginAttempts = new Map();
const adminUploadRateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (loginAttempts.has(ip)) {
    const data = loginAttempts.get(ip);
    if (now < data.lockoutResetTime) {
      const remainingTime = Math.ceil((data.lockoutResetTime - now) / 1000);
      return res.status(429).json({
        error: 'Too Many Password Attempts',
        details: `This IP has been temporarily locked out due to excessive password attempts. Please try again in ${remainingTime} seconds.`
      });
    } else if (now >= data.lockoutResetTime && data.attempts >= 5) {
      loginAttempts.delete(ip);
    }
  }
  next();
};

app.use('/api/', apiRateLimiter);

// --- Security Helpers ---

/**
 * Timing-safe password comparison using HMAC to normalize lengths.
 * Prevents timing attacks that could leak password characters.
 */
function safeComparePassword(input, secret) {
  if (typeof input !== 'string' || typeof secret !== 'string') return false;
  const inputHash = crypto.createHmac('sha256', 'exam-scheduler-compare').update(input.trim()).digest();
  const secretHash = crypto.createHmac('sha256', 'exam-scheduler-compare').update(secret).digest();
  return crypto.timingSafeEqual(inputHash, secretHash);
}

/**
 * Records a failed login attempt for the given IP.
 */
function recordFailedAttempt(ip) {
  const now = Date.now();
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { attempts: 1, lockoutResetTime: 0 });
  } else {
    const data = loginAttempts.get(ip);
    data.attempts++;
    if (data.attempts >= 5) {
      data.lockoutResetTime = now + 15 * 60 * 1000; // 15 mins lockout
    }
  }
  const attemptsLeft = loginAttempts.has(ip) ? Math.max(0, 5 - loginAttempts.get(ip).attempts) : 5;
  return attemptsLeft;
}

/**
 * JWT Authentication Middleware.
 * Validates the Bearer token from the Authorization header.
 * Protects admin-only endpoints.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', details: 'Authentication token is required. Please log in via the admin panel.' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server Configuration Error', details: 'JWT_SECRET is not configured on the server.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminSession = decoded; // Attach decoded payload to request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session Expired', details: 'Your admin session has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Forbidden', details: 'Invalid or tampered authentication token.' });
  }
};

// --- Database Connection ---

const connectDB = async (req, res, next) => {
  if (mongoose.connection.readyState >= 1) {
    return next();
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Successfully connected to MongoDB (Serverless).');
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).json({ error: 'Database Connection Failed', details: err.message });
  }
};

app.use(connectDB);

// ============================================================
// PUBLIC API ROUTES (No authentication required)
// ============================================================

// Get search index of all students (lightweight)
app.get('/api/students/search-index', async (req, res) => {
  try {
    const students = await Student.find({}, 'name rollNo batch').lean();
    res.json(students);
  } catch (error) {
    console.error('Error getting search index:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Search students (by name or roll number)
app.get('/api/students/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = q.trim();
    // Escape regex special characters
    const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const students = await Student.find({
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { rollNo: { $regex: escapedQuery, $options: 'i' } }
      ]
    }).limit(10);

    res.json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message || error.toString() });
  }
});

// Get student schedule by roll number
app.get('/api/students/roll/:rollNo', async (req, res) => {
  try {
    const { rollNo } = req.params;
    if (!rollNo || typeof rollNo !== 'string') {
      return res.status(400).json({ error: 'Roll number must be a valid string' });
    }

    const student = await Student.findOne({ rollNo: String(rollNo) });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get student count
app.get('/api/students/count', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error getting student count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================
// ADMIN API ROUTES (Authentication required)
// ============================================================

// Import helper parser utilities
const { getCsvUrl, fetchCsvText, parseCsvData } = require('./utils/parser.cjs');

// 1. Verify Admin password and issue JWT session token
app.post('/api/students/verify-password', adminUploadRateLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: 'Server Configuration Error: Admin authorization password is not configured on the server.' });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Server Configuration Error: JWT_SECRET is not configured on the server.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!safeComparePassword(password, adminPassword)) {
      const attemptsLeft = recordFailedAttempt(ip);
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid Admin Password',
        details: attemptsLeft > 0 
          ? `Incorrect password. ${attemptsLeft} attempts remaining before lockout.` 
          : 'Too many incorrect attempts. Locked out for 15 minutes.'
      });
    }

    // Password correct — clear failed attempts and issue JWT
    loginAttempts.delete(ip);

    const token = jwt.sign(
      { role: 'admin', iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ 
      success: true, 
      message: 'Authenticated successfully.',
      token
    });
  } catch (error) {
    console.error('Error verifying admin password:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// 2. Get Saved Sync Configuration (PROTECTED)
app.get('/api/students/sync-config', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    let config = {
      batches: {
        '2023-27': { mappingUrl: '', theoryUrl: '', practicalUrl: '' },
        '2024-28': { mappingUrl: '', theoryUrl: '', practicalUrl: '' },
        '2025-29': { mappingUrl: '', theoryUrl: '', practicalUrl: '' }
      },
      useAi: false
    };

    if (fs.existsSync(configPath)) {
      try {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(rawData);
        
        // Migrate old format if necessary
        if (parsed.mappingUrl !== undefined && !parsed.batches) {
          config.batches['2025-29'] = {
            mappingUrl: parsed.mappingUrl || '',
            theoryUrl: parsed.theoryUrl || '',
            practicalUrl: parsed.practicalUrl || ''
          };
          config.useAi = !!parsed.useAi;
        } else {
          config = { ...config, ...parsed };
        }
      } catch (err) {
        console.error('Error reading config.json:', err);
      }
    }
    const hasApiKey = !!process.env.GROQ_API_KEY;
    res.json({ ...config, hasApiKey });
  } catch (error) {
    console.error('Error reading sync config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Seed Database endpoint (PROTECTED)
app.post('/api/students/seed', authenticateToken, async (req, res) => {
  try {
    const jsonPath = path.normalize(path.join(__dirname, '../src/data/exam_data.json'));
    const allowedBase = path.normalize(path.join(__dirname, '..'));
    if (!jsonPath.startsWith(allowedBase)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: 'JSON data file not found at src/data/exam_data.json' });
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const examData = JSON.parse(rawData);

    await Student.deleteMany({});
    const inserted = await Student.insertMany(examData);
    
    res.json({ 
      success: true, 
      message: `Database successfully seeded with ${inserted.length} students.` 
    });
  } catch (error) {
    console.error('Error seeding database via API:', error);
    res.status(500).json({ error: 'Seeding failed', details: error.message });
  }
});

// 4. Sync database from Google Sheets for a specific batch (PROTECTED)
app.post('/api/students/sync-sheets', authenticateToken, async (req, res) => {
  try {
    const { batch, mappingUrl, theoryUrl, practicalUrl, useAi, groqApiKey } = req.body;
    
    if (!batch || typeof batch !== 'string') {
      return res.status(400).json({ error: 'Batch identifier must be a valid string.' });
    }

    if (!theoryUrl || !practicalUrl) {
      return res.status(400).json({ error: 'Theory and Practical Google Sheets URLs are required.' });
    }

    // Convert to exportable URLs
    const mappingExport = mappingUrl ? getCsvUrl(mappingUrl) : '';
    const theoryExport = getCsvUrl(theoryUrl);
    const practicalExport = getCsvUrl(practicalUrl);

    console.log(`Fetching Google Sheets CSV data for batch ${batch}...`);
    const [mappingCsv, theoryCsv, practicalCsv] = await Promise.all([
      mappingExport ? fetchCsvText(mappingExport) : Promise.resolve(''),
      fetchCsvText(theoryExport),
      fetchCsvText(practicalExport)
    ]);

    // Use environment variable key if not passed from UI
    const finalApiKey = groqApiKey || process.env.GROQ_API_KEY;

    // Parse the fetched CSV content
    const studentsData = await parseCsvData(mappingCsv, theoryCsv, practicalCsv, {
      batch,
      useAi: !!useAi,
      groqApiKey: finalApiKey
    });

    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({ error: 'Parsed student records list is empty. Check your sheets layout.' });
    }

    // Update MongoDB: delete only this batch's students, and insert new ones
    await Student.deleteMany({ batch });
    const inserted = await Student.insertMany(studentsData);

    // Save sync config locally
    const configPath = path.join(__dirname, 'config.json');
    let currentConfig = {
      batches: {
        '2023-27': { mappingUrl: '', theoryUrl: '', practicalUrl: '' },
        '2024-28': { mappingUrl: '', theoryUrl: '', practicalUrl: '' },
        '2025-29': { mappingUrl: '', theoryUrl: '', practicalUrl: '' }
      },
      useAi: false
    };

    if (fs.existsSync(configPath)) {
      try {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(rawData);
        if (parsed.mappingUrl !== undefined && !parsed.batches) {
          currentConfig.batches['2025-29'] = {
            mappingUrl: parsed.mappingUrl || '',
            theoryUrl: parsed.theoryUrl || '',
            practicalUrl: parsed.practicalUrl || ''
          };
          currentConfig.useAi = !!parsed.useAi;
        } else {
          currentConfig = { ...currentConfig, ...parsed };
        }
      } catch (err) {}
    }

    // Update current batch config
    currentConfig.batches[batch] = { mappingUrl, theoryUrl, practicalUrl };
    currentConfig.useAi = !!useAi;
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));

    res.json({
      success: true,
      message: `Database successfully synced with ${inserted.length} students from Google Sheets for batch ${batch}!`,
      count: inserted.length
    });
  } catch (error) {
    console.error('Error syncing Google Sheets:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// 5. Upload and Parse CSV data (Manual File Ingestion) (PROTECTED)
app.post('/api/students/upload-csv', authenticateToken, async (req, res) => {
  try {
    const { batch, mappingCsv, theoryCsv, practicalCsv } = req.body;
    
    if (!batch || typeof batch !== 'string') {
      return res.status(400).json({ error: 'Batch identifier must be a valid string.' });
    }

    if (!theoryCsv || !practicalCsv) {
      return res.status(400).json({ error: 'Theory and Practical CSV contents are required.' });
    }

    const studentsData = await parseCsvData(mappingCsv || '', theoryCsv, practicalCsv, { batch, useAi: false });
    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({ error: 'Failed to parse any student schedule records from the provided CSV files.' });
    }

    // Wipe only this batch and seed new records
    await Student.deleteMany({ batch });
    const inserted = await Student.insertMany(studentsData);

    res.json({
      success: true,
      message: `Database successfully updated with ${inserted.length} students from the uploaded CSV files for batch ${batch}.`,
      count: inserted.length
    });
  } catch (error) {
    console.error('Error processing dynamically uploaded CSV files:', error);
    res.status(500).json({ error: 'Failed to process CSV files', details: error.message });
  }
});

// 6. Sync ALL batches from saved Google Sheets links (PROTECTED)
app.post('/api/students/sync-all-sheets', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'No saved sync configuration found. Please sync individual batches first.' });
    }

    const rawConfig = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(rawConfig);

    if (!config.batches) {
      return res.status(400).json({ error: 'Sync configuration is missing batch data.' });
    }

    const results = [];
    const errors = [];

    for (const [batch, urls] of Object.entries(config.batches)) {
      if (!urls.theoryUrl || !urls.practicalUrl) {
        errors.push({ batch, error: 'Missing Theory or Practical URL — skipped.' });
        continue;
      }

      try {
        const mappingExport = urls.mappingUrl ? getCsvUrl(urls.mappingUrl) : '';
        const theoryExport = getCsvUrl(urls.theoryUrl);
        const practicalExport = getCsvUrl(urls.practicalUrl);

        console.log(`[Sync All] Fetching data for batch ${batch}...`);
        const [mappingCsv, theoryCsv, practicalCsv] = await Promise.all([
          mappingExport ? fetchCsvText(mappingExport) : Promise.resolve(''),
          fetchCsvText(theoryExport),
          fetchCsvText(practicalExport)
        ]);

        const finalApiKey = process.env.GROQ_API_KEY;
        const studentsData = await parseCsvData(mappingCsv, theoryCsv, practicalCsv, {
          batch,
          useAi: !!config.useAi,
          groqApiKey: finalApiKey
        });

        if (!studentsData || studentsData.length === 0) {
          errors.push({ batch, error: 'Parsed 0 student records.' });
          continue;
        }

        await Student.deleteMany({ batch });
        const inserted = await Student.insertMany(studentsData);
        results.push({ batch, count: inserted.length });
        console.log(`[Sync All] Batch ${batch}: ${inserted.length} students synced.`);
      } catch (err) {
        console.error(`[Sync All] Error syncing batch ${batch}:`, err.message);
        errors.push({ batch, error: err.message });
      }
    }

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);

    res.json({
      success: true,
      message: `Synced ${totalCount} students across ${results.length} batch(es).`,
      totalCount,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in sync-all-sheets:', error);
    res.status(500).json({ error: 'Sync All failed', details: error.message });
  }
});

// --- Serve Frontend Static Files in Production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Simple welcome route for development testing
  app.get('/', (req, res) => {
    res.send('Exam Scheduler Express Backend is Running 🚀');
  });
}

// Start Server (only if not running as a Vercel Serverless Function)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
