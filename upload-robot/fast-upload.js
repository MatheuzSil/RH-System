#!/usr/bin/env node

/**
 * ROBÔ DE UPLOAD ULTRA-RÁPIDO
 * Configuração otimizada para máxima performance
 */

import { spawn } from 'child_process';
import path from 'path';

const args = [
  'index.js',
  './documentos',
  '--concurrent', '20',           // 20 uploads simultâneos
  '--no-content',                 // Pular análise de conteúdo
  '--similarity', '0.6',          // Reduzir precisão para ganhar speed
  '--verbose'                     // Manter logs para acompanhar
];

console.log('🚀 INICIANDO ROBÔ EM MODO ULTRA-RÁPIDO...');
console.log('⚡ 20 uploads simultâneos');
console.log('📄 Análise de conteúdo: DESABILITADA');
console.log('🎯 Similaridade: 60% (mais flexível)');
console.log('=' .repeat(60));

const robot = spawn('node', args, {
  cwd: process.cwd(),
  stdio: 'inherit'
});

robot.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ UPLOAD CONCLUÍDO COM SUCESSO!');
  } else {
    console.log(`\n❌ Processo finalizado com código: ${code}`);
  }
});
