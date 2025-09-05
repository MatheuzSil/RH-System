/**
 * Extrator de nomes e identificadores de arquivos e conteúdo
 * Usado para identificar colaboradores em nomes de arquivos e conteúdo de documentos
 */

import path from 'path';

/**
 * Extrai candidatos a nomes de colaboradores do nome do arquivo e conteúdo
 * @param {string} text - Conteúdo do arquivo (se disponível)
 * @param {string} fileName - Nome do arquivo
 * @returns {string[]} - Lista de candidatos a nomes
 */
export function extractCandidates(text = '', fileName = '') {
  const candidates = new Set();
  
  // 1. Extrair do nome do arquivo
  const fileBaseName = path.basename(fileName, path.extname(fileName));
  const fileCandidates = extractFromFileName(fileBaseName);
  fileCandidates.forEach(candidate => candidates.add(candidate));
  
  // 2. Extrair do conteúdo (se disponível)
  if (text && text.trim()) {
    const contentCandidates = extractFromContent(text);
    contentCandidates.forEach(candidate => candidates.add(candidate));
  }
  
  // 3. Limpar e filtrar candidatos
  const cleanedCandidates = Array.from(candidates)
    .map(candidate => cleanCandidate(candidate))
    .filter(candidate => isValidCandidate(candidate))
    .filter((candidate, index, array) => array.indexOf(candidate) === index); // Remove duplicatas
  
  return cleanedCandidates;
}

/**
 * Extrai nomes do nome do arquivo
 */
function extractFromFileName(fileName) {
  const candidates = [];
  
  // Remover caracteres especiais e normalizar
  const normalized = fileName
    .replace(/[_\-\.]/g, ' ')
    .replace(/\d+/g, ' ') // Remover números
    .replace(/\s+/g, ' ')
    .trim();
  
  // Separar por espaços e tentar diferentes combinações
  const parts = normalized.split(' ').filter(part => part.length > 1);
  
  if (parts.length >= 2) {
    // Nome completo
    candidates.push(parts.join(' '));
    
    // Primeira palavra + última palavra (nome + sobrenome)
    if (parts.length > 2) {
      candidates.push(`${parts[0]} ${parts[parts.length - 1]}`);
    }
    
    // Primeiras duas palavras
    candidates.push(`${parts[0]} ${parts[1]}`);
  }
  
  // Padrões específicos comuns em nomes de arquivo
  const patterns = [
    // "NOME_SOBRENOME_documento"
    /^([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)/i,
    // "documento_NOME_SOBRENOME"  
    /([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)$/i,
    // "NOME SOBRENOME - documento"
    /^([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)\s*[-–]/i,
    // "documento - NOME SOBRENOME"
    /[-–]\s*([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)$/i
  ];
  
  patterns.forEach(pattern => {
    const match = fileName.match(pattern);
    if (match && match[1]) {
      candidates.push(match[1].trim());
    }
  });
  
  return candidates;
}

/**
 * Extrai nomes do conteúdo do documento
 */
function extractFromContent(text) {
  const candidates = [];
  
  // Padrões para encontrar nomes em documentos
  const patterns = [
    // "Nome: FULANO DE TAL"
    /(?:nome|funcionário|colaborador|empregado):\s*([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)/gi,
    
    // "FULANO DE TAL" seguido de CPF ou matrícula
    /([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)\s*(?:cpf|matricula|chapa):/gi,
    
    // Padrão de assinatura "_____________\nFULANO DE TAL"
    /_+\s*\n\s*([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)/g,
    
    // "Eu, FULANO DE TAL,"
    /Eu,\s+([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)/gi,
    
    // Padrão de cabeçalho com nome em maiúscula
    /^([A-ZÁÊÇÕ\s]+)$/gm
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        candidates.push(match[1].trim());
      }
    }
  });
  
  // Buscar por CPFs e tentar encontrar nomes próximos
  const cpfPattern = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
  let cpfMatch;
  while ((cpfMatch = cpfPattern.exec(text)) !== null) {
    const cpfIndex = cpfMatch.index;
    
    // Procurar nome antes do CPF (últimas 50 chars)
    const before = text.substring(Math.max(0, cpfIndex - 50), cpfIndex);
    const nameBeforeMatch = before.match(/([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)\s*$/);
    if (nameBeforeMatch) {
      candidates.push(nameBeforeMatch[1].trim());
    }
    
    // Procurar nome depois do CPF (próximas 50 chars)
    const after = text.substring(cpfIndex + cpfMatch[0].length, cpfIndex + cpfMatch[0].length + 50);
    const nameAfterMatch = after.match(/^\s*([A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)*)/);
    if (nameAfterMatch) {
      candidates.push(nameAfterMatch[1].trim());
    }
  }
  
  return candidates;
}

/**
 * Limpa e normaliza um candidato a nome
 */
function cleanCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return '';
  
  return candidate
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços para um só
    .replace(/[^\w\s\u00C0-\u00FF]/g, '') // Remove caracteres especiais, mantém acentos
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Verifica se um candidato é válido
 */
function isValidCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return false;
  
  // Deve ter pelo menos 2 caracteres
  if (candidate.length < 2) return false;
  
  // Deve ter pelo menos uma letra
  if (!/[a-zA-Z]/.test(candidate)) return false;
  
  // Não deve ser apenas números
  if (/^\d+$/.test(candidate)) return false;
  
  // Não deve conter palavras muito comuns que não são nomes
  const commonWords = [
    'documento', 'arquivo', 'pdf', 'doc', 'jpeg', 'png', 'gif',
    'contrato', 'acordo', 'termo', 'declaração', 'certidão',
    'comprovante', 'recibo', 'nota', 'fiscal', 'pagamento',
    'copia', 'original', 'digitalizado', 'escaneado',
    'rg', 'cpf', 'ctps', 'carteira', 'trabalho', 'previdencia',
    'anexo', 'formulario', 'ficha', 'cadastro', 'registro'
  ];
  
  const lowerCandidate = candidate.toLowerCase();
  if (commonWords.some(word => lowerCandidate.includes(word))) {
    return false;
  }
  
  // Deve ter formato de nome (pelo menos 2 palavras para nomes completos)
  const words = candidate.split(' ').filter(word => word.length > 0);
  if (words.length >= 2) {
    // Verificar se não são apenas preposições
    const prepositions = ['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com'];
    const meaningfulWords = words.filter(word => !prepositions.includes(word.toLowerCase()));
    return meaningfulWords.length >= 2;
  }
  
  // Para nomes de uma palavra, deve ter pelo menos 3 caracteres
  return candidate.length >= 3;
}

/**
 * Extrai números de identificação (chapa, matrícula, CPF) do texto
 */
export function extractIdentifiers(text = '', fileName = '') {
  const identifiers = new Set();
  
  // Combinar texto do arquivo e nome do arquivo
  const fullText = `${fileName} ${text}`;
  
  // Padrões para diferentes tipos de identificação
  const patterns = {
    // CPF: 123.456.789-10 ou 12345678910
    cpf: /(?:cpf[:\s]*)?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi,
    
    // Chapa/Matrícula: geralmente 4-6 dígitos
    chapa: /(?:chapa|matricula|codigo)[:\s]*(\d{4,6})/gi,
    
    // Número de funcionário
    funcionario: /(?:funcionario|empregado)[:\s]*(\d+)/gi,
    
    // PIS/PASEP
    pis: /(?:pis|pasep)[:\s]*(\d{3}\.?\d{5}\.?\d{2}-?\d)/gi
  };
  
  Object.entries(patterns).forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      if (match[1]) {
        // Normalizar o identificador (remover pontuação)
        const normalized = match[1].replace(/[.\-]/g, '');
        identifiers.add(normalized);
      }
    }
  });
  
  return Array.from(identifiers);
}

export default { extractCandidates, extractIdentifiers };
