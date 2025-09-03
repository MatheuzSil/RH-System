import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadFromDB, insertToDB, updateInDB, deleteFromDB, logToDB, getDashboardSummary } from './utils/dbHelpers.js';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'db.json');

// Variável para controlar se usamos SQL ou JSON
const USE_SQL = process.env.USE_SQL === 'true';

// Mapeamento de coleções para tabelas SQL
const TABLE_MAPPING = {
  users: 'marh_users',
  employees: 'marh_employees',
  departments: 'marh_departments',
  attendance: 'marh_attendance',
  leaves: 'marh_leaves',
  payroll: 'marh_payroll',
  reviews: 'marh_reviews',
  evaluations: 'marh_evaluations',
  trainings: 'marh_trainings',
  jobs: 'marh_jobs',
  candidates: 'marh_candidates'
};

// Log do modo atual
console.log(`\n🔄 MARH Backend iniciado no modo: ${USE_SQL ? '🗄️ SQL SERVER' : '📄 JSON'}`);
console.log(`📊 Fonte de dados: ${USE_SQL ? 'SQL Server Database' : 'JSON File (db.json)'}`);
console.log(`🔗 USE_SQL=${USE_SQL}\n`);

function loadDB(){ return JSON.parse(fs.readFileSync(DATA_PATH,'utf-8')); }
function saveDB(dbData){ fs.writeFileSync(DATA_PATH, JSON.stringify(dbData,null,2), 'utf-8'); }
function uid(prefix='ID'){ return prefix + '_' + Math.random().toString(36).slice(2,8).toUpperCase(); }
async function log(who, action, details=''){
  if (USE_SQL) {
    try {
      await logToDB(who, action, details);
    } catch (error) {
      console.error('Erro ao fazer log SQL:', error);
      // Fallback para JSON
      const dbData = loadDB();
      dbData.logs.unshift({at:new Date().toLocaleString('pt-BR'), who, action, details});
      saveDB(dbData);
    }
  } else {
    const dbData = loadDB();
    dbData.logs.unshift({at:new Date().toLocaleString('pt-BR'), who, action, details});
    saveDB(dbData);
  }
}

const sessions = new Map();
const pendingMFA = new Map();

const app = express();

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' })); // Aumentar limite para 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MARH Backend API',
    version: '1.0.0',
    status: 'running',
    mode: USE_SQL ? 'SQL Server' : 'JSON',
    sqlActive: USE_SQL,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: ['/api/login', '/api/mfa'],
      data: ['/api/employees', '/api/departments', '/api/attendance', '/api/leaves', '/api/payroll', '/api/reviews', '/api/trainings', '/api/jobs', '/api/candidates'],
      admin: ['/api/users', '/api/logs', '/api/settings'],
      diagnostic: ['/api/diagnostic']
    }
  });
});

// Endpoint de diagnóstico para verificar fonte dos dados
app.get('/api/diagnostic', auth, requireRole('ADMIN'), async (req, res) => {
  console.log(`🔍 [DIAGNOSTIC] Executando diagnóstico do sistema`);
  try {
    const result = {
      sqlEnabled: USE_SQL,
      mode: USE_SQL ? 'SQL Server' : 'JSON File',
      timestamp: new Date().toISOString()
    };
    
    if (USE_SQL) {
      console.log(`🔍 [DIAGNOSTIC] Testando conexão SQL Server`);
      try {
        // Testar conexão SQL
        const users = await loadFromDB('marh_users');
        result.sqlConnection = 'OK';
        result.sqlUserCount = users.length;
        result.dataSource = 'SQL Server Database';
        console.log(`✅ [DIAGNOSTIC] SQL Server OK - ${users.length} usuários encontrados`);
      } catch (error) {
        result.sqlConnection = 'ERROR';
        result.sqlError = error.message;
        result.dataSource = 'JSON File (Fallback)';
        console.log(`❌ [DIAGNOSTIC] SQL Server com erro: ${error.message}`);
      }
    } else {
      console.log(`📄 [DIAGNOSTIC] Usando modo JSON`);
      const db = loadDB();
      result.jsonUserCount = db.users?.length || 0;
      result.dataSource = 'JSON File';
      console.log(`✅ [DIAGNOSTIC] JSON OK - ${result.jsonUserCount} usuários encontrados`);
    }
    
    console.log(`📊 [DIAGNOSTIC] Resultado:`, result);
    res.json(result);
  } catch (error) {
    console.error(`❌ [DIAGNOSTIC] Erro no diagnóstico:`, error);
    res.status(500).json({
      error: 'Erro no diagnóstico',
      message: error.message
    });
  }
});

// Auth
app.post('/api/login', async (req,res)=>{
  const {email, password} = req.body || {};
  
  // Buscar usuário no SQL ou JSON
  let user;
  if (USE_SQL) {
    console.log(`🔐 [LOGIN] Verificando credenciais no SQL Server`);
    try {
      const users = await loadFromDB('marh_users', `email = '${email}' AND pass = '${password}' AND active = 1`);
      user = users[0];
      console.log(`${user ? '✅' : '❌'} [LOGIN] Usuário ${user ? 'encontrado' : 'não encontrado'} no SQL Server`);
    } catch (error) {
      console.log(`❌ [LOGIN] Erro no SQL Server, usando JSON como fallback:`, error.message);
      const db = loadDB();
      user = db.users.find(u => u.email === email && u.pass === password && u.active);
      console.log(`${user ? '✅' : '❌'} [LOGIN] Usuário ${user ? 'encontrado' : 'não encontrado'} no JSON (fallback)`);
    }
  } else {
    console.log(`📄 [LOGIN] Verificando credenciais no JSON`);
    const db = loadDB();
    user = db.users.find(u => u.email === email && u.pass === password && u.active);
    console.log(`${user ? '✅' : '❌'} [LOGIN] Usuário ${user ? 'encontrado' : 'não encontrado'} no JSON`);
  }
  
  if(!user){ return res.status(401).json({error:'Credenciais inválidas'}); }
  const code = (''+Math.floor(100000+Math.random()*900000));
  pendingMFA.set(email, code);
  console.log(`📱 [LOGIN] Código MFA gerado para ${email}: ${code}`);
  return res.json({mfa:true, demoCode: code});
});
app.post('/api/mfa', async (req,res)=>{
  const {email, code} = req.body || {};
  const expected = pendingMFA.get(email);
  if(!expected || expected !== code){ return res.status(401).json({error:'Código inválido'}); }
  pendingMFA.delete(email);
  
  // Buscar usuário para o token
  let user;
  if (USE_SQL) {
    console.log(`🎫 [MFA] Buscando dados do usuário no SQL Server para gerar token`);
    try {
      const users = await loadFromDB('marh_users', `email = '${email}' AND active = 1`);
      user = users[0];
      console.log(`✅ [MFA] Usuário encontrado no SQL Server: ${user?.name}`);
    } catch (error) {
      console.log(`❌ [MFA] Erro no SQL Server, usando JSON como fallback`);
      const db = loadDB();
      user = db.users.find(u=>u.email===email && u.active);
      console.log(`✅ [MFA] Usuário encontrado no JSON: ${user?.name}`);
    }
  } else {
    console.log(`📄 [MFA] Buscando dados do usuário no JSON para gerar token`);
    const db = loadDB();
    user = db.users.find(u=>u.email===email && u.active);
    console.log(`✅ [MFA] Usuário encontrado no JSON: ${user?.name}`);
  }
  
  if(!user){ return res.status(401).json({error:'Usuário não encontrado'}); }
  const token = uid('T');
  sessions.set(token, {id:user.id, email:user.email, name:user.name, role:user.role});
  await log(user.email, 'login', 'acesso concedido');
  console.log(`🚀 [MFA] Token gerado com sucesso para ${user.name} (${user.role})`);
  res.json({token, role:user.role, name:user.name});
});

function auth(req,res,next){
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if(!token || !sessions.has(token)){ return res.status(401).json({error:'Não autenticado'}); }
  req.user = sessions.get(token); next();
}
function requireRole(...roles){
  return (req,res,next)=> roles.includes(req.user.role) ? next() : res.status(403).json({error:'Sem permissão'});
}

function listEndpoint(coll, filterFn=null){ 
  return async (req,res)=> {
    try {
      let data;
      if (USE_SQL && TABLE_MAPPING[coll]) {
        console.log(`📊 [${coll.toUpperCase()}] Buscando dados do SQL Server (tabela: ${TABLE_MAPPING[coll]})`);
        data = await loadFromDB(TABLE_MAPPING[coll]);
        console.log(`✅ [${coll.toUpperCase()}] ${data.length} registros carregados do SQL Server`);
      } else {
        console.log(`📄 [${coll.toUpperCase()}] Buscando dados do JSON (db.json)`);
        const db = loadDB(); 
        data = db[coll] || [];
        console.log(`✅ [${coll.toUpperCase()}] ${data.length} registros carregados do JSON`);
      }
      
      if(filterFn) data = data.filter(x=> filterFn(x, req.user, { [coll]: data }));
      res.json(data);
    } catch (error) {
      console.error(`❌ [${coll.toUpperCase()}] Erro no SQL Server, usando JSON como fallback:`, error.message);
      const db = loadDB(); 
      let data = db[coll] || [];
      console.log(`🔄 [${coll.toUpperCase()}] ${data.length} registros carregados do JSON (fallback)`);
      if(filterFn) data = data.filter(x=> filterFn(x, req.user, db));
      res.json(data);
    }
  }; 
}

function getOne(coll){ 
  return async (req,res)=> {
    try {
      let item;
      if (USE_SQL && TABLE_MAPPING[coll]) {
        console.log(`🔍 [${coll.toUpperCase()}] Buscando item ${req.params.id} no SQL Server`);
        const data = await loadFromDB(TABLE_MAPPING[coll], `id = '${req.params.id}'`);
        item = data[0];
        console.log(`${item ? '✅' : '❌'} [${coll.toUpperCase()}] Item ${item ? 'encontrado' : 'não encontrado'} no SQL Server`);
      } else {
        console.log(`📄 [${coll.toUpperCase()}] Buscando item ${req.params.id} no JSON`);
        const db = loadDB(); 
        item = (db[coll] || []).find(x => x.id === req.params.id);
        console.log(`${item ? '✅' : '❌'} [${coll.toUpperCase()}] Item ${item ? 'encontrado' : 'não encontrado'} no JSON`);
      }
      
      if(!item) return res.status(404).json({error:'Não encontrado'});
      res.json(item);
    } catch (error) {
      console.error(`Erro ao buscar ${coll} ${req.params.id}:`, error);
      const db = loadDB(); 
      const item = (db[coll] || []).find(x => x.id === req.params.id);
      if(!item) return res.status(404).json({error:'Não encontrado'});
      res.json(item);
    }
  }; 
}

function createEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ 
  return [requireRole(...roles), async (req,res)=> {
    try {
      const obj = req.body || {};
      obj.id = obj.id || uid(coll.slice(0,3).toUpperCase());
      
      if (USE_SQL && TABLE_MAPPING[coll]) {
        await insertToDB(TABLE_MAPPING[coll], obj);
      } else {
        const db = loadDB();
        (db[coll] = db[coll] || []).unshift(obj);
        saveDB(db);
      }
      
      await log(req.user.email, coll + '.new', obj.id);
      res.json(obj);
    } catch (error) {
      console.error(`Erro ao criar ${coll}:`, error);
      const db = loadDB();
      const obj = req.body || {};
      obj.id = obj.id || uid(coll.slice(0,3).toUpperCase());
      (db[coll] = db[coll] || []).unshift(obj);
      await log(req.user.email, coll + '.new', obj.id);
      saveDB(db);
      res.json(obj);
    }
  }]; 
}

function updateEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ 
  return [requireRole(...roles), async (req,res)=> {
    try {
      if (USE_SQL && TABLE_MAPPING[coll]) {
        await updateInDB(TABLE_MAPPING[coll], req.params.id, req.body);
        await log(req.user.email, coll + '.save', req.params.id);
        res.json({ ...req.body, id: req.params.id });
      } else {
        const db = loadDB();
        const idx = (db[coll] || []).findIndex(x => x.id === req.params.id);
        if(idx < 0) return res.status(404).json({error:'Não encontrado'});
        db[coll][idx] = { ...db[coll][idx], ...req.body };
        await log(req.user.email, coll + '.save', req.params.id);
        saveDB(db);
        res.json(db[coll][idx]);
      }
    } catch (error) {
      console.error(`Erro ao atualizar ${coll} ${req.params.id}:`, error);
      const db = loadDB();
      const idx = (db[coll] || []).findIndex(x => x.id === req.params.id);
      if(idx < 0) return res.status(404).json({error:'Não encontrado'});
      db[coll][idx] = { ...db[coll][idx], ...req.body };
      await log(req.user.email, coll + '.save', req.params.id);
      saveDB(db);
      res.json(db[coll][idx]);
    }
  }]; 
}

function deleteEndpoint(coll, roles=['ADMIN']){ 
  return [requireRole(...roles), async (req,res)=> {
    try {
      if (USE_SQL && TABLE_MAPPING[coll]) {
        await deleteFromDB(TABLE_MAPPING[coll], req.params.id);
      } else {
        const db = loadDB();
        db[coll] = (db[coll] || []).filter(x => x.id !== req.params.id);
        saveDB(db);
      }
      
      await log(req.user.email, coll + '.delete', req.params.id);
      res.json({ok: true});
    } catch (error) {
      console.error(`Erro ao deletar ${coll} ${req.params.id}:`, error);
      const db = loadDB();
      db[coll] = (db[coll] || []).filter(x => x.id !== req.params.id);
      await log(req.user.email, coll + '.delete', req.params.id);
      saveDB(db);
      res.json({ok: true});
    }
  }]; 
}

// Dashboard summary
app.get('/api/summary', auth, async (req,res)=>{
  try {
    if (USE_SQL) {
      const summary = await getDashboardSummary();
      res.json(summary);
    } else {
      const db = loadDB();
      const totalEmp = db.employees.length;
      const ativos = db.employees.filter(e=>e.status==='ATIVO').length;
      const onLeave = db.leaves.filter(l=>l.status==='APROVADO').length;
      const openJobs = db.jobs.filter(j=>j.status==='ABERTA').length;
      res.json({totalEmp, ativos, onLeave, openJobs});
    }
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    const db = loadDB();
    const totalEmp = db.employees.length;
    const ativos = db.employees.filter(e=>e.status==='ATIVO').length;
    const onLeave = db.leaves.filter(l=>l.status==='APROVADO').length;
    const openJobs = db.jobs.filter(j=>j.status==='ABERTA').length;
    res.json({totalEmp, ativos, onLeave, openJobs});
  }
});
app.get('/api/logs', auth, requireRole('ADMIN','RH'), async (req,res)=>{
  try {
    if (USE_SQL) {
      const logs = await loadFromDB('marh_logs', null, 'ORDER BY id DESC LIMIT 100');
      res.json(logs);
    } else {
      const db = loadDB(); 
      res.json(db.logs);
    }
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    const db = loadDB(); 
    res.json(db.logs);
  }
});

// Users (ADMIN)
app.get('/api/users', auth, requireRole('ADMIN'), async (req,res) => {
  try {
    if (USE_SQL) {
      const users = await loadFromDB('marh_users');
      res.json(users);
    } else {
      const dbData = loadDB();
      res.json(dbData.users || []);
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    const dbData = loadDB();
    res.json(dbData.users || []);
  }
});

app.post('/api/users', auth, requireRole('ADMIN'), async (req,res) => {
  try {
    const user = { ...req.body, id: uid('U') };
    if (USE_SQL) {
      await insertToDB('marh_users', user);
    } else {
      const dbData = loadDB();
      (dbData.users = dbData.users || []).push(user);
      saveDB(dbData);
    }
    await log(req.user.email, 'users.new', user.email);
    res.json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    const dbData = loadDB();
    const user = { ...req.body, id: uid('U') };
    (dbData.users = dbData.users || []).push(user);
    await log(req.user.email, 'users.new', user.email);
    saveDB(dbData);
    res.json(user);
  }
});

app.put('/api/users/:id', auth, requireRole('ADMIN'), async (req,res) => {
  try {
    if (USE_SQL) {
      await updateInDB('marh_users', req.params.id, req.body);
    } else {
      const dbData = loadDB();
      const idx = dbData.users.findIndex(x => x.id === req.params.id);
      if (idx < 0) return res.status(404).json({error:'Não encontrado'});
      dbData.users[idx] = { ...dbData.users[idx], ...req.body };
      saveDB(dbData);
    }
    await log(req.user.email, 'users.save', req.body.email);
    res.json({ ...req.body, id: req.params.id });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    const dbData = loadDB();
    const idx = dbData.users.findIndex(x => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({error:'Não encontrado'});
    dbData.users[idx] = { ...dbData.users[idx], ...req.body };
    await log(req.user.email, 'users.save', dbData.users[idx].email);
    saveDB(dbData);
    res.json(dbData.users[idx]);
  }
});

app.delete('/api/users/:id', auth, requireRole('ADMIN'), async (req,res) => {
  try {
    if (USE_SQL) {
      await deleteFromDB('marh_users', req.params.id);
    } else {
      const dbData = loadDB();
      const idx = dbData.users.findIndex(x => x.id === req.params.id);
      if (idx < 0) return res.status(404).json({error:'Não encontrado'});
      const deleted = dbData.users.splice(idx, 1)[0];
      saveDB(dbData);
    }
    await log(req.user.email, 'users.delete', req.params.id);
    res.json({success: true});
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    const dbData = loadDB();
    const idx = dbData.users.findIndex(x => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({error:'Não encontrado'});
    const deleted = dbData.users.splice(idx, 1)[0];
    await log(req.user.email, 'users.delete', deleted.email);
    saveDB(dbData);
    res.json({success: true});
  }
});

// Employees (COLAB vê apenas a si próprio)
app.get('/api/employees', auth, listEndpoint('employees', (e,u,db)=> u.role==='COLAB' ? ((e.userId===u.id) || (e.email===u.email)) : true ));
app.get('/api/employees/:id', auth, getOne('employees'));
app.post('/api/employees', auth, ...createEndpoint('employees', ['ADMIN','RH']));
app.put('/api/employees/:id', auth, ...updateEndpoint('employees', ['ADMIN','RH','GESTOR']));
app.delete('/api/employees/:id', auth, ...deleteEndpoint('employees', ['ADMIN']));

// Departments
app.get('/api/departments', auth, listEndpoint('departments'));
app.post('/api/departments', auth, ...createEndpoint('departments', ['ADMIN','RH']));
app.put('/api/departments/:id', auth, ...updateEndpoint('departments', ['ADMIN','RH']));
app.delete('/api/departments/:id', auth, ...deleteEndpoint('departments', ['ADMIN']));

// Attendance
app.get('/api/attendance', auth, listEndpoint('attendance', (a,u,db)=>{
  if(u.role==='COLAB'){ const me = db.employees.find(e=>e.userId===u.id); return me && me.id===a.empId; } return true;
}));
app.post('/api/attendance', auth, ...createEndpoint('attendance', ['ADMIN','RH','GESTOR','COLAB']));
app.put('/api/attendance/:id', auth, ...updateEndpoint('attendance', ['ADMIN','RH','GESTOR']));
app.delete('/api/attendance/:id', auth, ...deleteEndpoint('attendance', ['ADMIN']));

// Leaves
app.get('/api/leaves', auth, listEndpoint('leaves', (l,u,db)=>{
  if(u.role==='COLAB'){ const me = db.employees.find(e=>e.userId===u.id); return me && me.id===l.empId; } return true;
}));
app.post('/api/leaves', auth, ...createEndpoint('leaves', ['ADMIN','RH','GESTOR','COLAB']));
app.put('/api/leaves/:id', auth, ...updateEndpoint('leaves', ['ADMIN','RH','GESTOR']));
app.delete('/api/leaves/:id', auth, ...deleteEndpoint('leaves', ['ADMIN']));

// Payroll
app.get('/api/payroll', auth, listEndpoint('payroll', (p,u,db)=>{
  if(u.role==='COLAB'){ const me = db.employees.find(e=>e.userId===u.id); return me && me.id===p.empId; } return true;
}));
app.post('/api/payroll', auth, ...createEndpoint('payroll', ['ADMIN','RH']));
app.put('/api/payroll/:id', auth, ...updateEndpoint('payroll', ['ADMIN','RH']));
app.delete('/api/payroll/:id', auth, ...deleteEndpoint('payroll', ['ADMIN']));

// Reviews
app.get('/api/reviews', auth, listEndpoint('reviews', (r,u,db)=>{
  if(u.role==='COLAB'){ const me = db.employees.find(e=>e.userId===u.id); return me && me.id===r.empId; } return true;
}));
app.post('/api/reviews', auth, ...createEndpoint('reviews', ['ADMIN','RH','GESTOR']));
app.put('/api/reviews/:id', auth, ...updateEndpoint('reviews', ['ADMIN','RH','GESTOR']));
app.delete('/api/reviews/:id', auth, ...deleteEndpoint('reviews', ['ADMIN']));

// Trainings
app.get('/api/trainings', auth, listEndpoint('trainings'));
app.post('/api/trainings', auth, ...createEndpoint('trainings', ['ADMIN','RH','GESTOR']));
app.put('/api/trainings/:id', auth, ...updateEndpoint('trainings', ['ADMIN','RH','GESTOR']));
app.delete('/api/trainings/:id', auth, ...deleteEndpoint('trainings', ['ADMIN']));

// Jobs & Candidates
app.get('/api/jobs', auth, listEndpoint('jobs'));
app.post('/api/jobs', auth, ...createEndpoint('jobs', ['ADMIN','RH']));
app.put('/api/jobs/:id', auth, ...updateEndpoint('jobs', ['ADMIN','RH']));
app.delete('/api/jobs/:id', auth, ...deleteEndpoint('jobs', ['ADMIN']));
app.get('/api/candidates', auth, listEndpoint('candidates'));
app.post('/api/candidates', auth, ...createEndpoint('candidates', ['ADMIN','RH']));
app.put('/api/candidates/:id', auth, ...updateEndpoint('candidates', ['ADMIN','RH']));
app.delete('/api/candidates/:id', auth, ...deleteEndpoint('candidates', ['ADMIN']));

// Settings
app.get('/api/settings', auth, (req,res)=>{ const db=loadDB(); res.json(db.settings||{}); });
app.put('/api/settings', auth, requireRole('ADMIN','RH'), (req,res)=>{ const db=loadDB(); db.settings={...(db.settings||{}), ...(req.body||{})}; log(db, req.user.email, 'settings.save', JSON.stringify(db.settings)); saveDB(db); res.json(db.settings); });

// Documents Management - SIMPLIFIED
app.get('/api/employees/:empId/documents', auth, (req, res) => {
  const db = loadDB();
  const empId = req.params.empId;
  
  // Check if user has permission to view employee documents
  if (req.user.role === 'COLAB') {
    const employee = db.employees.find(e => e.id === empId);
    if (!employee || (employee.userId !== req.user.id && employee.email !== req.user.email)) {
      return res.status(403).json({ error: 'Sem permissão para visualizar documentos' });
    }
  }
  
  const documents = db.documents ? db.documents.filter(d => d.empId === empId) : [];
  res.json(documents);
});

app.post('/api/employees/:empId/documents', auth, requireRole('ADMIN', 'RH', 'GESTOR'), (req, res) => {
  try {
    const db = loadDB();
    const empId = req.params.empId;
    
    // Check if employee exists
    const employee = db.employees.find(e => e.id === empId);
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    const { fileName, fileData, type, description, expirationDate, notes } = req.body;
    
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Nome do arquivo e dados são obrigatórios' });
    }
    
    const document = {
      id: uid('DOC'),
      empId: empId,
      type: type || 'OUTROS',
      description: description || '',
      fileName: fileName,
      fileData: fileData, // Base64 data
      fileSize: Math.round(fileData.length * 0.75), // Approximate size from base64
      mimeType: 'application/pdf',
      uploadDate: new Date().toISOString().split('T')[0],
      expirationDate: expirationDate || null,
      uploadedBy: req.user.email,
      notes: notes || ''
    };
    
    // Initialize documents array if it doesn't exist
    if (!db.documents) {
      db.documents = [];
    }
    
    db.documents.push(document);
    log(db, req.user.email, 'documents.upload', `${empId}:${document.fileName}`);
    saveDB(db);
    
    // Return without fileData to avoid large response
    const response = { ...document };
    delete response.fileData;
    response.isExpired = document.expirationDate && new Date(document.expirationDate) < new Date();
    
    res.json(response);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
});

app.get('/api/documents/:docId/download', auth, (req, res) => {
  const db = loadDB();
  const docId = req.params.docId;
  const document = db.documents ? db.documents.find(d => d.id === docId) : null;
  
  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado' });
  }
  
  // Check permissions
  if (req.user.role === 'COLAB') {
    const employee = db.employees.find(e => e.id === document.empId);
    if (!employee || (employee.userId !== req.user.id && employee.email !== req.user.email)) {
      return res.status(403).json({ error: 'Sem permissão para baixar documento' });
    }
  }
  
  if (!document.fileData) {
    return res.status(404).json({ error: 'Dados do arquivo não encontrados' });
  }

  // Convert base64 back to buffer
  const buffer = Buffer.from(document.fileData, 'base64');
  
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  res.send(buffer);
});

// Simplified download endpoint - returns document data as JSON
app.get('/api/documents/:docId/data', auth, (req, res) => {
  console.log('📥 Download request for docId:', req.params.docId);
  const db = loadDB();
  const docId = req.params.docId;
  const document = db.documents ? db.documents.find(d => d.id === docId) : null;
  
  if (!document) {
    console.log('❌ Documento não encontrado:', docId);
    return res.status(404).json({ error: 'Documento não encontrado' });
  }
  
  console.log('✅ Documento encontrado:', document.fileName);
  
  // Check permissions
  if (req.user.role === 'COLAB') {
    const employee = db.employees.find(e => e.id === document.empId);
    if (!employee || (employee.userId !== req.user.id && employee.email !== req.user.email)) {
      console.log('❌ Sem permissão para documento:', docId);
      return res.status(403).json({ error: 'Sem permissão para baixar documento' });
    }
  }
  
  if (!document.fileData) {
    console.log('❌ Dados do arquivo não encontrados:', docId);
    return res.status(404).json({ error: 'Dados do arquivo não encontrados' });
  }
  
  console.log('📤 Enviando dados do documento:', document.fileName, 'Size:', document.fileData.length);
  
  // Return document data as JSON
  res.json({
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileData: document.fileData
  });
});

// Test endpoint for debugging
app.get('/api/test-auth', auth, (req, res) => {
  res.json({ 
    message: 'Autenticação OK', 
    user: req.user.email,
    role: req.user.role 
  });
});

app.delete('/api/documents/:docId', auth, requireRole('ADMIN', 'RH'), (req, res) => {
  const db = loadDB();
  const docId = req.params.docId;
  const documentIndex = db.documents ? db.documents.findIndex(d => d.id === docId) : -1;
  
  if (documentIndex === -1) {
    return res.status(404).json({ error: 'Documento não encontrado' });
  }
  
  const document = db.documents[documentIndex];
  
  try {
    // Remove from database
    db.documents.splice(documentIndex, 1);
    log(db, req.user.email, 'documents.delete', `${document.empId}:${document.fileName}`);
    saveDB(db);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
});

// Export CSV
app.get('/api/export/:entity.csv', auth, (req,res)=>{
  const db = loadDB();
  const entity = req.params.entity;
  const arr = db[entity];
  if(!arr || !arr.length){ return res.status(404).send('Sem dados'); }
  const cols = Object.keys(arr[0]);
  const csv = [cols.join(';')].concat(arr.map(o=> cols.map(c=> JSON.stringify(o[c]??'')).join(';'))).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="MARH_${entity}.csv"`);
  res.send(csv);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=> {
  console.log(`🚀 MARH Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Access: http://localhost:${PORT}`);
});