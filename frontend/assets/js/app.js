// Router and Navigation Module
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.defaultRoute = 'dashboard';
        this.init();
    }

    init() {
        // Define routes
        this.addRoute('dashboard', () => dashboardModule.init());
        this.addRoute('employees', () => employeesModule.init());
        this.addRoute('departments', () => departmentsModule.init());
        this.addRoute('attendance', () => attendanceModule.init());
        this.addRoute('protocols', () => protocolsModule.init());
        this.addRoute('documents', () => documentsModule.init());
        this.addRoute('reports', () => reportsModule.init());
        
        // Handle navigation
        this.attachNavigationEvents();
        
        // Load initial route
        this.handleRouteChange();
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    attachNavigationEvents() {
        // Handle nav clicks
        qsa('nav a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigate(page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
    }

    navigate(path) {
        if (this.currentRoute === path) return;
        
        // Update URL
        history.pushState({ path }, '', `#${path}`);
        
        // Update navigation
        this.updateNavigation(path);
        
        // Load route
        this.loadRoute(path);
    }

    handleRouteChange() {
        const hash = window.location.hash.slice(1);
        const path = hash || this.defaultRoute;
        
        this.updateNavigation(path);
        this.loadRoute(path);
    }

    updateNavigation(activePath) {
        // Remove active class from all nav items
        qsa('nav a').forEach(link => link.classList.remove('active'));
        
        // Add active class to current nav item
        const activeLink = qs(`nav a[data-page="${activePath}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.currentRoute = activePath;
    }

    async loadRoute(path) {
        const handler = this.routes[path];
        
        if (!handler) {
            console.warn(`Route not found: ${path}`);
            this.navigate(this.defaultRoute);
            return;
        }

        try {
            showLoading('Carregando...');
            await handler();
        } catch (error) {
            console.error(`Error loading route ${path}:`, error);
            showToast('Erro ao carregar a página', 'error');
        } finally {
            hideLoading();
        }
    }

    // Route handlers for modules not yet created
    async loadAttendance() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Controle de Ponto</h1>
                <div>
                    <button class="btn primary">📊 Gerar Relatório</button>
                </div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>⏰ Registro de Ponto</h3>
                    <div class="attendance-clock">
                        <div class="current-time">${new Date().toLocaleTimeString('pt-BR')}</div>
                        <div class="current-date">${new Date().toLocaleDateString('pt-BR')}</div>
                        <div class="clock-actions">
                            <button class="btn success">✅ Entrada</button>
                            <button class="btn warning">⏸️ Pausa</button>
                            <button class="btn danger">❌ Saída</button>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>📊 Resumo do Dia</h3>
                    <div class="attendance-summary">
                        <div class="summary-item">
                            <span>Entrada:</span>
                            <span>08:00</span>
                        </div>
                        <div class="summary-item">
                            <span>Saída para Almoço:</span>
                            <span>12:00</span>
                        </div>
                        <div class="summary-item">
                            <span>Retorno do Almoço:</span>
                            <span>13:00</span>
                        </div>
                        <div class="summary-item">
                            <span>Horas Trabalhadas:</span>
                            <span class="highlight">07:30</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📅 Histórico de Ponto</h3>
                <div class="attendance-history">
                    <p class="empty-state">Funcionalidade em desenvolvimento</p>
                </div>
            </div>
        `;
    }

    async loadProtocols() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Protocolos</h1>
                <div>
                    <button class="btn primary">📝 Novo Protocolo</button>
                </div>
            </div>
            
            <div class="search-toolbar">
                <div class="search-box">
                    <input type="text" placeholder="Pesquisar protocolos...">
                    <button class="btn">🔍 Buscar</button>
                </div>
                <div class="filters">
                    <select>
                        <option>Todos os Status</option>
                        <option>Pendente</option>
                        <option>Em Andamento</option>
                        <option>Concluído</option>
                    </select>
                </div>
            </div>
            
            <div class="card">
                <h3>📋 Lista de Protocolos</h3>
                <div class="protocols-list">
                    <p class="empty-state">Funcionalidade em desenvolvimento</p>
                </div>
            </div>
        `;
    }

    async loadDocuments() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Documentos</h1>
                <div>
                    <button class="btn primary">📤 Upload</button>
                    <button class="btn">📁 Nova Pasta</button>
                </div>
            </div>
            
            <div class="search-toolbar">
                <div class="search-box">
                    <input type="text" placeholder="Pesquisar documentos...">
                    <button class="btn">🔍 Buscar</button>
                </div>
                <div class="filters">
                    <select>
                        <option>Todos os Tipos</option>
                        <option>Contratos</option>
                        <option>Folha de Pagamento</option>
                        <option>Documentos Pessoais</option>
                        <option>Políticas</option>
                    </select>
                </div>
            </div>
            
            <div class="card">
                <h3>📂 Estrutura de Pastas</h3>
                <div class="documents-tree">
                    <p class="empty-state">Funcionalidade em desenvolvimento</p>
                </div>
            </div>
        `;
    }

    async loadReports() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Relatórios</h1>
                <div>
                    <button class="btn primary">📊 Gerar Relatório</button>
                </div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>📈 Relatórios de Funcionários</h3>
                    <div class="report-options">
                        <button class="btn">👥 Listagem Completa</button>
                        <button class="btn">📊 Estatísticas</button>
                        <button class="btn">📅 Aniversariantes</button>
                        <button class="btn">💼 Por Departamento</button>
                    </div>
                </div>
                
                <div class="card">
                    <h3>⏰ Relatórios de Ponto</h3>
                    <div class="report-options">
                        <button class="btn">🕐 Horas Trabalhadas</button>
                        <button class="btn">📊 Frequência</button>
                        <button class="btn">⚠️ Faltas e Atrasos</button>
                        <button class="btn">📈 Horas Extras</button>
                    </div>
                </div>
                
                <div class="card">
                    <h3>📋 Relatórios Administrativos</h3>
                    <div class="report-options">
                        <button class="btn">📄 Protocolos</button>
                        <button class="btn">📁 Documentos</button>
                        <button class="btn">💰 Folha de Pagamento</button>
                        <button class="btn">🎯 Indicadores</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Session Management
class SessionManager {
    constructor() {
        this.checkSession();
    }

    checkSession() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            this.redirectToLogin();
            return false;
        }
        
        // Update user display
        this.updateUserDisplay(JSON.parse(user));
        return true;
    }

    updateUserDisplay(user) {
        const userNameEl = qs('#user-name');
        const userRoleEl = qs('#user-role');
        
        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) userRoleEl.textContent = user.role;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('mfaToken');
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }
}

// App Initialization
class App {
    constructor() {
        this.router = null;
        this.sessionManager = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }

    start() {
        // Initialize session management
        this.sessionManager = new SessionManager();
        
        if (!this.sessionManager.checkSession()) {
            return; // Redirected to login
        }
        
        // Initialize router
        this.router = new Router();
        
        // Setup logout handler
        const logoutBtn = qs('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.sessionManager.logout();
            });
        }
        
        // Setup mobile menu toggle
        this.setupMobileMenu();
        
        console.log('MARH System initialized successfully');
    }

    setupMobileMenu() {
        const menuToggle = qs('#menu-toggle');
        const sidebar = qs('aside');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    }
}

// Initialize app
const app = new App();
