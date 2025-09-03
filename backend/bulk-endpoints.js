// === ENDPOINTS PARA DOCUMENTOS EM MASSA - ADICIONAR AO SERVER.JS ===

// Importar no topo do server.js:
// import { insertDocumentsBulk, searchDocuments, getDocumentStats, deleteDocumentsBulk } from './utils/dbHelpers.js';

// Upload em lote - NOVO ENDPOINT
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

    console.log(`📤 [BULK-UPLOAD] Iniciando upload: ${files.length} arquivos para funcionário ${empId}`);

    const results = await bulkUploader.processBulkUpload(files, empId, metadata);
    
    // Log da operação
    if (USE_SQL) {
      await logToDB(req.user.email, 'documents.bulk_upload', `${empId}:${results.success.length} arquivos`);
    } else {
      // Fallback para JSON se SQL falhar
      const db = loadDB();
      if (!db.documents) db.documents = [];
      
      results.success.forEach(successDoc => {
        // Aqui você precisaria reconstruir o documento do resultado
        // Para o fallback JSON
      });
      
      log(db, req.user.email, 'documents.bulk_upload', `${empId}:${results.success.length} arquivos`);
      saveDB(db);
    }

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
    console.error('❌ [BULK-UPLOAD] Erro:', error);
    res.status(500).json({ error: 'Erro no upload em lote: ' + error.message });
  }
});

// Estatísticas de documentos - NOVO ENDPOINT
app.get('/api/documents/stats', auth, async (req, res) => {
  try {
    let stats;
    
    if (USE_SQL) {
      console.log('📊 [STATS] Buscando estatísticas no SQL Server');
      stats = await getDocumentStats();
    } else {
      console.log('📄 [STATS] Buscando estatísticas no JSON');
      const db = loadDB();
      const documents = db.documents || [];
      const employees = db.employees || [];
      
      stats = {
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
    }

    console.log(`✅ [STATS] Estatísticas retornadas: ${stats.totalDocuments} documentos`);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ [STATS] Erro ao calcular estatísticas:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// Busca avançada de documentos - NOVO ENDPOINT
app.get('/api/documents/search', auth, async (req, res) => {
  try {
    const { query, type, status, empId, page = 1, limit = 50 } = req.query;
    
    const filters = {
      query: query || null,
      type: type || null,
      status: status || null,
      empId: empId || null
    };
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    let result;
    
    if (USE_SQL) {
      console.log(`🔍 [SEARCH] Buscando documentos no SQL Server com filtros:`, filters);
      result = await searchDocuments(filters, pagination);
    } else {
      console.log(`📄 [SEARCH] Buscando documentos no JSON`);
      const db = loadDB();
      const documents = db.documents || [];
      const employees = db.employees || [];
      
      let filteredDocs = documents;

      // Aplicar filtros
      if (filters.empId) {
        filteredDocs = filteredDocs.filter(doc => doc.empId === filters.empId);
      }

      if (filters.type) {
        filteredDocs = filteredDocs.filter(doc => doc.type === filters.type);
      }

      if (filters.status) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        filteredDocs = filteredDocs.filter(doc => {
          if (!doc.expirationDate) return filters.status === 'valid';
          
          const expiryDate = new Date(doc.expirationDate);
          
          switch (filters.status) {
            case 'expired': return expiryDate < now;
            case 'expiring': return expiryDate >= now && expiryDate < thirtyDaysFromNow;
            case 'valid': return expiryDate >= thirtyDaysFromNow;
            default: return true;
          }
        });
      }

      if (filters.query) {
        const searchQuery = filters.query.toLowerCase();
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
      const startIndex = (pagination.page - 1) * pagination.limit;
      const paginatedDocs = filteredDocs.slice(startIndex, startIndex + pagination.limit);

      // Adicionar informações do funcionário
      const docsWithEmployeeInfo = paginatedDocs.map(doc => {
        const employee = employees.find(emp => emp.id === doc.empId);
        return {
          ...doc,
          employeeName: employee ? employee.name : 'Funcionário não encontrado',
          fileData: undefined // Não incluir dados do arquivo na busca
        };
      });

      result = {
        documents: docsWithEmployeeInfo,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: total,
          pages: Math.ceil(total / pagination.limit)
        }
      };
    }

    console.log(`✅ [SEARCH] Encontrados ${result.documents.length} documentos`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ [SEARCH] Erro na busca:', error);
    res.status(500).json({ error: 'Erro na busca de documentos' });
  }
});

// Exclusão em lote - NOVO ENDPOINT
app.delete('/api/documents/bulk-delete', auth, requireRole('ADMIN', 'RH'), async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'IDs dos documentos são obrigatórios' });
    }

    let deletedCount = 0;

    if (USE_SQL) {
      console.log(`🗑️ [BULK-DELETE] Excluindo ${documentIds.length} documentos do SQL Server`);
      deletedCount = await deleteDocumentsBulk(documentIds);
      await logToDB(req.user.email, 'documents.bulk_delete', `${deletedCount} documentos excluídos`);
    } else {
      console.log(`📄 [BULK-DELETE] Excluindo documentos do JSON`);
      const db = loadDB();
      const initialCount = db.documents ? db.documents.length : 0;
      
      if (!db.documents) {
        return res.status(404).json({ error: 'Nenhum documento encontrado' });
      }

      db.documents = db.documents.filter(doc => !documentIds.includes(doc.id));
      deletedCount = initialCount - db.documents.length;
      
      log(db, req.user.email, 'documents.bulk_delete', `${deletedCount} documentos excluídos`);
      saveDB(db);
    }

    console.log(`✅ [BULK-DELETE] ${deletedCount} documentos excluídos`);
    res.json({
      message: `${deletedCount} documentos excluídos com sucesso`,
      deleted: deletedCount
    });
    
  } catch (error) {
    console.error('❌ [BULK-DELETE] Erro na exclusão em lote:', error);
    res.status(500).json({ error: 'Erro na exclusão em lote' });
  }
});

// Status do sistema de armazenamento - NOVO ENDPOINT
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
        try {
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
        } catch (error) {
          console.warn(`Erro ao escanear diretório ${currentPath}:`, error.message);
        }
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
      mode: USE_SQL ? 'SQL Server' : 'JSON',
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
    console.error('❌ [STORAGE-STATUS] Erro:', error);
    res.status(500).json({ error: 'Erro ao verificar status do armazenamento' });
  }
});

// === FIM DOS ENDPOINTS DE DOCUMENTOS EM MASSA ===
