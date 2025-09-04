  import express from 'express';
  import fs from 'fs';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import { 
    loadFromDB, 
    insertToDB, 
    updateInDB, 
    deleteFromDB, 
    logToDB, 
    getDashboardSummary,
    loadFilteredData,
    getSettings,
    saveSettings,
    insertDocumentsBulk,
    searchDocuments,
    getDocumentStats,
    deleteDocumentsBulk
  } from './utils/dbHelpers.js';
  import { config } from 'dotenv';
  import BulkDocumentUploader from './bulk-uploader.js';
  import DocumentStorageOptimizer from './storage-optimization.js';

  config();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const DOCUMENTS_DIR = path.join(__dirname, '../documents');

  // Sistema migrado completamente para SQL Server
  const USE_SQL = true;

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
  console.log(`\n🔄 MARH Backend iniciado no modo: 🗄️ SQL SERVER`);
  console.log(`📊 Fonte de dados: SQL Server Database`);
  console.log(`🔗 USE_SQL=${USE_SQL}\n`);

  function uid(prefix='ID'){ return prefix + '_' + Math.random().toString(36).slice(2,8).toUpperCase(); }

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
  app.post('/api/login', async (req,res)=>{
    try {
      const {email, password} = req.body || {};
      console.log('🔐 Tentativa de login:', email);
      const users = await loadFromDB('users', 'WHERE email = @email AND pass = @password AND active = 1', {email, password});
      const user = users[0];
      if(!user){ 
        console.log('❌ Usuário não encontrado ou senha inválida');
        return res.status(401).json({error:'Credenciais inválidas'}); 
      }
      console.log('✅ Login OK para:', user.email);
      const code = (''+Math.floor(100000+Math.random()*900000));
      pendingMFA.set(email, code);
      return res.json({mfa:true, demoCode: code});
    } catch (error) {
      console.error('💥 Erro no login:', error.message);
      return res.status(500).json({error:'Erro interno do servidor: ' + error.message});
    }
  });
  
  app.post('/api/mfa', async (req,res)=>{
    try {
      const {email, code} = req.body || {};
      const expected = pendingMFA.get(email);
      if(!expected || expected !== code){ return res.status(401).json({error:'Código inválido'}); }
      pendingMFA.delete(email);
      const users = await loadFromDB('users', 'WHERE email = @email AND active = 1', {email});
      const user = users[0];
      if(!user){ return res.status(401).json({error:'Usuário não encontrado'}); }
      const token = uid('T');
      sessions.set(token, {id:user.id, email:user.email, name:user.name, role:user.role});
      await logToDB(user.email, 'login', 'acesso concedido');
      res.json({token, role:user.role, name:user.name});
    } catch (error) {
      console.error('Erro no MFA:', error);
      return res.status(500).json({error:'Erro interno do servidor'});
    }
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
    return async (req,res)=>{ 
      try {
        let data;
        if (req.user.role === 'COLAB') {
          data = await loadFilteredData(coll, req.user.role, req.user.id, req.user.email);
        } else {
          data = await loadFromDB(coll);
        }
        if(filterFn) data = data.filter(x=> filterFn(x, req.user, {}));
        res.json(data);
      } catch (error) {
        console.error(`Erro ao carregar ${coll}:`, error);
        res.status(500).json({error:'Erro interno do servidor'});
      }
    }; 
  }
  
  function getOne(coll){ 
    return async (req,res)=>{ 
      try {
        const items = await loadFromDB(coll, 'WHERE id = @id', {id: req.params.id});
        const item = items[0];
        if(!item) return res.status(404).json({error:'Não encontrado'}); 
        res.json(item);
      } catch (error) {
        console.error(`Erro ao buscar ${coll}:`, error);
        res.status(500).json({error:'Erro interno do servidor'});
      }
    }; 
  }
  
  function createEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ 
    return [requireRole(...roles), async (req,res)=>{ 
      try {
        const obj = req.body || {}; 
        obj.id = obj.id || uid(coll.slice(0,3).toUpperCase()); 
        await insertToDB(coll, obj);
        await logToDB(req.user.email, coll+'.new', obj.id);
        res.json(obj);
      } catch (error) {
        console.error(`Erro ao criar ${coll}:`, error);
        res.status(500).json({error:'Erro interno do servidor'});
      }
    }]; 
  }
  
  function updateEndpoint(coll, roles=['ADMIN','RH','GESTOR']){ 
    return [requireRole(...roles), async (req,res)=>{ 
      try {
        const updated = await updateInDB(coll, req.params.id, req.body);
        await logToDB(req.user.email, coll+'.save', req.params.id);
        res.json(updated);
      } catch (error) {
        console.error(`Erro ao atualizar ${coll}:`, error);
        res.status(500).json({error:'Erro interno do servidor'});
      }
    }]; 
  }
  
  function deleteEndpoint(coll, roles=['ADMIN']){ 
    return [requireRole(...roles), async (req,res)=>{ 
      try {
        await deleteFromDB(coll, req.params.id);
        await logToDB(req.user.email, coll+'.delete', req.params.id);
        res.json({ok:true});
      } catch (error) {
        console.error(`Erro ao deletar ${coll}:`, error);
        res.status(500).json({error:'Erro interno do servidor'});
      }
    }]; 
  }

  // Dashboard summary
  app.get('/api/summary', auth, async (req,res)=>{
    try {
      const summary = await getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });
  
  app.get('/api/logs', auth, requireRole('ADMIN','RH'), async (req,res)=>{
    try {
      const logs = await loadFromDB('logs', 'ORDER BY id DESC');
      res.json(logs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });

  // Users (ADMIN)
  app.get('/api/users', auth, requireRole('ADMIN'), async (req,res)=>{ 
    try {
      const users = await loadFromDB('users');
      res.json(users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });
  
  app.post('/api/users', auth, requireRole('ADMIN'), async (req,res)=>{ 
    try {
      const u = {...(req.body||{}), id:uid('U')}; 
      await insertToDB('users', u);
      await logToDB(req.user.email, 'users.new', u.email);
      res.json(u);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });
  
  app.put('/api/users/:id', auth, requireRole('ADMIN'), async (req,res)=>{ 
    try {
      const updated = await updateInDB('users', req.params.id, req.body);
      await logToDB(req.user.email, 'users.save', updated.email);
      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });
  
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
  app.get('/api/settings', auth, async (req,res)=>{ 
    try {
      const settings = await getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });
  
  app.put('/api/settings', auth, requireRole('ADMIN','RH'), async (req,res)=>{ 
    try {
      const settings = await saveSettings(req.body || {});
      await logToDB(req.user.email, 'settings.save', JSON.stringify(settings));
      res.json(settings);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
  });

  // Documents Management - USING SQL SERVER
  app.get('/api/employees/:empId/documents', auth, async (req, res) => {
    try {
      const empId = req.params.empId;
      
      // Check if user has permission to view employee documents
      if (req.user.role === 'COLAB') {
        const employees = await loadFromDB('employees', 'WHERE id = @empId', {empId});
        const employee = employees[0];
        if (!employee || (employee.userId !== req.user.id && employee.email !== req.user.email)) {
          return res.status(403).json({ error: 'Sem permissão para visualizar documentos' });
        }
      }
      
      const documents = await loadFromDB('documents', 'WHERE empId = @empId', {empId});
      res.json(documents);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/employees/:empId/documents', auth, requireRole('ADMIN', 'RH', 'GESTOR'), async (req, res) => {
    try {
      const empId = req.params.empId;
      
      // Check if employee exists
      const employees = await loadFromDB('employees', 'WHERE id = @empId', {empId});
      const employee = employees[0];
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
      
      await insertToDB('documents', document);
      await logToDB(req.user.email, 'documents.upload', `${empId}:${document.fileName}`);
      
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

  app.get('/api/documents/:docId/download', auth, async (req, res) => {
    try {
      const docId = req.params.docId;
      const documents = await loadFromDB('documents', 'WHERE id = @docId', {docId});
      const document = documents[0];
      
      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }
      
      // Check permissions
      if (req.user.role === 'COLAB') {
        const employees = await loadFromDB('employees', 'WHERE id = @empId', {empId: document.empId});
        const employee = employees[0];
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
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Simplified download endpoint - returns document data as JSON
  app.get('/api/documents/:docId/data', auth, async (req, res) => {
    try {
      console.log('📥 Download request for docId:', req.params.docId);
      const docId = req.params.docId;
      const documents = await loadFromDB('documents', 'WHERE id = @docId', {docId});
      const document = documents[0];
      
      if (!document) {
        console.log('❌ Documento não encontrado:', docId);
        return res.status(404).json({ error: 'Documento não encontrado' });
      }
      
      console.log('✅ Documento encontrado:', document.fileName);
      
      // Check permissions
      if (req.user.role === 'COLAB') {
        const employees = await loadFromDB('employees', 'WHERE id = @empId', {empId: document.empId});
        const employee = employees[0];
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
    } catch (error) {
      console.error('Erro ao obter dados do documento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint for debugging
  app.get('/api/test-auth', auth, (req, res) => {
    res.json({ 
      message: 'Autenticação OK', 
      user: req.user.email,
      role: req.user.role 
    });
  });

  app.delete('/api/documents/:docId', auth, requireRole('ADMIN', 'RH'), async (req, res) => {
    try {
      const docId = req.params.docId;
      const documents = await loadFromDB('documents', 'WHERE id = @docId', {docId});
      const document = documents[0];
      
      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }
      
      await deleteFromDB('documents', docId);
      await logToDB(req.user.email, 'documents.delete', `${document.empId}:${document.fileName}`);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Erro ao excluir documento' });
    }
  });

  // Export CSV
  app.get('/api/export/:entity.csv', auth, async (req,res)=>{
    try {
      const entity = req.params.entity;
      const arr = await loadFromDB(entity);
      if(!arr || !arr.length){ return res.status(404).send('Sem dados'); }
      const cols = Object.keys(arr[0]);
      const csv = [cols.join(';')].concat(arr.map(o=> cols.map(c=> JSON.stringify(o[c]??'')).join(';'))).join('\n');
      res.setHeader('Content-Type','text/csv; charset=utf-8');
      res.setHeader('Content-Disposition',`attachment; filename="MARH_${entity}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      res.status(500).json({error:'Erro interno do servidor'});
    }
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
      
      // Salvar documentos no SQL Server
      if (results.success.length > 0) {
        await insertDocumentsBulk(results.success);
      }

      await logToDB(req.user.email, 'documents.bulk_upload', `${empId}:${results.success.length} arquivos`);

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
  app.get('/api/documents/stats', auth, async (req, res) => {
    try {
      const stats = await getDocumentStats();
      const employees = await loadFromDB('employees');
      stats.totalEmployees = employees.length;
      res.json(stats);
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      res.status(500).json({ error: 'Erro ao calcular estatísticas' });
    }
  });

  // Busca avançada de documentos
  app.get('/api/documents/search', auth, async (req, res) => {
    try {
      const { query, type, status, empId, page = 1, limit = 50 } = req.query;
      
      const filters = {};
      if (query) filters.query = query;
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (empId) filters.empId = empId;
      
      const pagination = { page: parseInt(page), limit: parseInt(limit) };
      
      const result = await searchDocuments(filters, pagination);
      res.json(result);
      
    } catch (error) {
      console.error('❌ Erro na busca de documentos:', error);
      res.status(500).json({ error: 'Erro na busca de documentos' });
    }
  });

  // Exclusão em lote
  app.delete('/api/documents/bulk-delete', auth, requireRole('ADMIN', 'RH'), async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: 'IDs dos documentos são obrigatórios' });
      }

      const deletedCount = await deleteDocumentsBulk(documentIds);
      
      await logToDB(req.user.email, 'documents.bulk_delete', `${deletedCount} documentos excluídos`);

      res.json({
        message: `${deletedCount} documentos excluídos com sucesso`,
        deleted: deletedCount
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
