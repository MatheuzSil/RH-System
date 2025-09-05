# Migração para SQL Server - MARH

Este documento descreve como migrar o sistema MARH do JSON para SQL Server.

## 🔧 Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do SQL Server:

```env
DB_SERVER=sqlserver.grupoworklife.com.br
DB_NAME=grupoworklife
DB_USER=seu_usuario_aqui
DB_PASSWORD=sua_senha_aqui
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=true
USE_SQL=false  # Mude para true quando quiser usar SQL Server
```

### 2. Testar Conexão

Antes de prosseguir, teste se a conexão está funcionando:

```bash
node test-connection.js
```

Se der erro, verifique:
- Credenciais no arquivo `.env`
- Se o SQL Server está rodando
- Se o banco `grupoworklife` existe
- Configurações de rede/firewall

### 3. Criar Tabelas no SQL Server

Execute o script SQL no seu SQL Server Management Studio ou ferramenta similar:

```bash
# O arquivo está em: sql/schema.sql
```

### 4. Migrar Dados

Após criar as tabelas, execute a migração:

```bash
node migration/migrate.js
```

## 🔄 Modo Híbrido

O sistema foi projetado para funcionar em modo híbrido. Você pode alternar entre JSON e SQL Server facilmente:

### Usar JSON (padrão atual):
```env
USE_SQL=false
```

### Usar SQL Server:
```env
USE_SQL=true
```

## 📊 Vantagens da Migração

### JSON (Atual)
- ✅ Simples de usar
- ✅ Sem dependências externas
- ❌ Não escalável
- ❌ Sem integridade referencial
- ❌ Problemas de concorrência

### SQL Server (Novo)
- ✅ Altamente escalável
- ✅ Integridade referencial
- ✅ Controle de transações
- ✅ Melhor performance
- ✅ Backup e recovery
- ❌ Mais complexo
- ❌ Requer infraestrutura

## 🚀 Plano de Migração Recomendado

### Fase 1: Preparação ✅
- [x] Instalar dependências SQL
- [x] Configurar conexão
- [x] Criar schemas
- [x] Sistema híbrido

### Fase 2: Testes
- [ ] Testar conexão SQL Server
- [ ] Executar migração de dados
- [ ] Testar endpoints com USE_SQL=true
- [ ] Validar funcionalidades

### Fase 3: Transição
- [ ] Backup do JSON atual
- [ ] Ativar modo SQL: USE_SQL=true
- [ ] Monitorar logs de erro
- [ ] Rollback se necessário

### Fase 4: Limpeza
- [ ] Remover código JSON obsoleto
- [ ] Otimizar queries SQL
- [ ] Configurar backups automáticos

## 🛠️ Comandos Úteis

### Desenvolvimento
```bash
# Modo desenvolvimento com JSON
USE_SQL=false npm run dev

# Modo desenvolvimento com SQL
USE_SQL=true npm run dev

# Testar apenas conexão
node test-connection.js

# Migrar dados
node migration/migrate.js
```

### Debugging
```bash
# Ver logs de conexão SQL
DEBUG=sql node server.js

# Forçar uso de JSON (emergência)
USE_SQL=false node server.js
```

## ⚠️  Troubleshooting

### Erro de Conexão SQL
1. Verificar credenciais no `.env`
2. Testar conectividade de rede
3. Verificar se o banco existe
4. Verificar permissões do usuário

### Erro de Migração
1. Verificar se as tabelas foram criadas
2. Verificar se dados JSON são válidos
3. Executar migração por partes
4. Verificar logs detalhados

### Rollback de Emergência
Se algo der errado, você pode voltar para JSON rapidamente:

1. Mudar `USE_SQL=false` no `.env`
2. Reiniciar aplicação
3. Sistema volta a usar JSON automaticamente

## 📝 Logs

O sistema híbrido registra automaticamente:
- Tentativas de conexão SQL
- Fallbacks para JSON
- Erros de migração
- Performance das operações

Monitore os logs para identificar problemas.
