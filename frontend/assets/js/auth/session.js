// Authentication System
import { api, post, setToken, clearToken } from '../utils/api.js';
import { CONFIG, ROLES } from '../utils/constants.js';
import { qs, hide, show } from '../utils/helpers.js';

export let currentUser = {
  role: null,
  name: null,
  email: null
};

const pendingMFASessions = new Map();

// Login function
export async function login(email, password) {
  try {
    const response = await post('/login', { email, password });
    
    // Store MFA session
    sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEYS.MFA_EMAIL, email);
    pendingMFASessions.set(email, response.demoCode);
    
    // Show MFA code in alert
    alert('🔐 CÓDIGO DE VERIFICAÇÃO EM 2 ETAPAS\n\n' + 
          '📱 Seu código MFA é: ' + response.demoCode + '\n\n' +
          '⚠️  Digite este código na próxima tela para continuar');
    
    return {
      success: true,
      mfaCode: response.demoCode,
      requiresMFA: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// MFA verification
export async function verifyMFA(code) {
  try {
    const email = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEYS.MFA_EMAIL);
    if (!email) {
      throw new Error('Sessão MFA não encontrada');
    }
    
    const response = await post('/mfa', { email, code });
    
    // Store authentication data
    setToken(response.token);
    currentUser.role = response.role;
    currentUser.name = response.name;
    currentUser.email = email;
    
    // Clear MFA session
    sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEYS.MFA_EMAIL);
    pendingMFASessions.delete(email);
    
    return {
      success: true,
      user: currentUser
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Logout function
export function logout() {
  clearToken();
  currentUser = { role: null, name: null, email: null };
  sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEYS.MFA_EMAIL);
  pendingMFASessions.clear();
  location.reload();
}

// Check if user has required role
export function hasRole(...roles) {
  return roles.includes(currentUser.role);
}

// Check authentication status on page load
export async function checkAuthStatus() {
  try {
    const token = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) {
      return false;
    }
    
    // Verify token with server
    const summary = await api('/summary');
    
    // If we reach here, token is valid
    // We'll need to get user info from somewhere else
    currentUser.role = 'ADMIN'; // Default for now
    currentUser.name = 'Usuário Logado';
    
    return true;
  } catch (error) {
    clearToken();
    return false;
  }
}

// Initialize authentication UI
export function initAuthUI() {
  const loginBtn = qs('#btn-login');
  const verifyBtn = qs('#btn-verify');
  const logoutBtn = qs('#btn-logout');
  
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = qs('#login-email').value.trim();
      const password = qs('#login-pass').value;
      
      if (!email || !password) {
        alert('Preencha todos os campos');
        return;
      }
      
      const result = await login(email, password);
      
      if (result.success) {
        // Show MFA hint
        const mfaHint = qs('#mfa-hint');
        if (mfaHint) {
          mfaHint.textContent = 'Digite o código: ' + result.mfaCode;
        }
        
        hide('#view-login');
        show('#view-mfa');
      } else {
        alert('Falha no login: ' + result.error);
      }
    };
  }
  
  if (verifyBtn) {
    verifyBtn.onclick = async () => {
      const code = qs('#mfa-code').value.trim();
      
      if (!code) {
        alert('Digite o código MFA');
        return;
      }
      
      const result = await verifyMFA(code);
      
      if (result.success) {
        hide('#view-mfa');
        show('#app');
        
        // Update user context
        const userCtx = qs('#user-ctx');
        if (userCtx) {
          userCtx.textContent = `${currentUser.name} • ${currentUser.role}`;
        }
        
        // Initialize app
        const { initializeApp } = await import('../app.js');
        initializeApp();
      } else {
        alert('Código inválido: ' + result.error);
      }
    };
  }
  
  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }
}
