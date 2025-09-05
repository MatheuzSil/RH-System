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
