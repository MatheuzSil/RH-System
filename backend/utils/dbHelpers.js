import { getConnection, sql } from '../config/database.js';

// Função para substituir loadDB() - carrega dados específicos do banco
export async function loadFromDB(table, whereClause = '', params = {}) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Adicionar prefixo marh_ para evitar conflito com tabelas existentes
    const tableName = `marh_${table}`;
    
    // Adicionar parâmetros se fornecidos
    if (params && Object.keys(params).length > 0) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }
    
    const query = `SELECT * FROM ${tableName} ${whereClause}`;
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error(`Erro ao carregar dados da tabela ${table}:`, error);
    throw error;
  }
}

// Função para inserir dados
export async function insertToDB(table, data) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Adicionar prefixo marh_
    const tableName = `marh_${table}`;
    
    // Construir query dinamicamente baseada nos campos do objeto
    const fields = Object.keys(data);
    const values = fields.map(field => `@${field}`).join(', ');
    const fieldNames = fields.join(', ');
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(data)) {
      request.input(key, value);
    }
    
    const query = `INSERT INTO ${tableName} (${fieldNames}) VALUES (${values})`;
    await request.query(query);
    
    return data;
  } catch (error) {
    console.error(`Erro ao inserir dados na tabela ${table}:`, error);
    throw error;
  }
}

// Função para atualizar dados
export async function updateInDB(table, id, data) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Adicionar prefixo marh_
    const tableName = `marh_${table}`;
    
    // Construir query dinamicamente
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = @${field}`).join(', ');
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(data)) {
      request.input(key, value);
    }
    request.input('id', id);
    
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = @id`;
    await request.query(query);
    
    return { ...data, id };
  } catch (error) {
    console.error(`Erro ao atualizar dados na tabela ${table}:`, error);
    throw error;
  }
}

// Função para deletar dados
export async function deleteFromDB(table, id) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Adicionar prefixo marh_
    const tableName = `marh_${table}`;
    
    request.input('id', id);
    const query = `DELETE FROM ${tableName} WHERE id = @id`;
    await request.query(query);
    
    return true;
  } catch (error) {
    console.error(`Erro ao deletar dados da tabela ${table}:`, error);
    throw error;
  }
}

// Função para logs
export async function logToDB(who, action, details = '') {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    const logData = {
      at: new Date().toLocaleString('pt-BR'),
      who,
      action,
      details
    };
    
    request.input('at', sql.NVarChar, logData.at);
    request.input('who', sql.NVarChar, logData.who);
    request.input('action', sql.NVarChar, logData.action);
    request.input('details', sql.NVarChar, logData.details);
    
    await request.query(`INSERT INTO marh_logs (at, who, action, details) VALUES (@at, @who, @action, @details)`);
    
    return logData;
  } catch (error) {
    console.error('Erro ao inserir log:', error);
    throw error;
  }
}

// Função para buscar configurações
export async function getSettings() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT key_name, value_data FROM marh_settings');
    
    const settings = {};
    for (const row of result.recordset) {
      try {
        // Tentar parsear como JSON, senão usar como string
        settings[row.key_name] = JSON.parse(row.value_data);
      } catch {
        settings[row.key_name] = row.value_data;
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    throw error;
  }
}

// Função para salvar configurações
export async function saveSettings(settings) {
  try {
    const pool = await getConnection();
    
    for (const [key, value] of Object.entries(settings)) {
      const request = pool.request();
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      
      request.input('key_name', sql.NVarChar, key);
      request.input('value_data', sql.NVarChar, valueString);
      
      // Usar MERGE para inserir ou atualizar
      await request.query(`
        MERGE marh_settings AS target
        USING (SELECT @key_name as key_name, @value_data as value_data) AS source
        ON target.key_name = source.key_name
        WHEN MATCHED THEN
          UPDATE SET value_data = source.value_data
        WHEN NOT MATCHED THEN
          INSERT (key_name, value_data) VALUES (source.key_name, source.value_data);
      `);
    }
    
    return settings;
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    throw error;
  }
}

// Função para buscar dados com filtros específicos (para permissões)
export async function loadFilteredData(table, userRole, userId, userEmail) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    let query = `SELECT * FROM ${table}`;
    
    // Aplicar filtros baseados no papel do usuário
    switch (table) {
      case 'employees':
        if (userRole === 'COLAB') {
          query += ` WHERE userId = @userId OR email = @userEmail`;
          request.input('userId', sql.NVarChar, userId);
          request.input('userEmail', sql.NVarChar, userEmail);
        }
        break;
        
      case 'attendance':
        if (userRole === 'COLAB') {
          query = `
            SELECT a.* FROM attendance a 
            INNER JOIN employees e ON a.empId = e.id 
            WHERE e.userId = @userId OR e.email = @userEmail
          `;
          request.input('userId', sql.NVarChar, userId);
          request.input('userEmail', sql.NVarChar, userEmail);
        }
        break;
        
      case 'leaves':
        if (userRole === 'COLAB') {
          query = `
            SELECT l.* FROM leaves l 
            INNER JOIN employees e ON l.empId = e.id 
            WHERE e.userId = @userId OR e.email = @userEmail
          `;
          request.input('userId', sql.NVarChar, userId);
          request.input('userEmail', sql.NVarChar, userEmail);
        }
        break;
        
      case 'payroll':
        if (userRole === 'COLAB') {
          query = `
            SELECT p.* FROM payroll p 
            INNER JOIN employees e ON p.empId = e.id 
            WHERE e.userId = @userId OR e.email = @userEmail
          `;
          request.input('userId', sql.NVarChar, userId);
          request.input('userEmail', sql.NVarChar, userEmail);
        }
        break;
        
      case 'reviews':
        if (userRole === 'COLAB') {
          query = `
            SELECT r.* FROM reviews r 
            INNER JOIN employees e ON r.empId = e.id 
            WHERE e.userId = @userId OR e.email = @userEmail
          `;
          request.input('userId', sql.NVarChar, userId);
          request.input('userEmail', sql.NVarChar, userEmail);
        }
        break;
    }
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error(`Erro ao carregar dados filtrados da tabela ${table}:`, error);
    throw error;
  }
}

// Função para obter resumo do dashboard
export async function getDashboardSummary() {
  try {
    const pool = await getConnection();
    
    const totalEmpResult = await pool.request().query('SELECT COUNT(*) as count FROM marh_employees');
    const ativosResult = await pool.request().query("SELECT COUNT(*) as count FROM marh_employees WHERE status = 'ATIVO'");
    const onLeaveResult = await pool.request().query("SELECT COUNT(*) as count FROM marh_leaves WHERE status = 'APROVADO'");
    const openJobsResult = await pool.request().query("SELECT COUNT(*) as count FROM marh_jobs WHERE status = 'ABERTA'");
    
    return {
      totalEmp: totalEmpResult.recordset[0].count,
      ativos: ativosResult.recordset[0].count,
      onLeave: onLeaveResult.recordset[0].count,
      openJobs: openJobsResult.recordset[0].count
    };
  } catch (error) {
    console.error('Erro ao obter resumo do dashboard:', error);
    throw error;
  }
}


// Adicione estas funções ao seu arquivo dbHelpers.js existente

// Função específica para inserir documentos em lote no SQL Server
export async function insertDocumentsBulk(documents) {
  try {
    const pool = await getConnection();
    
    for (const doc of documents) {
      const request = pool.request();
      
      request.input('id', sql.NVarChar, doc.id);
      request.input('empId', sql.NVarChar, doc.empId);
      request.input('type', sql.NVarChar, doc.type || 'OUTROS');
      request.input('description', sql.NVarChar, doc.description || '');
      request.input('fileName', sql.NVarChar, doc.fileName);
      request.input('fileData', sql.NVarChar, doc.fileData); // Base64
      request.input('fileSize', sql.BigInt, doc.fileSize || 0);
      request.input('mimeType', sql.NVarChar, doc.mimeType || 'application/octet-stream');
      request.input('uploadDate', sql.Date, doc.uploadDate ? new Date(doc.uploadDate) : new Date());
      request.input('expirationDate', sql.Date, doc.expirationDate ? new Date(doc.expirationDate) : null);
      request.input('uploadedBy', sql.NVarChar, doc.uploadedBy || '');
      request.input('notes', sql.NVarChar, doc.notes || '');
      
      await request.query(`
        INSERT INTO marh_documents (
          id, empId, type, description, fileName, fileData, 
          fileSize, mimeType, uploadDate, expirationDate, uploadedBy, notes
        ) VALUES (
          @id, @empId, @type, @description, @fileName, @fileData,
          @fileSize, @mimeType, @uploadDate, @expirationDate, @uploadedBy, @notes
        )
      `);
    }
    
    console.log(`✅ ${documents.length} documentos inseridos no SQL Server`);
    return documents.length;
  } catch (error) {
    console.error('❌ Erro ao inserir documentos em lote:', error);
    throw error;
  }
}

// Função para buscar documentos com filtros avançados
export async function searchDocuments(filters = {}, pagination = {}) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    let whereConditions = [];
    let queryParams = {};
    
    // Filtros
    if (filters.empId) {
      whereConditions.push('d.empId = @empId');
      request.input('empId', sql.NVarChar, filters.empId);
    }
    
    if (filters.type) {
      whereConditions.push('d.type = @type');
      request.input('type', sql.NVarChar, filters.type);
    }
    
    if (filters.status) {
      switch (filters.status) {
        case 'expired':
          whereConditions.push('d.expirationDate < GETDATE()');
          break;
        case 'expiring':
          whereConditions.push('d.expirationDate >= GETDATE() AND d.expirationDate <= DATEADD(day, 30, GETDATE())');
          break;
        case 'valid':
          whereConditions.push('(d.expirationDate IS NULL OR d.expirationDate > DATEADD(day, 30, GETDATE()))');
          break;
      }
    }
    
    if (filters.query) {
      whereConditions.push('(d.fileName LIKE @searchQuery OR d.description LIKE @searchQuery OR e.name LIKE @searchQuery)');
      request.input('searchQuery', sql.NVarChar, `%${filters.query}%`);
    }
    
    // Construir WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Paginação
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const offset = (page - 1) * limit;
    
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);
    
    // Query principal com JOIN para pegar nome do funcionário
    const query = `
      SELECT 
        d.*,
        e.name as employeeName,
        CASE 
          WHEN d.expirationDate < GETDATE() THEN CAST(1 AS BIT)
          ELSE CAST(0 AS BIT)
        END as isExpired
      FROM marh_documents d
      LEFT JOIN marh_employees e ON d.empId = e.id
      ${whereClause}
      ORDER BY d.uploadDate DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    const result = await request.query(query);
    
    // Count total para paginação
    const countRequest = pool.request();
    if (filters.empId) countRequest.input('empId', sql.NVarChar, filters.empId);
    if (filters.type) countRequest.input('type', sql.NVarChar, filters.type);
    if (filters.query) countRequest.input('searchQuery', sql.NVarChar, `%${filters.query}%`);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM marh_documents d
      LEFT JOIN marh_employees e ON d.empId = e.id
      ${whereClause}
    `;
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    return {
      documents: result.recordset.map(doc => ({
        ...doc,
        fileData: undefined // Remover dados do arquivo da listagem
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    throw error;
  }
}

// Função para obter estatísticas de documentos
export async function getDocumentStats() {
  try {
    const pool = await getConnection();
    
    const queries = {
      total: 'SELECT COUNT(*) as count FROM marh_documents',
      totalSize: 'SELECT SUM(CAST(fileSize AS BIGINT)) as size FROM marh_documents',
      employeesWithDocs: 'SELECT COUNT(DISTINCT empId) as count FROM marh_documents',
      byType: `
        SELECT type, COUNT(*) as count 
        FROM marh_documents 
        GROUP BY type
      `,
      byMonth: `
        SELECT 
          FORMAT(uploadDate, 'yyyy-MM') as month, 
          COUNT(*) as count
        FROM marh_documents 
        WHERE uploadDate >= DATEADD(month, -12, GETDATE())
        GROUP BY FORMAT(uploadDate, 'yyyy-MM')
        ORDER BY month
      `,
      expired: 'SELECT COUNT(*) as count FROM marh_documents WHERE expirationDate < GETDATE()',
      expiring: 'SELECT COUNT(*) as count FROM marh_documents WHERE expirationDate >= GETDATE() AND expirationDate <= DATEADD(day, 30, GETDATE())'
    };
    
    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.request().query(query);
      
      if (key === 'byType' || key === 'byMonth') {
        results[key] = {};
        result.recordset.forEach(row => {
          const groupKey = key === 'byType' ? row.type : row.month;
          results[key][groupKey] = row.count;
        });
      } else {
        results[key] = result.recordset[0].count || result.recordset[0].size || 0;
      }
    }
    
    return {
      totalDocuments: results.total,
      totalSize: results.totalSize || 0,
      employeesWithDocs: results.employeesWithDocs,
      documentsByType: results.byType,
      documentsByMonth: results.byMonth,
      expiredDocs: results.expired,
      expiringDocs: results.expiring
    };
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    throw error;
  }
}

// Função para exclusão em lote
export async function deleteDocumentsBulk(documentIds) {
  try {
    const pool = await getConnection();
    
    // Criar tabela temporária com os IDs
    const request = pool.request();
    
    // Usar IN clause para deletar múltiplos documentos
    const placeholders = documentIds.map((_, index) => `@id${index}`).join(',');
    
    documentIds.forEach((id, index) => {
      request.input(`id${index}`, sql.NVarChar, id);
    });
    
    const result = await request.query(`
      DELETE FROM marh_documents 
      WHERE id IN (${placeholders})
    `);
    
    console.log(`✅ ${result.rowsAffected[0]} documentos excluídos do SQL Server`);
    return result.rowsAffected[0];
    
  } catch (error) {
    console.error('❌ Erro ao excluir documentos em lote:', error);
    throw error;
  }
}

