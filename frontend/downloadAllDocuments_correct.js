// Função para baixar todos os documentos de um funcionário em um ZIP
async function downloadAllDocuments() {
  console.log('📦 Iniciando download em massa...');
  
  if (!currentDocuments || currentDocuments.length === 0) {
    console.log('❌ Nenhum documento encontrado no cache');
    alert('Nenhum documento disponível para download.');
    return;
  }

  // Verificar se JSZip está disponível
  if (typeof JSZip === 'undefined') {
    alert('❌ Erro: Biblioteca JSZip não carregada. Recarregue a página.');
    return;
  }

  // Confirmar ação
  const employeeName = qs('#edit-emp-name').value || 'funcionário';
  const totalDocs = currentDocuments.length;
  
  if (!confirm(`Deseja baixar todos os ${totalDocs} documentos de ${employeeName} em um arquivo ZIP?\n\nO download pode demorar alguns segundos.`)) {
    return;
  }

  console.log('📊 Preparando download ZIP para:', { employeeName, totalDocs });
  
  // Mostrar progresso
  const downloadBtn = qs('#download-all-documents');
  const originalText = downloadBtn ? downloadBtn.textContent : '';
  
  if (downloadBtn) {
    downloadBtn.textContent = '📦 Preparando ZIP...';
    downloadBtn.disabled = true;
  }
  
  try {
    const zip = new JSZip();
    let processedDocs = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Processar cada documento
    for (const doc of currentDocuments) {
      try {
        processedDocs++;
        
        if (downloadBtn) {
          downloadBtn.textContent = `📦 Processando ${processedDocs}/${totalDocs}: ${doc.fileName}`;
        }
        
        console.log(`📄 Processando documento ${processedDocs}/${totalDocs}:`, doc.fileName);
        
        let fileBlob = null;
        
        // Tentar baixar documento
        if (doc.fileUrl) {
          // Documento no FTP - baixar via URL
          console.log('📡 Baixando via FTP:', doc.fileUrl);
          
          try {
            const response = await fetch(doc.fileUrl, {
              mode: 'cors'
            });
            
            if (response.ok) {
              fileBlob = await response.blob();
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          } catch (ftpError) {
            console.warn('⚠️ Erro no FTP, tentando via API:', ftpError.message);
            
            // Fallback para API
            const apiResponse = await fetch(`${API}/documents/${doc.id}/download`, {
              headers: { 'Authorization': 'Bearer ' + TOKEN }
            });
            
            if (apiResponse.ok) {
              fileBlob = await apiResponse.blob();
            } else {
              throw new Error(`API falhou: HTTP ${apiResponse.status}`);
            }
          }
        } else {
          // Baixar via API
          console.log('📱 Baixando via API:', doc.id);
          const response = await fetch(`${API}/documents/${doc.id}/download`, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
          });
          
          if (response.ok) {
            fileBlob = await response.blob();
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        }
        
        if (fileBlob) {
          // Adicionar arquivo ao ZIP
          const fileName = doc.fileName || `documento_${doc.id}.pdf`;
          zip.file(fileName, fileBlob);
          successCount++;
          console.log(`✅ Adicionado ao ZIP: ${fileName}`);
        } else {
          throw new Error('Blob vazio');
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar ${doc.fileName}:`, error);
        
        // Adicionar arquivo de erro no ZIP para referência
        const errorFileName = `ERRO_${doc.fileName || `documento_${doc.id}`}.txt`;
        const errorContent = `Erro ao baixar arquivo: ${error.message}\nURL: ${doc.fileUrl || 'Via API'}\nID: ${doc.id}`;
        zip.file(errorFileName, errorContent);
      }
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (downloadBtn) {
      downloadBtn.textContent = '📦 Gerando arquivo ZIP...';
    }
    
    console.log(`📊 Processamento concluído: ${successCount} sucessos, ${errorCount} erros`);
    
    // Gerar e baixar o ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // Criar nome do arquivo ZIP
    const sanitizedName = employeeName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const zipFileName = `documentos_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.zip`;
    
    // Fazer download do ZIP
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Download do ZIP iniciado:', zipFileName);
    
    // Mostrar resultado
    if (errorCount === 0) {
      alert(`✅ ZIP criado com sucesso!\n\nArquivo: ${zipFileName}\nDocumentos: ${successCount}/${totalDocs}\n\nVerifique sua pasta de downloads.`);
    } else {
      alert(`⚠️ ZIP criado com avisos!\n\nArquivo: ${zipFileName}\nSucessos: ${successCount}\nErros: ${errorCount}\n\nOs erros estão documentados no ZIP.\nVerifique sua pasta de downloads.`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no download ZIP:', error);
    alert('❌ Erro ao criar ZIP: ' + error.message);
  } finally {
    // Restaurar botão
    if (downloadBtn) {
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
    }
  }
}