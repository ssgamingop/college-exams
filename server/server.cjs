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
app.use(cors({
  origin: '*', // Allow all origins for the public API (Upload is password-protected)
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

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
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = q.trim();
    // Escape regex special characters
    const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const students = await Student.find({
      $or: [
        { name: regex },
        { rollNo: regex }
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
    if (!rollNo) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    const student = await Student.findOne({ rollNo });
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
    const jsonPath = path.join(__dirname, '../src/data/exam_data.json');
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

// Helper to parse CSV data in-memory
function processCsvData(mappingCsvText, theoryCsvText, practicalCsvText) {
  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes inside quotes (e.g., "")
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '').trim());
  }

  // Read lines helper
  function getLines(text) {
    return text.split(/\r?\n/).filter(line => line.trim() !== '');
  }

  const mappingLines = getLines(mappingCsvText);
  if (mappingLines.length === 0) throw new Error('Mapping CSV is empty');

  const students = {}; // RollNo -> { name, rollNo, theory: [], practical: [] }

  const headerCols = parseLine(mappingLines[0]);
  let rollColIdx = headerCols.findIndex(c => c.toLowerCase().includes('roll'));
  let nameColIdx = headerCols.findIndex(c => c.toLowerCase().includes('name'));

  if (rollColIdx === -1) rollColIdx = 0;
  if (nameColIdx === -1) nameColIdx = 1;

  for (let i = 1; i < mappingLines.length; i++) {
    const cols = parseLine(mappingLines[i]);
    if (cols.length > Math.max(rollColIdx, nameColIdx)) {
      const rollNo = cols[rollColIdx];
      const name = cols[nameColIdx];
      if (rollNo && name) {
        students[rollNo] = {
          rollNo,
          name,
          theory: [],
          practical: []
        };
      }
    }
  }

  // 2. Process Theory Schedule
  const theoryLines = getLines(theoryCsvText);
  let currentTheoryDate = '';
  let currentSubject = '';

  for (let i = 2; i < theoryLines.length; i++) {
    const cols = parseLine(theoryLines[i]);
    if (cols.length < 5) continue;

    if (cols[0] && cols[0].toLowerCase().trim() !== 'date') currentTheoryDate = cols[0];
    if (cols[1] && cols[1].toLowerCase().trim() !== 'subject') currentSubject = cols[1];

    let subject = currentSubject;
    if (subject === 'Aptitude - I - DILR') {
      const mode = cols[2] ? cols[2].trim() : '';
      if (mode.toLowerCase().includes('mcq')) {
        subject = 'Aptitude - I - DILR (MCQ)';
      } else {
        subject = 'Aptitude - I - DILR (Theory)';
      }
    }
    const timeSlot = cols[3];
    const rollField = cols[4];
    const location = cols[6]; // Class Details

    if (!rollField) continue;

    const parts = rollField.split(',').map(p => p.trim());

    parts.forEach(part => {
      if (part.includes(' to ')) {
        const [startRoll, endRoll] = part.split(' to ').map(r => BigInt(r.trim()));
        Object.values(students).forEach(student => {
          try {
            const studentRoll = BigInt(student.rollNo);
            if (studentRoll >= startRoll && studentRoll <= endRoll) {
              student.theory.push({
                date: currentTheoryDate,
                subject,
                time: timeSlot,
                location: location || 'TBD',
                type: 'Theory'
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      } else {
        try {
          const singleRoll = BigInt(part);
          Object.values(students).forEach(student => {
            if (BigInt(student.rollNo) === singleRoll) {
              student.theory.push({
                date: currentTheoryDate,
                subject,
                time: timeSlot,
                location: location || 'TBD',
                type: 'Theory'
              });
            }
          });
        } catch (e) {
          // Ignore single roll parse error
        }
      }
    });
  }

  // 3. Process Practical Schedule
  const practicalLines = getLines(practicalCsvText);
  let currentPracticalDate = '';
  let subjectMap = {};
  let venueMap = {};
  let tempPanels = {};

  function parsePanelHeader(header) {
    let subject = '';
    let professor = '';
    let panel = '';

    const cleanHeader = header.replace(/\s+/g, ' ').trim();
    const match = cleanHeader.match(/^(Panel\s*\d+|Batch\s*\d+)(?:\s*\((.*?)\))?\s*-\s*(.*)$/i);
    if (match) {
      panel = match[1].trim();
      professor = match[2] ? match[2].trim() : '';
      subject = match[3] ? match[3].trim() : '';
    } else {
      const parts = cleanHeader.split(' - ');
      if (parts.length > 1) {
        subject = parts.slice(1).join(' - ').trim();
        panel = parts[0].trim();
      } else {
        subject = cleanHeader;
        panel = 'Unknown';
      }
    }

    return { subject, panel, professor };
  }

  for (let i = 0; i < practicalLines.length; i++) {
    const line = practicalLines[i];
    const row = parseLine(line);
    if (!row || row.length === 0) continue;

    const dateCell = (row[0] && row[0].includes('Day')) ? row[0] : (row[1] && row[1].includes('Day') ? row[1] : null);
    if (dateCell) {
      currentPracticalDate = dateCell.trim();
      venueMap = {};
      subjectMap = {};
      tempPanels = {};
      continue;
    }

    if ((row[0] && row[0].includes('Venue')) || (row[1] && row[1].includes('Venue'))) {
      row.forEach((cell, idx) => {
        if (cell && cell.includes('Bunker')) {
          venueMap[idx] = cell.trim();
        }
      });
      // Do not continue if it's also the Slot No./Panel header row
      if (!(row[0] && row[0].includes('Slot No.'))) {
        continue;
      }
    }

    if (row[0] && row[0].includes('Slot No.')) {
      row.forEach((cell, idx) => {
        if (idx >= 2 && cell) {
          tempPanels[idx] = cell.trim();
        }
      });
      continue;
    }

    if (row[1] && row[1].includes('Time')) {
      row.forEach((cell, idx) => {
        if (idx >= 2 && cell) {
          const parsed = parsePanelHeader(cell);
          const panelName = tempPanels[idx] || 'Unknown';
          subjectMap[idx] = {
            subject: parsed.subject,
            panel: panelName,
            professor: parsed.professor
          };
        }
      });
      continue;
    }

    if (!currentPracticalDate) continue;

    const time = row[1];
    if (!time || !time.includes('M')) continue;

    for (let j = 2; j < row.length; j++) {
      const studentName = row[j];
      if (studentName && studentName.length > 2 && studentName !== 'NA') {
        const normalizeName = (name) => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        const student = Object.values(students).find(s =>
          normalizeName(s.name) === normalizeName(studentName)
        );

        if (student) {
          const headerInfo = subjectMap[j] || { subject: 'Unknown', panel: 'Unknown' };
          let baseLocation = venueMap[j] || 'TBD';
          let professor = headerInfo.professor || '';
          
          let location = baseLocation;
          if (professor) {
            location = `${baseLocation} (${professor})`;
          }

          student.practical.push({
            date: currentPracticalDate,
            subject: headerInfo.subject,
            panel: headerInfo.panel,
            time: time.trim(),
            location: location,
            type: 'Practical',
            professor: professor
          });
        }
      }
    }
  }

  return Object.values(students);
}

// 5. Upload and Parse CSV data dynamically to update the database
app.post('/api/students/upload-csv', async (req, res) => {
  try {
    const { mappingCsv, theoryCsv, practicalCsv, password } = req.body;
    
    // Authenticate Admin Password
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server Configuration Error: Admin authorization password is not configured on the server.' });
    }
    if (typeof password !== 'string' || password.trim() !== adminPassword) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    if (!mappingCsv || !theoryCsv || !practicalCsv) {
      return res.status(400).json({ error: 'All three CSV contents (mappingCsv, theoryCsv, and practicalCsv) are required.' });
    }

    const studentsData = processCsvData(mappingCsv, theoryCsv, practicalCsv);
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
