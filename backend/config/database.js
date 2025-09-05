import sql from 'mssql';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'sqlserver.grupoworklife.com.br',
  database: process.env.DB_DATABASE || 'grupoworklife',
  user: process.env.DB_USER || 'grupoworklife',
  password: process.env.DB_PASSWORD || 'P14vv4WP]Fnr',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'false' ? false : true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'false' ? false : true,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

export async function getConnection() {
  try {
    if (!pool) {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      console.log('✅ Conectado ao SQL Server');
    }
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar com SQL Server:', error.message);
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Conexão SQL Server fechada');
  }
}

export { sql };
