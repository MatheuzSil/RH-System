/**
 * Módulo de similaridade para matching de nomes e identificadores
 * Usa algoritmos de distância para encontrar o melhor match entre candidatos e colaboradores
 */

/**
 * Encontra o melhor match entre candidatos e uma lista de nomes
 * @param {string[]} candidates - Lista de candidatos extraídos
 * @param {string[]} targets - Lista de nomes de colaboradores
 * @param {number} minScore - Score mínimo para considerar um match válido
 * @returns {Object|null} - Objeto com {name, score, candidate} ou null se não houver match
 */
export function bestMatch(candidates, targets, minScore = 0.7) {
  if (!candidates || !targets || candidates.length === 0 || targets.length === 0) {
    return null;
  }

  let bestResult = null;
  let bestScore = minScore;

  for (const candidate of candidates) {
    for (const target of targets) {
      const score = calculateSimilarity(candidate, target);
      
      if (score > bestScore) {
        bestScore = score;
        bestResult = {
          name: target,
          score: score,
          candidate: candidate,
          algorithm: 'combined'
        };
      }
    }
  }

  return bestResult;
}

/**
 * Calcula similaridade combinada entre duas strings
 * Usa múltiplos algoritmos para uma melhor precisão
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} - Score entre 0 e 1
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // Normalizar strings
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1;

  // Calcular diferentes tipos de similaridade
  const jaro = jaroWinklerSimilarity(norm1, norm2);
  const levenshtein = levenshteinSimilarity(norm1, norm2);
  const token = tokenSimilarity(norm1, norm2);
  const phonetic = phoneticSimilarity(norm1, norm2);

  // Peso combinado com preferência para matches mais precisos
  const combinedScore = (
    jaro * 0.3 +           // Jaro-Winkler é ótimo para nomes
    levenshtein * 0.2 +    // Levenshtein para diferenças pequenas
    token * 0.3 +          // Token para palavras em comum
    phonetic * 0.2         // Fonético para variações de grafia
  );

  return Math.round(combinedScore * 1000) / 1000; // Arredondar para 3 casas decimais
}

/**
 * Normaliza string para comparação
 */
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Múltiplos espaços para um
    .trim();
}

/**
 * Implementação do algoritmo Jaro-Winkler
 * Excelente para nomes próprios
 */
function jaroWinklerSimilarity(str1, str2) {
  const jaro = jaroSimilarity(str1, str2);
  
  if (jaro < 0.7) return jaro;

  // Calcular prefixo comum (até 4 caracteres)
  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Implementação do algoritmo Jaro
 */
function jaroSimilarity(str1, str2) {
  if (str1.length === 0 && str2.length === 0) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Encontrar matches
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Calcular transposições
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Similaridade baseada em distância de Levenshtein
 */
function levenshteinSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * Calcula distância de Levenshtein
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i] + 1,     // deletion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Similaridade baseada em tokens (palavras)
 * Útil para nomes com palavras em ordens diferentes
 */
function tokenSimilarity(str1, str2) {
  const tokens1 = new Set(str1.split(' ').filter(token => token.length > 0));
  const tokens2 = new Set(str2.split(' ').filter(token => token.length > 0));

  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(token => tokens2.has(token)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Similaridade fonética simples
 * Útil para variações de grafia
 */
function phoneticSimilarity(str1, str2) {
  const soundex1 = soundex(str1);
  const soundex2 = soundex(str2);
  
  return soundex1 === soundex2 ? 1 : 0;
}

/**
 * Implementação simples do algoritmo Soundex
 * Adaptada para português
 */
function soundex(str) {
  if (!str) return '';
  
  let soundexStr = str.toUpperCase();
  
  // Manter primeira letra
  const firstLetter = soundexStr[0];
  
  // Substituições fonéticas para português
  soundexStr = soundexStr
    .replace(/[AEIOUYHW]/g, '0')
    .replace(/[BFPV]/g, '1')
    .replace(/[CGJKQSXZ]/g, '2')
    .replace(/[DT]/g, '3')
    .replace(/[L]/g, '4')
    .replace(/[MN]/g, '5')
    .replace(/[R]/g, '6');
  
  // Remover dígitos consecutivos iguais
  soundexStr = soundexStr.replace(/(.)\1+/g, '$1');
  
  // Remover zeros
  soundexStr = soundexStr.replace(/0/g, '');
  
  // Compor resultado
  soundexStr = firstLetter + soundexStr.substring(1);
  
  // Padronizar para 4 caracteres
  soundexStr = (soundexStr + '000').substring(0, 4);
  
  return soundexStr;
}

/**
 * Encontra múltiplos matches possíveis (para debug/análise)
 * @param {string[]} candidates 
 * @param {string[]} targets 
 * @param {number} minScore 
 * @param {number} maxResults 
 * @returns {Array} - Lista de matches ordenados por score
 */
export function findMultipleMatches(candidates, targets, minScore = 0.5, maxResults = 5) {
  const matches = [];

  for (const candidate of candidates) {
    for (const target of targets) {
      const score = calculateSimilarity(candidate, target);
      
      if (score >= minScore) {
        matches.push({
          candidate,
          target,
          score,
          algorithm: 'combined'
        });
      }
    }
  }

  // Ordenar por score (maior primeiro) e limitar resultados
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Testa se dois identificadores (CPF, chapa) são equivalentes
 * @param {string} id1 
 * @param {string} id2 
 * @returns {boolean}
 */
export function identifiersMatch(id1, id2) {
  if (!id1 || !id2) return false;
  
  // Normalizar (remover pontuação e espaços)
  const norm1 = id1.replace(/[^0-9]/g, '');
  const norm2 = id2.replace(/[^0-9]/g, '');
  
  return norm1 === norm2;
}

export default {
  bestMatch,
  calculateSimilarity,
  findMultipleMatches,
  identifiersMatch
};
