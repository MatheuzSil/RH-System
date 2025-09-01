import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'db.json');
const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// Create documents directory if it doesn't exist
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

function loadDB(){ return JSON.parse(fs.readFileSync(DATA_PATH,'utf-8')); }
function saveDB(db){ fs.writeFileSync(DATA_PATH, JSON.stringify(db,null,2), 'utf-8'); }
function uid(prefix='ID'){ return prefix + '_' + Math.random().toString(36).slice(2,8).toUpperCase(); }
function log(db, who, action, details=''){ db.logs.unshift({at:new Date().toLocaleString('pt-BR'), who, action, details}); }

const sessions = new Map();
const pendingMFA = new Map();

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empId = req.body.empId;
    const empDir = path.join(DOCUMENTS_DIR, empId);
    if (!fs.existsSync(empDir)) {
      fs.mkdirSync(empDir, { recursive: true });
    }
    cb(null, empDir);
  },
  filename: (req, file, cb) => {
    const docId = uid('DOC');
    const extension = path.extname(file.originalname);
    cb(null, `${docId}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos'), false);
    }
  }
});

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

app.use(express.json());

// API Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MARH Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: ['/api/login', '/api/mfa'],
      data: ['/api/employees', '/api/departments', '/api/attendance', '/api/leaves', '/api/payroll', '/api/reviews', '/api/trainings', '/api/jobs', '/api/candidates'],
      admin: ['/api/users', '/api/logs', '/api/settings']
    }
  });
});

// Auth
app.post('/api/login', (req,res)=>{
  const {email, password} = req.body || {};
  const db = loadDB();
  const user = db.users.find(u => u.email === email && u.pass === password && u.active);
  if(!user){ return res.status(401).json({error:'Credenciais inválidas'}); }
  const code = (''+Math.floor(100000+Math.random()*900000));
  pendingMFA.set(email, code);
  return res.json({mfa:true, demoCode: code});
});
app.post('/api/mfa', (req,res)=>{
  const {email, code} = req.body || {};
  const expected = pendingMFA.get(email);
  if(!expected || expected !== code){ return res.status(401).json({error:'Código inválido'}); }
  pendingMFA.delete(email);
  const db = loadDB();
  const user = db.users.find(u=>u.email===email && u.active);
  if(!user){ return res.status(401).json({error:'Usuário não encontrado'}); }
  const token = uid('T');
  sessions.set(token, {id:user.id, email:user.email, name:user.name, role:user.role});
  log(db, user.email, 'login', 'acesso concedido'); saveDB(db);
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
  return (req,res)=>{ 
    const db=loadDB(); let data=db[coll]||[]; 
    if(filterFn) data = data.filter(x=> filterFn(x, req.user, db));
    res.json(data); 
  }; 
}
function getOne(coll){ return (req,res)=>{ const db=loadDB(); const it=(db[coll]||[]).find(x=>x.id===req.params.id); if(!it) return res.status(404).json({error:'Não encontrado'}); res.json(it); }; }
function createEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ return [requireRole(...roles),(req,res)=>{ const db=loadDB(); const obj=req.body||{}; obj.id=obj.id||uid(coll.slice(0,3).toUpperCase()); (db[coll]=db[coll]||[]).unshift(obj); log(db, req.user.email, coll+'.new', obj.id); saveDB(db); res.json(obj);}]; }
function updateEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ return [requireRole(...roles),(req,res)=>{ const db=loadDB(); const idx=(db[coll]||[]).findIndex(x=>x.id===req.params.id); if(idx<0) return res.status(404).json({error:'Não encontrado'}); db[coll][idx]={...db[coll][idx], ...req.body}; log(db, req.user.email, coll+'.save', req.params.id); saveDB(db); res.json(db[coll][idx]); }]; }
function deleteEndpoint(coll, roles=['ADMIN']){ return [requireRole(...roles),(req,res)=>{ const db=loadDB(); db[coll]=(db[coll]||[]).filter(x=>x.id!==req.params.id); log(db, req.user.email, coll+'.delete', req.params.id); saveDB(db); res.json({ok:true}); }]; }

// Dashboard summary
app.get('/api/summary', auth, (req,res)=>{
  const db = loadDB();
  const totalEmp = db.employees.length;
  const ativos = db.employees.filter(e=>e.status==='ATIVO').length;
  const onLeave = db.leaves.filter(l=>l.status==='APROVADO').length;
  const openJobs = db.jobs.filter(j=>j.status==='ABERTA').length;
  res.json({totalEmp, ativos, onLeave, openJobs});
});
app.get('/api/logs', auth, requireRole('ADMIN','RH'), (req,res)=>{
  const db = loadDB(); res.json(db.logs);
});

// Users (ADMIN)
app.get('/api/users', auth, requireRole('ADMIN'), (req,res)=>{ const db=loadDB(); res.json(db.users); });
app.post('/api/users', auth, requireRole('ADMIN'), (req,res)=>{ const db=loadDB(); const u={...(req.body||{}), id:uid('U')}; (db.users=db.users||[]).push(u); log(db, req.user.email, 'users.new', u.email); saveDB(db); res.json(u); });
app.put('/api/users/:id', auth, requireRole('ADMIN'), (req,res)=>{ const db=loadDB(); const idx=db.users.findIndex(x=>x.id===req.params.id); if(idx<0) return res.status(404).json({error:'Não encontrado'}); db.users[idx]={...db.users[idx], ...req.body}; log(db, req.user.email, 'users.save', db.users[idx].email); saveDB(db); res.json(db.users[idx]); });
app.delete('/api/users/:id', auth, ...deleteEndpoint('users', ['ADMIN']));

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

// Documents Management
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
  
  // Add expiration status to each document
  const documentsWithStatus = documents.map(doc => {
    const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
    return {
      ...doc,
      isExpired,
      size: formatFileSize(doc.fileSize)
    };
  });
  
  res.json(documentsWithStatus);
});

app.post('/api/employees/:empId/documents', auth, requireRole('ADMIN', 'RH', 'GESTOR'), upload.single('file'), (req, res) => {
  try {
    const db = loadDB();
    const empId = req.params.empId;
    
    // Check if employee exists
    const employee = db.employees.find(e => e.id === empId);
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }
    
    const document = {
      id: uid('DOC'),
      empId: empId,
      type: req.body.type || 'OUTROS',
      description: req.body.description || '',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadDate: new Date().toISOString().split('T')[0],
      expirationDate: req.body.expirationDate || null,
      uploadedBy: req.user.email,
      notes: req.body.notes || ''
    };
    
    // Initialize documents array if it doesn't exist
    if (!db.documents) {
      db.documents = [];
    }
    
    db.documents.push(document);
    log(db, req.user.email, 'documents.upload', `${empId}:${document.fileName}`);
    saveDB(db);
    
    res.json({
      id: document.id,
      type: document.type,
      description: document.description,
      fileName: document.fileName,
      uploadDate: document.uploadDate,
      expirationDate: document.expirationDate,
      size: formatFileSize(document.fileSize),
      notes: document.notes,
      isExpired: document.expirationDate && new Date(document.expirationDate) < new Date()
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
});

app.get('/api/documents/:docId/view', auth, (req, res) => {
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
      return res.status(403).json({ error: 'Sem permissão para visualizar documento' });
    }
  }
  
  const filePath = document.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo físico não encontrado' });
  }
  
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
  res.sendFile(filePath);
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
  
  const filePath = document.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo físico não encontrado' });
  }
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  res.sendFile(filePath);
});

app.delete('/api/documents/:docId', auth, requireRole('ADMIN', 'RH'), (req, res) => {
  const db = loadDB();
  const docId = req.params.docId;
  const document = db.documents ? db.documents.find(d => d.id === docId) : null;
  
  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado' });
  }
  
  try {
    // Remove physical file
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    // Remove from database
    db.documents = db.documents.filter(d => d.id !== docId);
    log(db, req.user.email, 'documents.delete', `${document.empId}:${document.fileName}`);
    saveDB(db);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
