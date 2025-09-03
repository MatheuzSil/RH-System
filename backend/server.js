import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadFromDB, insertToDB, updateInDB, deleteFromDB, logToDB, getDashboardSummary } from './utils/dbHelpers.js';
import { config } from 'dotenv';
import BulkDocumentUploader from './bulk-uploader.js';
import DocumentStorageOptimizer from './storage-optimization.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'db.json');
const DOCUMENTS_DIR = path.join(__dirname, '../documents');

// Variável para controlar se usamos SQL ou JSON
const USE_SQL = process.env.USE_SQL === 'true';

// Mapeamento de coleções para tabelas SQL (incluindo documentos)
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
  candidates: 'marh_candidates',
  documents: 'marh_documents',
  logs: 'marh_logs'
};

// Initialize bulk systems
const bulkUploader = new BulkDocumentUploader(DOCUMENTS_DIR);
const storageOptimizer = new DocumentStorageOptimizer(DOCUMENTS_DIR);

// Log do modo atual
console.log(`\n🔄 MARH Backend iniciado no modo: ${USE_SQL ? '🗄️ SQL SERVER' : '📄 JSON'}`);
console.log(`📊 Fonte de dados: ${USE_SQL ? 'SQL Server Database' : 'JSON File (db.json)'}`);
console.log(`🔗 USE_SQL=${USE_SQL}\n`);

function loadDB(){ return JSON.parse(fs.readFileSync(DATA_PATH,'utf-8')); }
function saveDB(db){ fs.writeFileSync(DATA_PATH, JSON.stringify(db,null,2), 'utf-8'); }
function uid(prefix='ID'){ return prefix + '_' + Math.random().toString(36).slice(2,8).toUpperCase(); }
function log(db, who, action, details=''){ db.logs.unshift({at:new Date().toLocaleString('pt-BR'), who, action, details}); }

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

// === BULK DOCUMENTS ENDPOINTS ===

// Upload em lote
app.post('/api/documents/bulk-upload', auth, requireRole('ADMIN', 'RH'), bulkUploader.handleBulkUpload(), async (req, res) => {
  try {
    const { empId, type, description, expirationDate } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!empId) {
      return res.status(400).json({ error: 'ID do funcionário é obrigatório' });
    }

    const metadata = {
      type: type || 'DOCUMENTO_GERAL',
      description: description || 'Upload em lote',
      expirationDate: expirationDate || null,
      uploadedBy: req.user.email,
      batchId: `BATCH_${Date.now()}`
    };

    console.log(`📤 Iniciando upload em lote: ${files.length} arquivos para funcionário ${empId}`);

    const results = await bulkUploader.processBulkUpload(files, empId, metadata);
    
    // Salvar documentos no banco
    const db = loadDB();
    if (!db.documents) db.documents = [];

    results.success.forEach(doc => {
      db.documents.push(doc);
    });

    log(db, req.user.email, 'documents.bulk_upload', `${empId}:${results.success.length} arquivos`);
    saveDB(db);

    res.json({
      message: 'Upload em lote processado',
      results: {
        total: results.total,
        success: results.success.length,
        failed: results.failed.length,
        processedSize: results.processedSize
      },
      details: results
    });

  } catch (error) {
    console.error('❌ Erro no upload em lote:', error);
    res.status(500).json({ error: 'Erro no upload em lote: ' + error.message });
  }
});

// Estatísticas de documentos
app.get('/api/documents/stats', auth, (req, res) => {
  try {
    const db = loadDB();
    const documents = db.documents || [];
    const employees = db.employees || [];
    
    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
      employeesWithDocs: new Set(documents.map(doc => doc.empId)).size,
      totalEmployees: employees.length,
      documentsByType: {},
      documentsByMonth: {},
      expiredDocs: 0,
      expiringDocs: 0
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    documents.forEach(doc => {
      // Por tipo
      stats.documentsByType[doc.type] = (stats.documentsByType[doc.type] || 0) + 1;
      
      // Por mês
      const month = doc.uploadDate ? new Date(doc.uploadDate).toISOString().slice(0, 7) : 'unknown';
      stats.documentsByMonth[month] = (stats.documentsByMonth[month] || 0) + 1;
      
      // Expiração
      if (doc.expirationDate) {
        const expiryDate = new Date(doc.expirationDate);
        if (expiryDate < now) {
          stats.expiredDocs++;
        } else if (expiryDate < thirtyDaysFromNow) {
          stats.expiringDocs++;
        }
      }
    });

    res.json(stats);
    
  } catch (error) {
    console.error('❌ Erro ao calcular estatísticas:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// Busca avançada de documentos
app.get('/api/documents/search', auth, (req, res) => {
  try {
    const db = loadDB();
    const documents = db.documents || [];
    const employees = db.employees || [];
    
    const { query, type, status, empId, page = 1, limit = 50 } = req.query;
    
    let filteredDocs = documents;

    // Filtro por funcionário
    if (empId) {
      filteredDocs = filteredDocs.filter(doc => doc.empId === empId);
    }

    // Filtro por tipo
    if (type) {
      filteredDocs = filteredDocs.filter(doc => doc.type === type);
    }

    // Filtro por status de expiração
    if (status) {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      filteredDocs = filteredDocs.filter(doc => {
        if (!doc.expirationDate) return status === 'valid';
        
        const expiryDate = new Date(doc.expirationDate);
        
        switch (status) {
          case 'expired': return expiryDate < now;
          case 'expiring': return expiryDate >= now && expiryDate < thirtyDaysFromNow;
          case 'valid': return expiryDate >= thirtyDaysFromNow;
          default: return true;
        }
      });
    }

    // Busca textual
    if (query) {
      const searchQuery = query.toLowerCase();
      filteredDocs = filteredDocs.filter(doc => {
        const employee = employees.find(emp => emp.id === doc.empId);
        return (
          doc.fileName.toLowerCase().includes(searchQuery) ||
          doc.description.toLowerCase().includes(searchQuery) ||
          doc.type.toLowerCase().includes(searchQuery) ||
          (employee && employee.name.toLowerCase().includes(searchQuery))
        );
      });
    }

    // Paginação
    const total = filteredDocs.length;
    const pageSize = parseInt(limit);
    const pageNum = parseInt(page);
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedDocs = filteredDocs.slice(startIndex, startIndex + pageSize);

    // Adicionar informações do funcionário
    const docsWithEmployeeInfo = paginatedDocs.map(doc => {
      const employee = employees.find(emp => emp.id === doc.empId);
      return {
        ...doc,
        employeeName: employee ? employee.name : 'Funcionário não encontrado',
        fileData: undefined // Não incluir dados do arquivo na busca
      };
    });

    res.json({
      documents: docsWithEmployeeInfo,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: total,
        pages: Math.ceil(total / pageSize)
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na busca de documentos:', error);
    res.status(500).json({ error: 'Erro na busca de documentos' });
  }
});

// Exclusão em lote
app.delete('/api/documents/bulk-delete', auth, requireRole('ADMIN', 'RH'), (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'IDs dos documentos são obrigatórios' });
    }

    const db = loadDB();
    const initialCount = db.documents ? db.documents.length : 0;
    
    if (!db.documents) {
      return res.status(404).json({ error: 'Nenhum documento encontrado' });
    }

    const deletedDocs = [];
    db.documents = db.documents.filter(doc => {
      if (documentIds.includes(doc.id)) {
        deletedDocs.push(doc);
        return false;
      }
      return true;
    });

    const deletedCount = deletedDocs.length;
    
    log(db, req.user.email, 'documents.bulk_delete', `${deletedCount} documentos excluídos`);
    saveDB(db);

    res.json({
      message: `${deletedCount} documentos excluídos com sucesso`,
      deleted: deletedCount,
      remaining: db.documents.length
    });
    
  } catch (error) {
    console.error('❌ Erro na exclusão em lote:', error);
    res.status(500).json({ error: 'Erro na exclusão em lote' });
  }
});

// Status do sistema de armazenamento
app.get('/api/storage/status', auth, requireRole('ADMIN'), (req, res) => {
  try {
    const documentsPath = DOCUMENTS_DIR;
    
    if (!fs.existsSync(documentsPath)) {
      return res.json({
        status: 'not_initialized',
        message: 'Diretório de documentos não existe'
      });
    }

    const getDirectorySize = (dirPath) => {
      let size = 0;
      let fileCount = 0;
      
      const scan = (currentPath) => {
        const items = fs.readdirSync(currentPath);
        items.forEach(item => {
          const itemPath = path.join(currentPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            scan(itemPath);
          } else {
            size += stats.size;
            fileCount++;
          }
        });
      };
      
      scan(dirPath);
      return { size, fileCount };
    };

    const { size, fileCount } = getDirectorySize(documentsPath);
    const employees = fs.existsSync(path.join(documentsPath, 'employees')) 
      ? fs.readdirSync(path.join(documentsPath, 'employees')).length 
      : 0;

    res.json({
      status: 'active',
      storage: {
        totalSize: size,
        totalFiles: fileCount,
        employeeFolders: employees,
        path: documentsPath
      },
      system: {
        maxFileSize: bulkUploader.maxFileSize,
        maxConcurrentUploads: bulkUploader.maxConcurrentUploads,
        supportedTypes: [
          'application/pdf',
          'image/jpeg', 
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status do armazenamento:', error);
    res.status(500).json({ error: 'Erro ao verificar status do armazenamento' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=> {
  console.log(`🚀 MARH Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Access: http://localhost:${PORT}`);
  console.log(`📁 Documents directory: ${DOCUMENTS_DIR}`);
});