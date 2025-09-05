/**
 * CORREÇÕES PARA AS ROTAS DE DOCUMENTOS - SUPORTE A FILEURL
 * 
 * Substitua as rotas abaixo no seu server.js
 */

// 1. ROTA: /api/documents/:docId/data
// LOCALIZAR E SUBSTITUIR por:

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
    
    // 🔥 NOVA LÓGICA: Verificar se tem fileUrl (FTP) primeiro
    if (document.fileUrl) {
      console.log('🔗 Redirecionando para URL do FTP:', document.fileUrl);
      return res.redirect(document.fileUrl);
    }
    
    // Fallback para fileData (BLOB - documentos antigos)
    if (!document.fileData) {
      console.log('❌ Nem fileUrl nem fileData encontrados:', docId);
      return res.status(404).json({ error: 'Dados do arquivo não encontrados' });
    }
    
    console.log('📤 Enviando dados do documento (BLOB):', document.fileName, 'Size:', document.fileData.length);
    
    // Return document data as JSON for old BLOB documents
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

// ========================================================

// 2. ROTA: /api/documents/:docId/download  
// LOCALIZAR E SUBSTITUIR por:

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
    
    // 🔥 NOVA LÓGICA: Verificar se tem fileUrl (FTP) primeiro
    if (document.fileUrl) {
      console.log('🔗 Redirecionando download para URL do FTP:', document.fileUrl);
      return res.redirect(document.fileUrl);
    }
    
    // Fallback para fileData (BLOB - documentos antigos)
    if (!document.fileData) {
      return res.status(404).json({ error: 'Dados do arquivo não encontrados' });
    }

    // Convert base64 back to buffer for old BLOB documents
    const buffer = Buffer.from(document.fileData, 'base64');
    
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ========================================================

// 3. ROTA: /api/employees/:empId/documents
// LOCALIZAR E SUBSTITUIR por (para incluir fileUrl na resposta):

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
    
    // 🔥 ADICIONAR INFORMAÇÃO SE É FTP OU BLOB
    const processedDocs = documents.map(doc => {
      const result = { ...doc };
      
      // Remove fileData da resposta para economizar bandwidth
      delete result.fileData;
      
      // Adicionar informações úteis
      result.isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
      result.storageType = doc.fileUrl ? 'FTP' : 'BLOB';
      result.hasFileUrl = !!doc.fileUrl;
      result.hasFileData = !!doc.fileData;
      
      return result;
    });
    
    res.json(processedDocs);
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * 📋 INSTRUÇÕES:
 * 
 * 1. Copie as 3 rotas acima
 * 2. No seu server.js, substitua as rotas correspondentes
 * 3. Reinicie o servidor
 * 4. Teste no frontend - agora deve funcionar!
 * 
 * 🔄 LÓGICA:
 * - Se documento tem `fileUrl` → redireciona para FTP
 * - Se documento só tem `fileData` → serve o BLOB (documentos antigos)
 * - Se não tem nenhum → erro 404
 */
