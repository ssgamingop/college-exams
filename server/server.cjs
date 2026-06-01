const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const Student = require('./models/Student.cjs');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_scheduler';

// Middleware
// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

// Configure CORS (Allow all origins for public API since there are no session cookies)
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));

// Simple In-Memory Rate Limiter to prevent API abuse
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const rateLimitMaxRequests = 150; // Max 150 requests per IP per window
const ipRequestCounts = new Map();

// Periodic cleanup of expired rate limits
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

// Brute-Force Protection for Admin CSV Upload password attempts
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

// Serverless-Safe Mongoose Connection Middleware
const connectDB = async (req, res, next) => {
  if (mongoose.connection.readyState >= 1) {
    return next(); // Already connected
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Don't hang indefinitely
    });
    console.log('Successfully connected to MongoDB (Serverless).');
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).json({ error: 'Database Connection Failed', details: err.message });
  }
};

app.use(connectDB);

// --- API Routes ---

// 1. Search students (by name or roll number)
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
    }).limit(10); // Return up to 10 suggestions for robustness

    res.json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message || error.toString() });
  }
});

// 2. Get student schedule by roll number
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

// 3. Get student count
app.get('/api/students/count', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error getting student count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Seed Database endpoint (Optional backup)
app.post('/api/students/seed', async (req, res) => {
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

    // Delete existing records
    await Student.deleteMany({});
    
    // Seed new data
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

// Import helper parser utilities
const { getCsvUrl, fetchCsvText, parseCsvData } = require('./utils/parser.cjs');

// 5. Verify Admin password to unlock the admin dashboard
app.post('/api/students/verify-password', adminUploadRateLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server Configuration Error: Admin authorization password is not configured on the server.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (typeof password !== 'string' || password.trim() !== adminPassword) {
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
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid Admin Password',
        details: attemptsLeft > 0 ? `Incorrect password. ${attemptsLeft} attempts remaining before lockout.` : 'Too many incorrect attempts. Locked out for 15 minutes.'
      });
    }

    // Reset attempts on successful authentication
    loginAttempts.delete(ip);
    res.json({ success: true, message: 'Authenticated successfully' });
  } catch (error) {
    console.error('Error verifying admin password:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// 6. Get Saved Sync Configuration
app.get('/api/students/sync-config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    let config = { mappingUrl: '', theoryUrl: '', practicalUrl: '', useAi: false };
    if (fs.existsSync(configPath)) {
      try {
        const rawData = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(rawData);
      } catch (err) {
        console.error('Error reading config.json:', err);
      }
    }
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    res.json({ ...config, hasApiKey });
  } catch (error) {
    console.error('Error reading sync config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Sync database directly from Google Sheets (CSV Export format)
app.post('/api/students/sync-sheets', adminUploadRateLimiter, async (req, res) => {
  try {
    const { mappingUrl, theoryUrl, practicalUrl, useAi, geminiApiKey, password } = req.body;
    
    // Validate Admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server Configuration Error: Admin authorization password is not configured.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (typeof password !== 'string' || password.trim() !== adminPassword) {
      const now = Date.now();
      if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { attempts: 1, lockoutResetTime: 0 });
      } else {
        const data = loginAttempts.get(ip);
        data.attempts++;
        if (data.attempts >= 5) {
          data.lockoutResetTime = now + 15 * 60 * 1000;
        }
      }
      
      const attemptsLeft = loginAttempts.has(ip) ? Math.max(0, 5 - loginAttempts.get(ip).attempts) : 5;
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid Admin Password',
        details: attemptsLeft > 0 ? `Incorrect password. ${attemptsLeft} attempts remaining before lockout.` : 'Too many incorrect attempts. Locked out for 15 minutes.'
      });
    }

    loginAttempts.delete(ip);

    if (!mappingUrl || !theoryUrl || !practicalUrl) {
      return res.status(400).json({ error: 'All three Google Sheets URLs are required.' });
    }

    // Convert to exportable URLs
    const mappingExport = getCsvUrl(mappingUrl);
    const theoryExport = getCsvUrl(theoryUrl);
    const practicalExport = getCsvUrl(practicalUrl);

    console.log('Fetching Google Sheets CSV data...');
    const [mappingCsv, theoryCsv, practicalCsv] = await Promise.all([
      fetchCsvText(mappingExport),
      fetchCsvText(theoryExport),
      fetchCsvText(practicalExport)
    ]);

    // Use environment variable key if not passed from UI
    const finalApiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    // Parse the fetched CSV content
    const studentsData = await parseCsvData(mappingCsv, theoryCsv, practicalCsv, {
      useAi: !!useAi,
      geminiApiKey: finalApiKey
    });

    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({ error: 'Parsed student records list is empty. Check your sheets layout.' });
    }

    // Update MongoDB
    await Student.deleteMany({});
    const inserted = await Student.insertMany(studentsData);

    // Save sync config locally
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ mappingUrl, theoryUrl, practicalUrl, useAi: !!useAi }, null, 2));

    res.json({
      success: true,
      message: `Database successfully synced with ${inserted.length} students from Google Sheets!`,
      count: inserted.length
    });
  } catch (error) {
    console.error('Error syncing Google Sheets:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// 8. Upload and Parse CSV data dynamically to update the database (Manual File Ingestion)
app.post('/api/students/upload-csv', adminUploadRateLimiter, async (req, res) => {
  try {
    const { mappingCsv, theoryCsv, practicalCsv, password } = req.body;
    
    // Authenticate Admin Password
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server Configuration Error: Admin authorization password is not configured on the server.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (typeof password !== 'string' || password.trim() !== adminPassword) {
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
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid Admin Password',
        details: attemptsLeft > 0 ? `Incorrect password. ${attemptsLeft} attempts remaining before lockout.` : 'Too many incorrect attempts. Locked out for 15 minutes.'
      });
    }

    // Reset attempts on successful upload
    loginAttempts.delete(ip);

    if (!mappingCsv || !theoryCsv || !practicalCsv) {
      return res.status(400).json({ error: 'All three CSV contents (mappingCsv, theoryCsv, and practicalCsv) are required.' });
    }

    const studentsData = await parseCsvData(mappingCsv, theoryCsv, practicalCsv, { useAi: false });
    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({ error: 'Failed to parse any student schedule records from the provided CSV files.' });
    }

    // Wipe and seed database
    await Student.deleteMany({});
    const inserted = await Student.insertMany(studentsData);

    res.json({
      success: true,
      message: `Database successfully updated with ${inserted.length} students from the uploaded CSV files.`,
      count: inserted.length
    });
  } catch (error) {
    console.error('Error processing dynamically uploaded CSV files:', error);
    res.status(500).json({ error: 'Failed to process CSV files', details: error.message });
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
