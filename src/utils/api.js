// API utilities for communicating with the backend server

const API_BASE = ''; // Same origin

export async function checkOllama() {
  try {
    const response = await fetch(`${API_BASE}/api/check-ollama`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking Ollama:', error);
    return { available: false, error: error.message };
  }
}

export async function getModels() {
  try {
    const response = await fetch(`${API_BASE}/api/models`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting models:', error);
    throw error;
  }
}

export async function summarize(transcript, speakerName) {
  try {
    const response = await fetch(`${API_BASE}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcript, speakerName })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error summarizing:', error);
    throw error;
  }
}

export async function getMeetingSummary(transcripts) {
  try {
    const response = await fetch(`${API_BASE}/api/meeting-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcripts })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting meeting summary:', error);
    throw error;
  }
}
