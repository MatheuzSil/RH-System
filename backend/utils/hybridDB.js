import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadFromDB, loadFilteredData, insertToDB, updateInDB, deleteFromDB, logToDB, getDashboardSummary, getSettings, saveSettings } from './dbHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../db.json');

// Variável para controlar se usamos SQL ou JSON
const USE_SQL = process.env.USE_SQL === 'true';

// Funções originais do JSON (backup)
function loadDBFromJSON() { 
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); 
}

function saveDBToJSON(db) { 
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8'); 
}

function logToJSON(db, who, action, details = '') { 
  db.logs.unshift({at: new Date().toLocaleString('pt-BR'), who, action, details}); 
}

// Funções híbridas que escolhem entre SQL e JSON
export async function loadDB() {
  if (USE_SQL) {
    // Se usar SQL, carregamos dados de múltiplas tabelas
    try {
      const db = {
        users: await loadFromDB('users'),
        departments: await loadFromDB('departments'),
        employees: await loadFromDB('employees'),
        attendance: await loadFromDB('attendance'),
        leaves: await loadFromDB('leaves'),
        payroll: await loadFromDB('payroll'),
        reviews: await loadFromDB('reviews'),
        trainings: await loadFromDB('trainings'),
        jobs: await loadFromDB('jobs'),
        candidates: await loadFromDB('candidates'),
        documents: await loadFromDB('documents'),
        logs: await loadFromDB('logs', 'ORDER BY id DESC'),
        settings: await getSettings()
      };
      return db;
    } catch (error) {
      console.warn('⚠️  Erro ao carregar do SQL, usando JSON como fallback:', error.message);
      return loadDBFromJSON();
    }
  }
  return loadDBFromJSON();
}

export async function saveDB(db) {
  if (USE_SQL) {
    // Com SQL, não precisamos "salvar" tudo de uma vez, pois cada operação já persiste
    console.log('💾 Usando SQL - dados já persistidos');
    return;
  }
  return saveDBToJSON(db);
}

export async function log(dbOrWho, whoOrAction, actionOrDetails = '', details = '') {
  if (USE_SQL) {
    // Se for SQL, os parâmetros são: (who, action, details)
    const who = typeof dbOrWho === 'string' ? dbOrWho : whoOrAction;
    const action = typeof dbOrWho === 'string' ? whoOrAction : actionOrDetails;
    const logDetails = typeof dbOrWho === 'string' ? actionOrDetails : details;
    
    await logToDB(who, action, logDetails);
  } else {
    // Se for JSON, os parâmetros são: (db, who, action, details)
    logToJSON(dbOrWho, whoOrAction, actionOrDetails);
  }
}

// Função para listar dados com filtros
export async function listData(collection, filterFn = null, user = null) {
  if (USE_SQL && user) {
    try {
      return await loadFilteredData(collection, user.role, user.id, user.email);
    } catch (error) {
      console.warn(`⚠️  Erro ao carregar ${collection} do SQL:`, error.message);
      // Fallback para JSON
      const db = loadDBFromJSON();
      let data = db[collection] || [];
      if (filterFn) data = data.filter(x => filterFn(x, user, db));
      return data;
    }
  } else {
    const db = await loadDB();
    let data = db[collection] || [];
    if (filterFn && user) data = data.filter(x => filterFn(x, user, db));
    return data;
  }
}

// Função para obter um item específico
export async function getOne(collection, id) {
  if (USE_SQL) {
    try {
      const results = await loadFromDB(collection, 'WHERE id = @id', { id });
      return results[0] || null;
    } catch (error) {
      console.warn(`⚠️  Erro ao buscar ${collection}:${id} do SQL:`, error.message);
    }
  }
  
  const db = await loadDB();
  return (db[collection] || []).find(x => x.id === id) || null;
}

// Função para criar item
export async function createItem(collection, data, user) {
  if (USE_SQL) {
    try {
      await insertToDB(collection, data);
      await log(user.email, `${collection}.new`, data.id);
      return data;
    } catch (error) {
      console.warn(`⚠️  Erro ao criar ${collection} no SQL:`, error.message);
    }
  }
  
  // Fallback ou método padrão JSON
  const db = await loadDB();
  (db[collection] = db[collection] || []).unshift(data);
  await log(db, user.email, `${collection}.new`, data.id);
  await saveDB(db);
  return data;
}

// Função para atualizar item
export async function updateItem(collection, id, data, user) {
  if (USE_SQL) {
    try {
      const updated = await updateInDB(collection, id, data);
      await log(user.email, `${collection}.save`, id);
      return updated;
    } catch (error) {
      console.warn(`⚠️  Erro ao atualizar ${collection}:${id} no SQL:`, error.message);
    }
  }
  
  // Fallback ou método padrão JSON
  const db = await loadDB();
  const idx = (db[collection] || []).findIndex(x => x.id === id);
  if (idx < 0) throw new Error('Item não encontrado');
  
  db[collection][idx] = { ...db[collection][idx], ...data };
  await log(db, user.email, `${collection}.save`, id);
  await saveDB(db);
  return db[collection][idx];
}

// Função para deletar item
export async function deleteItem(collection, id, user) {
  if (USE_SQL) {
    try {
      await deleteFromDB(collection, id);
      await log(user.email, `${collection}.delete`, id);
      return true;
    } catch (error) {
      console.warn(`⚠️  Erro ao deletar ${collection}:${id} do SQL:`, error.message);
    }
  }
  
  // Fallback ou método padrão JSON
  const db = await loadDB();
  db[collection] = (db[collection] || []).filter(x => x.id !== id);
  await log(db, user.email, `${collection}.delete`, id);
  await saveDB(db);
  return true;
}

// Função para obter resumo do dashboard
export async function getSummary() {
  if (USE_SQL) {
    try {
      return await getDashboardSummary();
    } catch (error) {
      console.warn('⚠️  Erro ao obter resumo do SQL:', error.message);
    }
  }
  
  const db = await loadDB();
  const totalEmp = db.employees.length;
  const ativos = db.employees.filter(e => e.status === 'ATIVO').length;
  const onLeave = db.leaves.filter(l => l.status === 'APROVADO').length;
  const openJobs = db.jobs.filter(j => j.status === 'ABERTA').length;
  return { totalEmp, ativos, onLeave, openJobs };
}

// Função para configurações
export async function loadSettings() {
  if (USE_SQL) {
    try {
      return await getSettings();
    } catch (error) {
      console.warn('⚠️  Erro ao carregar settings do SQL:', error.message);
    }
  }
  
  const db = await loadDB();
  return db.settings || {};
}

export async function updateSettings(settings, user) {
  if (USE_SQL) {
    try {
      const updated = await saveSettings(settings);
      await log(user.email, 'settings.save', JSON.stringify(settings));
      return updated;
    } catch (error) {
      console.warn('⚠️  Erro ao salvar settings no SQL:', error.message);
    }
  }
  
  const db = await loadDB();
  db.settings = { ...(db.settings || {}), ...settings };
  await log(db, user.email, 'settings.save', JSON.stringify(db.settings));
  await saveDB(db);
  return db.settings;
}

// Função utilitária para gerar IDs
export function uid(prefix = 'ID') { 
  return prefix + '_' + Math.random().toString(36).slice(2, 8).toUpperCase(); 
}
