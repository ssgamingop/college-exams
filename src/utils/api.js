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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Search request failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('🔴 API Backend Error (searchStudents):', error.message || error);
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Fetch request failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('🔴 API Backend Error (getStudentByRoll):', error.message || error);
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
export async function uploadAndSyncCsv(batch, mappingCsv, theoryCsv, practicalCsv, password) {
  try {
    const response = await fetch(`${API_BASE}/api/students/upload-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batch, mappingCsv, theoryCsv, practicalCsv, password })
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

/**
 * Gets the total number of students in the database.
 * @returns {Promise<number>} - Count of students
 */
export async function getStudentCount() {
  try {
    const response = await fetch(`${API_BASE}/api/students/count`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('🔴 API Backend Error (getStudentCount):', error.message || error);
    return 0;
  }
}

/**
 * Verifies the admin authorization password.
 * @param {string} password - Admin authorization password
 * @returns {Promise<Object>} - Success result
 */
export async function verifyPassword(password) {
  const response = await fetch(`${API_BASE}/api/students/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Password verification failed');
  }
  return data;
}

/**
 * Gets the current Google Sheets sync configuration from the server.
 * @returns {Promise<Object>} - Config object with mappingUrl, theoryUrl, practicalUrl, useAi, hasApiKey
 */
export async function getSyncConfig() {
  const response = await fetch(`${API_BASE}/api/students/sync-config`);
  if (!response.ok) {
    throw new Error('Failed to load sync configuration');
  }
  return await response.json();
}

/**
 * Syncs the database with student schedules from Google Sheets.
 */
export async function syncGoogleSheets(batch, mappingUrl, theoryUrl, practicalUrl, useAi, groqApiKey, password) {
  const response = await fetch(`${API_BASE}/api/students/sync-sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, mappingUrl, theoryUrl, practicalUrl, useAi, groqApiKey, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sync Google Sheets');
  }
  return data;
}
