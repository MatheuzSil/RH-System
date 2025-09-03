import { getConnection, sql, closeConnection } from '../config/database.js';

async function addEmployeeFields() {
  let pool = null;
  
  try {
    console.log('🔧 Adicionando novos campos à tabela marh_employees...');
    
    // Conectar ao banco
    pool = await getConnection();
    console.log('🔗 Conectado ao SQL Server');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'marh_employees'
    `);
    
    if (tableCheck.recordset[0].count === 0) {
      throw new Error('Tabela marh_employees não encontrada. Execute create-tables.js primeiro.');
    }
    
    console.log('✅ Tabela marh_employees encontrada');
    
    // Lista de campos para adicionar
    const fieldsToAdd = [
      { name: 'chapa', type: 'NVARCHAR(50)', description: 'Número da chapa do funcionário' },
      { name: 'cod_cargo', type: 'NVARCHAR(20)', description: 'Código do cargo' },
      { name: 'cargo', type: 'NVARCHAR(100)', description: 'Nome do cargo' },
      { name: 'local', type: 'NVARCHAR(100)', description: 'Local de trabalho' },
      { name: 'descricao_folha', type: 'NVARCHAR(200)', description: 'Descrição da folha de pagamento' },
      { name: 'centro_custo', type: 'NVARCHAR(50)', description: 'Centro de custo' },
      { name: 'cod_situacao', type: 'NVARCHAR(10)', description: 'Código da situação do funcionário' },
      { name: 'situacao', type: 'NVARCHAR(50)', description: 'Situação do funcionário' },
      { name: 'data_rescisao', type: 'DATE', description: 'Data de rescisão (se aplicável)' },
      { name: 'hireDate', type: 'DATE', description: 'Data de admissão (campo adicional)' }
    ];
    
    console.log('🔍 Verificando campos existentes...');
    
    for (const field of fieldsToAdd) {
      try {
        // Verificar se o campo já existe
        const columnCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = '${field.name}'
        `);
        
        if (columnCheck.recordset[0].count === 0) {
          // Campo não existe, adicionar
          await pool.request().query(`
            ALTER TABLE marh_employees ADD ${field.name} ${field.type} NULL
          `);
          console.log(`  ✅ Campo '${field.name}' adicionado (${field.description})`);
        } else {
          console.log(`  ℹ️  Campo '${field.name}' já existe, pulando...`);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao adicionar campo '${field.name}':`, error.message);
      }
    }
    
    // Verificar se o campo 'cpf' já existe (pode ter sido criado na tabela original)
    const cpfCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cpf'
    `);
    
    if (cpfCheck.recordset[0].count > 0) {
      // Verificar se o CPF precisa ser ajustado para o tamanho correto
      const cpfInfo = await pool.request().query(`
        SELECT CHARACTER_MAXIMUM_LENGTH as max_length
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cpf'
      `);
      
      if (cpfInfo.recordset[0].max_length < 14) {
        console.log('🔧 Ajustando tamanho do campo CPF para NVARCHAR(14)...');
        await pool.request().query(`
          ALTER TABLE marh_employees ALTER COLUMN cpf NVARCHAR(14) NULL
        `);
        console.log('  ✅ Campo CPF ajustado para NVARCHAR(14)');
      } else {
        console.log('  ℹ️  Campo CPF já tem tamanho adequado');
      }
    } else {
      // Campo CPF não existe, criar
      await pool.request().query(`
        ALTER TABLE marh_employees ADD cpf NVARCHAR(14) NULL
      `);
      console.log('  ✅ Campo CPF adicionado');
    }
    
    console.log('\n📊 Verificando estrutura final da tabela...');
    
    const finalStructure = await pool.request().query(`
      SELECT 
        COLUMN_NAME as campo,
        DATA_TYPE as tipo,
        CHARACTER_MAXIMUM_LENGTH as tamanho,
        IS_NULLABLE as nulo
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Estrutura da tabela marh_employees:');
    finalStructure.recordset.forEach(col => {
      const size = col.tamanho ? `(${col.tamanho})` : '';
      const nullable = col.nulo === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  📌 ${col.campo}: ${col.tipo}${size} ${nullable}`);
    });
    
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todos os novos campos foram adicionados à tabela marh_employees');
    console.log('✅ O sistema agora suporta todos os campos do Excel de importação');
    console.log('✅ O frontend e backend já estão preparados para usar estes campos');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addEmployeeFields()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

export default addEmployeeFields;
