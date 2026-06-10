/**
 * API utility to query the Node.js/Express backend.
 * Uses JWT tokens for admin authentication — password is never stored client-side.
 */

// No hardcoded BASE_URL is needed!
// In development, Vite dev server proxies /api requests to localhost:5001.
// In production, the Express backend serves the static assets directly, meaning they share the same origin.
const API_BASE = '';

// --- JWT Token Management ---

const TOKEN_KEY = 'adminToken';

/**
 * Stores the JWT session token in sessionStorage.
 */
export function setAuthToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Retrieves the stored JWT session token.
 */
export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Clears the stored JWT session token (logout).
 */
export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Checks if the user has a stored (potentially valid) token.
 */
export function hasAuthToken() {
  return !!getAuthToken();
}

/**
 * Returns the Authorization header object for authenticated requests.
 */
function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

// --- Public API Calls (No Auth Required) ---

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
 * Gets a lightweight list of all students (name, rollNo, batch) for instant client-side search.
 * @returns {Promise<Array>} - List of student objects for search index.
 */
export async function getSearchIndex() {
  try {
    const response = await fetch(`${API_BASE}/api/students/search-index`);
    if (!response.ok) {
      throw new Error('Failed to fetch search index');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getSearchIndex:', error);
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

// --- Admin API Calls (JWT Auth Required) ---

/**
 * Verifies the admin authorization password and stores the returned JWT token.
 * @param {string} password - Admin authorization password
 * @returns {Promise<Object>} - Success result with token
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
  // Store the JWT token — never the password
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

/**
 * Gets the current Google Sheets sync configuration from the server.
 * Requires JWT authentication.
 * @returns {Promise<Object>} - Config object with batches, useAi, hasApiKey
 */
export async function getSyncConfig() {
  const response = await fetch(`${API_BASE}/api/students/sync-config`, {
    headers: { ...getAuthHeaders() }
  });
  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) {
    throw new Error('Failed to load sync configuration');
  }
  return await response.json();
}

/**
 * Uploads the 3 CSV file contents to process and sync the database.
 * Requires JWT authentication.
 */
export async function uploadAndSyncCsv(batch, mappingCsv, theoryCsv, practicalCsv) {
  try {
    const response = await fetch(`${API_BASE}/api/students/upload-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ batch, mappingCsv, theoryCsv, practicalCsv })
    });
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || 'Session expired. Please log in again.');
    }
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
 * Syncs the database with student schedules from Google Sheets.
 * Requires JWT authentication.
 */
export async function syncGoogleSheets(batch, mappingUrl, theoryUrl, practicalUrl, useAi, groqApiKey) {
  const response = await fetch(`${API_BASE}/api/students/sync-sheets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ batch, mappingUrl, theoryUrl, practicalUrl, useAi, groqApiKey })
  });
  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || 'Session expired. Please log in again.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sync Google Sheets');
  }
  return data;
}

/**
 * Syncs ALL batches from saved Google Sheets links in one operation.
 * Requires JWT authentication.
 * @returns {Promise<Object>} - Results with total count, per-batch results, and any errors
 */
export async function syncAllSheets() {
  const response = await fetch(`${API_BASE}/api/students/sync-all-sheets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  });
  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || 'Session expired. Please log in again.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sync all sheets');
  }
  return data;
}
