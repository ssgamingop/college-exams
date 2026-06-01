const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const Student = require('./models/Student.cjs');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_scheduler';
const JSON_DATA_PATH = path.normalize(path.join(__dirname, '../src/data/exam_data.json'));

async function seedDatabase() {
  console.log('Starting MongoDB seeding process...');
  
  // 1. Verify JSON file exists
  if (!fs.existsSync(JSON_DATA_PATH)) {
    console.error(`Error: JSON file not found at ${JSON_DATA_PATH}`);
    console.log('Please make sure you have run "npm run process-data" first to generate the JSON.');
    process.exit(1);
  }

  // 2. Read and parse JSON file
  let examData;
  try {
    const rawData = fs.readFileSync(JSON_DATA_PATH, 'utf8');
    examData = JSON.parse(rawData);
    console.log(`Parsed JSON file successfully. Found ${examData.length} student records.`);
  } catch (error) {
    console.error('Error parsing JSON data:', error);
    process.exit(1);
  }

  // 3. Connect to MongoDB
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  // 4. Wipe existing records & Insert new ones
  try {
    console.log('Wiping existing student documents...');
    const deleteResult = await Student.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing documents.`);

    console.log('Inserting new student records...');
    const insertResult = await Student.insertMany(examData);
    console.log(`Successfully seeded ${insertResult.length} students into MongoDB! 🚀`);
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    // 5. Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seedDatabase();
