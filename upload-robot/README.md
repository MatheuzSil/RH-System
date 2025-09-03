# 🤖 MARH Upload Robot - Robô de Upload Massivo

Sistema automatizado para upload e vinculação inteligente de grandes volumes de documentos (~400GB) com colaboradores no sistema MARH.

## 🚀 Características Principais

- **Upload Massivo**: Processa centenas de GB de documentos
- **Matching Inteligente**: Vincula automaticamente documentos aos colaboradores usando:
  - Nome completo com similaridade fuzzy
  - CPF (limpo ou formatado) 
  - Chapa do colaborador
  - Email (se presente no nome do arquivo)
  - Análise de conteúdo de PDFs
- **Performance Otimizada**: Upload paralelo com controle de concorrência
- **Monitor de Progresso**: Acompanhamento visual em tempo real
- **Relatórios Detalhados**: Logs completos e estatísticas
- **Recuperação de Falhas**: Sistema de retry e checkpoint
- **Detecção de Duplicatas**: Evita uploads redundantes

## 📋 Formatos Suportados

- **Documentos**: PDF, DOC, DOCX, RTF, TXT
- **Imagens**: JPG, JPEG, PNG, GIF
- **Planilhas**: XLS, XLSX

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+ 
- Acesso ao banco SQL Server da MARH
- Diretório com documentos organizados

### Setup Rápido
```bash
cd upload-robot
npm install
```

### Configuração do Banco
O robô usa as configurações do backend existente. Certifique-se de que:
- O arquivo `.env` do backend está configurado
- A conexão com SQL Server está funcionando
- As tabelas `marh_employees` e `marh_documents` existem

## 🎯 Uso Básico

### Upload Simples
```bash
# Processar diretório padrão
node index.js ./documentos

# Com configurações personalizadas  
node index.js --concurrent 10 --similarity 0.8 ./meus-documentos
```

### Opções Avançadas
```bash
# Alta performance (20 uploads simultâneos, sem busca em conteúdo)
node index.js --concurrent 20 --no-content ./arquivos

# Modo silencioso para execução automatizada
node index.js --no-verbose --no-progress ./docs

# Apenas teste (sem fazer upload real)
node index.js --dry-run ./teste
```

## ⚙️ Parâmetros de Configuração

| Parâmetro | Descrição | Padrão |
|-----------|-----------|---------|
| `--concurrent <n>` | Uploads simultâneos (1-20) | 5 |
| `--similarity <n>` | Similaridade mínima 0-1 | 0.7 |
| `--no-content` | Não analisar conteúdo dos PDFs | false |
| `--no-verbose` | Desativar logs detalhados | false |
| `--no-progress` | Desativar monitor visual | false |
| `--no-reports` | Não salvar relatórios | false |
| `--help` | Mostrar ajuda completa | - |

## 🧠 Algoritmo de Matching

O sistema usa uma abordagem hierárquica para encontrar o colaborador correspondente:

### 1. **Identificadores Exatos** (Prioridade Alta)
```
- CPF: 123.456.789-10 ou 12345678910
- Chapa: funcionário número/código
- Email: usuario@empresa.com
```

### 2. **Similaridade de Nomes** (Prioridade Média)
```
- Algoritmo fuzzy string matching
- Tolerância a erros de digitação
- Variações de nome (abreviações, etc)
- Threshold configurável (padrão 70%)
```

### 3. **Análise de Conteúdo** (Prioridade Baixa)
```
- Extração de texto de PDFs
- Busca por nomes dentro do documento
- Identificadores em formulários
```

## 📊 Monitoramento e Relatórios

### Monitor em Tempo Real
Durante a execução, o robô exibe:
- Barra de progresso visual
- Estatísticas instantâneas
- Velocidade de processamento
- Tempo estimado restante
- Últimos matches encontrados
- Log de erros em tempo real

### Relatórios Salvos
Arquivos gerados automaticamente em `/reports/`:
- `final-report-YYYY-MM-DD.json` - Relatório geral
- `matches-YYYY-MM-DD.json` - Detalhes dos matches
- `errors-YYYY-MM-DD.json` - Log de erros
- `detailed-YYYY-MM-DD.json` - Análise completa

## 🏗️ Estrutura do Projeto

```
upload-robot/
├── index.js              # Script principal
├── lib/
│   ├── fileScanner.js    # Escaneamento de arquivos
│   ├── uploadManager.js  # Gerenciamento de uploads
│   ├── progressMonitor.js # Monitor de progresso
│   ├── nameExtract.js    # Extração de nomes/IDs
│   └── similarity.js     # Algoritmos de similaridade
├── documentos/           # Diretório padrão de documentos
├── reports/              # Relatórios gerados
├── logs/                 # Logs de execução
├── temp/                 # Arquivos temporários
└── package.json          # Configurações
```

## 💾 Estrutura do Banco

### Tabela de Documentos
```sql
marh_documents:
- id (PK)
- empId (FK -> marh_employees)  
- type (tipo do documento)
- description
- fileName
- fileData (base64)
- fileSize
- mimeType
- uploadDate
- uploadedBy
- notes (detalhes do match)
```

### Índices Recomendados
```sql
CREATE INDEX IX_documents_empId ON marh_documents(empId);
CREATE INDEX IX_documents_fileName ON marh_documents(fileName);
CREATE INDEX IX_employees_cpf ON marh_employees(cpf);
CREATE INDEX IX_employees_chapa ON marh_employees(chapa);
```

## 🔧 Otimização de Performance

### Para Volumes Grandes (100GB+)
```bash
# Máxima performance
node index.js --concurrent 20 --no-content --no-verbose ./arquivos

# Com balanceamento
node index.js --concurrent 15 --similarity 0.8 ./docs
```

### Para Máxima Precisão
```bash
# Análise completa
node index.js --concurrent 3 --similarity 0.6 --content ./documentos
```

## 🚨 Solução de Problemas

### Problemas Comuns

**Conexão com Banco**
```
❌ Verificar configurações no backend/.env
❌ Testar conectividade com SQL Server  
❌ Verificar permissões do usuário
```

**Performance Lenta**
```
⚡ Reduzir --concurrent para 3-5
⚡ Usar --no-content para PDFs grandes
⚡ Verificar I/O do disco
```

**Muitos Erros de Match**
```
🎯 Reduzir --similarity para 0.6
🎯 Verificar nomes na base de colaboradores
🎯 Analisar logs de debug
```

### Logs de Debug
```bash
# Ativar logs detalhados
node index.js --verbose ./documentos

# Verificar relatórios
cat reports/errors-*.json | jq '.[]'
```

## 📈 Métricas de Desempenho

Em testes com hardware típico:
- **Velocidade**: 50-200 arquivos/minuto  
- **Throughput**: 1-5 GB/hora
- **Precisão**: 85-95% de matches corretos
- **Memória**: ~200-500MB RAM

## 🔒 Segurança e Backup

- Documentos são armazenados como base64 no banco
- Logs não contêm dados sensíveis  
- Relatórios podem ser criptografados
- Sistema de checkpoint para retomar uploads

## 🤝 Contribuição

Para melhorias ou correções:
1. Teste em ambiente de desenvolvimento
2. Documente mudanças
3. Valide com dados reais pequenos primeiro
4. Monitore impacto na performance

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs em `/logs/`
- Analisar relatórios em `/reports/`  
- Testar com `--dry-run` primeiro
- Documentar problemas com exemplos

---
**Desenvolvido para MARH System** | Versão 1.0.0
