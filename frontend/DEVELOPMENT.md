# MARH Development Guide

## 🔧 Configuração de Desenvolvimento

### Estrutura de Arquivos

```
frontend/
├── assets/
│   ├── css/           # Estilos modulares
│   └── js/            # JavaScript modular
│       ├── auth/      # Autenticação e sessões
│       ├── components/ # Componentes UI reutilizáveis  
│       ├── modules/   # Módulos de funcionalidades
│       ├── utils/     # Utilitários e helpers
│       └── app.js     # Router e inicialização
├── index.html         # Página principal
└── README.md          # Documentação
```

## 📝 Padrões de Código

### CSS
- Use variáveis CSS em `main.css`
- Componentes em `components.css` 
- Layout responsivo em `layout.css`

### JavaScript
- Cada módulo é uma classe
- Use `const` e `let`, evite `var`
- Funções assíncronas com async/await
- Tratamento de erros com try/catch

### Convenções de Nomenclatura
- Arquivos: kebab-case (employee-module.js)
- Classes: PascalCase (EmployeeModule)
- Variáveis/funções: camelCase (getCurrentUser)
- Constantes: UPPER_CASE (API_BASE_URL)

## 🚀 Como Adicionar Novos Módulos

### 1. Criar Arquivo do Módulo
```javascript
// assets/js/modules/novo-modulo.js
class NovoModulo {
    constructor() {
        this.data = [];
    }

    async init() {
        await this.loadData();
        this.render();
        this.attachEvents();
    }

    render() {
        // Renderizar HTML
    }
}

const novoModulo = new NovoModulo();
```

### 2. Registrar no Router
```javascript
// Em app.js
this.addRoute('novo-modulo', () => novoModulo.init());
```

### 3. Adicionar Navegação
```html
<!-- Em index.html -->
<a href="#" data-page="novo-modulo">🆕 Novo Módulo</a>
```

### 4. Incluir Script
```html
<!-- Em index.html -->
<script src="assets/js/modules/novo-modulo.js"></script>
```

## 🎨 Componentes UI

### Modal
```javascript
showModal(`
    <div class="modal-header">
        <h3>Título</h3>
        <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
        Conteúdo
    </div>
`);
```

### Toast
```javascript
showToast('Mensagem de sucesso!', 'success');
showToast('Erro!', 'error');
showToast('Aviso!', 'warning');
```

### Loading
```javascript
showLoading('Carregando dados...');
// ... operação assíncrona
hideLoading();
```

## 🔌 API Integration

### Fazer Requisições
```javascript
// GET
const data = await api('/endpoint');

// POST
const result = await post('/endpoint', { dados });

// PUT  
const updated = await put('/endpoint/id', { dados });

// DELETE
await del('/endpoint/id');
```

### Upload de Arquivos
```javascript
const fileData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
});

await api('/upload', 'POST', {
    fileName: file.name,
    fileData: fileData
});
```

## 🐛 Debug e Troubleshooting

### Console Logs
```javascript
console.log('Debug info:', data);
console.error('Erro:', error);
console.warn('Aviso:', warning);
```

### Verificar Elementos
```javascript
const element = qs('#id-elemento');
if (!element) {
    console.error('Elemento não encontrado!');
    return;
}
```

### Tratamento de Erros
```javascript
try {
    const result = await api('/endpoint');
    // sucesso
} catch (error) {
    console.error('Erro na API:', error);
    showToast('Erro ao carregar dados', 'error');
}
```

## 🧪 Testes

### Testar Funcionalidades
1. Abrir console do navegador
2. Verificar erros JavaScript
3. Testar em diferentes tamanhos de tela
4. Validar formulários

### Performance
- Use DevTools para verificar carregamento
- Otimize imagens e CSS
- Minimize requisições desnecessárias

## 📱 Responsividade

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) { }

/* Tablet */  
@media (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }
```

### Teste em Dispositivos
- Chrome DevTools
- Diferentes resoluções
- Touch vs mouse

## 🔐 Segurança

### Token Management
```javascript
// Sempre verificar token
if (!TOKEN) {
    redirectToLogin();
    return;
}

// Headers de autorização
headers: {
    'Authorization': 'Bearer ' + TOKEN
}
```

### Validação de Dados
```javascript
if (!data.name || !data.email) {
    showToast('Campos obrigatórios!', 'error');
    return;
}
```

## 🚀 Deploy

### Produção
1. Minificar CSS/JS
2. Otimizar imagens
3. Configurar HTTPS
4. Testar em produção

### Versionamento
- Use Git tags para releases
- Documente mudanças
- Teste antes de deploy

---

**Happy Coding! 🎉**
