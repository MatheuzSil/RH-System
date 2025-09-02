# MARH - Sistema de Recursos Humanos

## 🚀 Estrutura Modularizada

Este projeto foi completamente reorganizado em uma estrutura modular para melhor manutenibilidade e escalabilidade.

### 📁 Estrutura de Pastas

```
frontend/
├── assets/
│   ├── css/
│   │   ├── main.css          # Estilos base e variáveis CSS
│   │   ├── components.css    # Estilos de componentes (botões, cards, modais)
│   │   └── layout.css        # Layout responsivo e navegação
│   └── js/
│       ├── auth/
│       │   └── session.js    # Gerenciamento de login, MFA e sessões
│       ├── components/
│       │   └── ui.js         # Componentes reutilizáveis (Modal, Toast, Loading)
│       ├── modules/
│       │   ├── dashboard.js  # Dashboard com KPIs e estatísticas
│       │   ├── employees.js  # Gestão de colaboradores (CRUD, busca, documentos)
│       │   └── departments.js # Gestão de departamentos
│       ├── utils/
│       │   ├── constants.js  # Configurações, URLs, constantes
│       │   ├── helpers.js    # Funções utilitárias (DOM, formatação)
│       │   └── api.js        # Comunicação com API, download de arquivos
│       └── app.js            # Router principal e inicialização da aplicação
├── index.html                # Página principal minimalista
└── index_old.html           # Backup do arquivo antigo
```

## ✨ Características Principais

### 🎨 Sistema Modular
- **CSS**: Separado em main, layout e components
- **JavaScript**: Dividido em módulos específicos por funcionalidade
- **Componentes**: Reutilizáveis (Modal, Toast, Loading, Dropdown)

### 🔐 Autenticação Completa
- Login com e-mail e senha
- Verificação em duas etapas (MFA)
- Gerenciamento de sessões
- Controle de acesso por perfil (ADMIN, RH, GESTOR, COLAB)

### 👥 Gestão de Colaboradores
- Interface em cards ou tabela
- Busca avançada por nome, e-mail, cargo, departamento
- CRUD completo com formulários detalhados
- Upload e gerenciamento de documentos
- Controle de validade de documentos

### 📊 Dashboard Interativo
- KPIs em tempo real
- Gráficos de crescimento
- Atividades recentes
- Metas e objetivos

### 🏢 Gestão de Departamentos
- CRUD de departamentos
- Busca e filtros
- Relatórios por departamento

## 🛠️ Como Usar

### 1. Abrir o Sistema
```bash
# Serve os arquivos estaticamente ou abra index.html no navegador
```

### 2. Login
- **Admin**: admin@marh.local / 123
- **RH**: rh@marh.local / 123  
- **Gestor**: gestor@marh.local / 123
- **Colaborador**: colab@marh.local / 123

### 3. MFA
O sistema mostrará um código de verificação que deve ser inserido na tela seguinte.

## 🔧 Funcionalidades por Módulo

### `dashboard.js`
- Carregamento de estatísticas
- Renderização de KPIs
- Gráficos simples
- Lista de atividades

### `employees.js`
- Visualização em cards/tabela
- Busca em tempo real
- Formulário completo de colaborador
- Upload de documentos com base64
- Download/visualização de arquivos
- Controle de validade de documentos

### `departments.js`
- Lista de departamentos
- Formulários de criação/edição
- Busca e filtros

### `session.js`
- Fluxo completo de login
- Verificação MFA
- Controle de sessão
- Logout seguro

### `ui.js`
- Modal responsivo
- Sistema de Toast/notificações
- Loading overlay
- Dropdown components

## 🎯 Benefícios da Nova Estrutura

### ✅ Manutenibilidade
- Código organizado em módulos específicos
- Funções bem definidas e reutilizáveis
- Fácil localização de funcionalidades

### ✅ Escalabilidade  
- Novos módulos podem ser adicionados facilmente
- Componentes reutilizáveis
- Sistema de roteamento flexível

### ✅ Performance
- Carregamento modular
- CSS otimizado
- Separação de responsabilidades

### ✅ Experiência do Usuário
- Interface responsiva
- Feedback visual (toasts, loading)
- Navegação intuitiva

## 🚀 Próximos Passos

1. **Migração do Sistema de Protocolo**: Mover funcionalidades do sistema antigo
2. **Módulos Adicionais**: Ponto, férias, folha de pagamento, etc.
3. **Temas**: Sistema de temas claro/escuro
4. **PWA**: Transformar em Progressive Web App
5. **Testes**: Implementar testes unitários

## 🐛 Sistema Legado

O arquivo `index_old.html` contém o sistema anterior para referência e recuperação de funcionalidades específicas se necessário.

---

**Desenvolvido com ❤️ para modernizar a gestão de RH**
