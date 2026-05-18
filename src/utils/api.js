/**
 * API utility to query the Node.js/Express backend.
 */

// No hardcoded BASE_URL is needed!
// In development, Vite dev server proxies /api requests to localhost:5001.
// In production, the Express backend serves the static assets directly, meaning they share the same origin.
const API_BASE = '';

/**
 * Searches students by name or roll number.
 * @param {string} query - The search query (Name or Roll Number).
 * @returns {Promise<Array>} - List of matching student objects containing full schedules.
 */
export async function searchStudents(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetch(`${API_BASE}/api/students/search?q=${encodeURIComponent(query.trim())}`);
    if (!response.ok) {
      throw new Error(`Search request failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in searchStudents API utility:', error);
    return [];
  }
}

/**
 * Gets a student's full schedule by their unique roll number.
 * @param {string} rollNo - The roll number of the student.
 * @returns {Promise<Object|null>} - The student object or null if not found.
 */
export async function getStudentByRoll(rollNo) {
  if (!rollNo) return null;
  try {
    const response = await fetch(`${API_BASE}/api/students/roll/${encodeURIComponent(rollNo.trim())}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Fetch student roll request failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getStudentByRoll API utility:', error);
    return null;
  }
}

/**
 * Uploads the 3 CSV file contents to process and sync the database.
 * @param {string} mappingCsv - Mapping CSV text
 * @param {string} theoryCsv - Theory Schedule CSV text
 * @param {string} practicalCsv - Practical Schedule CSV text
 * @returns {Promise<Object>} - The API response
 */
export async function uploadAndSyncCsv(mappingCsv, theoryCsv, practicalCsv, password) {
  try {
    const response = await fetch(`${API_BASE}/api/students/upload-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mappingCsv, theoryCsv, practicalCsv, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload and sync CSV files');
    }
    return data;
  } catch (error) {
    console.error('Error in uploadAndSyncCsv API utility:', error);
    throw error;
  }
}
