# MIGRAÇÃO PARA FTP - INSTRUÇÕES

Este guia te ajuda a migrar do armazenamento de documentos no banco SQL Server para o disco web via FTP.

## 🚀 PASSO A PASSO

### 1. Configurar senha FTP
Edite o arquivo `.env` e adicione sua senha FTP:
```env
FTP_PASSWORD=sua_senha_ftp_aqui
```

### 2. Adicionar campo fileUrl no banco
Execute o script para adicionar o novo campo:
```bash
cd scripts
node add-fileurl-field.js
```

### 3. Testar conexão FTP
Teste se a conexão FTP está funcionando:
```bash
cd upload-robot
node test-ftp.js
```

### 4. Migrar documentos existentes (OPCIONAL)
Se quiser migrar documentos já salvos no banco:
```bash
cd scripts
node migrate-to-ftp.js
```
⚠️ **CUIDADO**: Este processo pode demorar e precisa de espaço livre no banco para funcionar.

### 5. Usar o robô atualizado
Agora o robô já salva automaticamente no FTP:
```bash
cd upload-robot
node index.js "C:\seu\diretorio" --concurrent 5 --no-content
```

## 📋 VANTAGENS DA MIGRAÇÃO

✅ **Espaço ilimitado**: Usa os 600GB do disco web  
✅ **Banco mais leve**: SQL Server só guarda URLs  
✅ **Performance melhor**: Upload e download mais rápidos  
✅ **Escalabilidade**: Suporta qualquer volume de arquivos  

## 🔧 CONFIGURAÇÕES

### FTP
- **Host**: ftp.grupoworklife.com.br
- **Usuário**: grupoworklife
- **Pasta destino**: /public_html/docs/
- **URL pública**: https://grupoworklife.com.br/docs/

### Banco de dados
- **Novo campo**: `fileUrl` (VARCHAR 512)
- **Campo removido**: `fileData` (liberado após migração)

## 🚨 PROBLEMAS COMUNS

### "Could not allocate space"
- Significa que o banco SQL está cheio (500MB)
- Use a migração FTP para liberar espaço

### "FTP connection failed"
- Verifique a senha FTP no arquivo `.env`
- Confirme se o usuário tem permissões de upload

### "Permission denied"
- Verifique se a pasta `/public_html/docs/` existe e tem permissão de escrita

## 📊 MONITORAMENTO

Após a migração, você pode verificar:
- Arquivos no FTP: `/public_html/docs/`
- URLs no banco: campo `fileUrl` da tabela `marh_documents`
- Espaço liberado: painel de controle da hospedagem
