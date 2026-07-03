const BASE_URL = "https://knowledge-tracker-a7d6.onrender.com";

/**
 * Helper to construct authentication and content-type headers.
 */
const getAuthHeaders = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = jsonParseSafe(userStr);
      if (user && user.token) {
        return {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        };
      }
    }
  } catch (e) {
    console.error("Error reading token from localStorage", e);
  }
  return {
    "Content-Type": "application/json"
  };
};

const jsonParseSafe = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

/**
 * Fetch all notes for the authenticated user.
 */
export const getNotes = async () => {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch notes");
  }
  return response.json();
};

/**
 * Create a new note.
 * @param {Object} noteData - { title, content, tags }
 */
export const createNote = async (noteData) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(noteData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create note");
  }
  return response.json();
};

/**
 * Update an existing note.
 * @param {number|string} id
 * @param {Object} noteData - { title, content, tags }
 */
export const updateNote = async (id, noteData) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(noteData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update note");
  }
  return response.json();
};

/**
 * Delete a note.
 * @param {number|string} id
 */
export const deleteNote = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete note");
  }
  return true;
};
export const uploadPdf = async (file) => {
  const user = JSON.parse(localStorage.getItem("user"));

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "PDF upload failed");
  }

  return response.json();
};