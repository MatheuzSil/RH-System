/**
 * DEBUG SENHA FTP
 */

const senha = 'Marh542165@@';
console.log('Senha:', senha);
console.log('Tamanho:', senha.length);
console.log('Caracteres:');
for (let i = 0; i < senha.length; i++) {
  console.log(`  ${i}: '${senha[i]}' (código: ${senha.charCodeAt(i)})`);
}

// Teste simples sem biblioteca
import { Client } from 'basic-ftp';

async function testeDireto() {
  const client = new Client();
  
  try {
    // Teste com timeout maior
    client.ftp.timeout = 30000;
    
    await client.access({
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: senha,
      secure: false
    });
    
    console.log('FUNCIONOU!');
    
  } catch (error) {
    console.log('Erro:', error.message);
    
    // Tentar variações da senha
    const variacoes = [
      'Marh542165@@',
      'Marh542165@', 
      'marh542165@@',
      'MARH542165@@'
    ];
    
    for (const teste of variacoes) {
      console.log(`\nTestando: ${teste}`);
      try {
        const client2 = new Client();
        await client2.access({
          host: 'ftp.grupoworklife.com.br',
          user: 'grupoworklife',
          password: teste
        });
        console.log(`✅ FUNCIONOU COM: ${teste}`);
        client2.close();
        return;
      } catch (e) {
        console.log(`❌ Falhou: ${teste}`);
      }
    }
    
  } finally {
    client.close();
  }
}

testeDireto();
