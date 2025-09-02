// API Communication Layer
import { CONFIG } from './constants.js';

let TOKEN = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.TOKEN) || null;

// Main API function
export async function api(path, method = 'GET', body = null) {
  const url = CONFIG.API_URL + path;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'Authorization': 'Bearer ' + TOKEN } : {})
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') 
    ? response.json() 
    : response.text();
}

// Specific HTTP methods
export async function post(path, body = null) {
  return api(path, 'POST', body);
}

export async function put(path, body = null) {
  return api(path, 'PUT', body);
}

export async function del(path) {
  return api(path, 'DELETE');
}

// Authentication related
export function getToken() {
  return TOKEN;
}

export function setToken(token) {
  TOKEN = token;
  if (token) {
    localStorage.setItem(CONFIG.LOCAL_STORAGE_KEYS.TOKEN, token);
  } else {
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEYS.TOKEN);
  }
}

export function clearToken() {
  setToken(null);
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!TOKEN;
}

// File download helper
export async function downloadFile(path, filename = 'download') {
  try {
    const response = await fetch(CONFIG.API_URL + path, {
      headers: {
        'Authorization': 'Bearer ' + TOKEN
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// CSV export helper
export function exportCSV(entity) {
  const url = `${CONFIG.API_URL}/export/${entity}.csv`;
  window.open(url, '_blank');
}
