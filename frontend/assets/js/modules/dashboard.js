// Dashboard Module
class DashboardModule {
    constructor() {
        this.stats = {};
        this.recentActivities = [];
        this.charts = {};
    }

    async init() {
        await this.loadDashboardData();
        this.render();
    }

    async loadDashboardData() {
        try {
            const [statsResponse, activitiesResponse] = await Promise.all([
                api('/dashboard/stats'),
                api('/dashboard/activities')
            ]);
            
            this.stats = statsResponse.success ? statsResponse.data : {};
            this.recentActivities = activitiesResponse.success ? activitiesResponse.data : [];
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.stats = {};
            this.recentActivities = [];
        }
    }

    render() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Dashboard</h1>
                <div>
                    <span class="date">${new Date().toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</span>
                </div>
            </div>
            
            ${this.renderKPIs()}
            
            <div class="grid">
                <div class="card">
                    <h3>📊 Estatísticas Gerais</h3>
                    <div id="general-stats"></div>
                </div>
                
                <div class="card">
                    <h3>📈 Crescimento Mensal</h3>
                    <div id="monthly-chart"></div>
                </div>
            </div>
            
            <div class="row">
                <div class="card">
                    <h3>⏰ Atividades Recentes</h3>
                    <div id="recent-activities"></div>
                </div>
                
                <div class="card">
                    <h3>🎯 Metas e Objetivos</h3>
                    <div id="goals-section"></div>
                </div>
            </div>
        `;
        
        this.renderComponents();
    }

    renderKPIs() {
        const defaultStats = {
            totalEmployees: 0,
            activeEmployees: 0,
            departments: 0,
            documentsCount: 0,
            attendanceRate: 0
        };
        
        const stats = { ...defaultStats, ...this.stats };
        
        return `
            <div class="kpis">
                <div class="kpi">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-info">
                        <h3>${stats.totalEmployees}</h3>
                        <span>Total de Funcionários</span>
                    </div>
                </div>
                
                <div class="kpi">
                    <div class="kpi-icon">✅</div>
                    <div class="kpi-info">
                        <h3>${stats.activeEmployees}</h3>
                        <span>Funcionários Ativos</span>
                    </div>
                </div>
                
                <div class="kpi">
                    <div class="kpi-icon">🏢</div>
                    <div class="kpi-info">
                        <h3>${stats.departments}</h3>
                        <span>Departamentos</span>
                    </div>
                </div>
                
                <div class="kpi">
                    <div class="kpi-icon">📄</div>
                    <div class="kpi-info">
                        <h3>${stats.documentsCount}</h3>
                        <span>Documentos</span>
                    </div>
                </div>
                
                <div class="kpi">
                    <div class="kpi-icon">⏱️</div>
                    <div class="kpi-info">
                        <h3>${stats.attendanceRate}%</h3>
                        <span>Taxa de Presença</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderComponents() {
        this.renderGeneralStats();
        this.renderRecentActivities();
        this.renderMonthlyChart();
        this.renderGoals();
    }

    renderGeneralStats() {
        const container = qs('#general-stats');
        
        const stats = [
            { label: 'Admissões este mês', value: this.stats.hiredThisMonth || 0, trend: '+5%' },
            { label: 'Demissões este mês', value: this.stats.firedThisMonth || 0, trend: '-2%' },
            { label: 'Aniversariantes', value: this.stats.birthdays || 0, trend: '' },
            { label: 'Férias programadas', value: this.stats.vacations || 0, trend: '' }
        ];
        
        container.innerHTML = stats.map(stat => `
            <div class="stat-item">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">
                    ${stat.value}
                    ${stat.trend ? `<span class="trend ${stat.trend.includes('-') ? 'negative' : 'positive'}">${stat.trend}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderRecentActivities() {
        const container = qs('#recent-activities');
        
        if (this.recentActivities.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhuma atividade recente</p>';
            return;
        }
        
        container.innerHTML = this.recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                <div class="activity-info">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${formatDate(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    renderMonthlyChart() {
        const container = qs('#monthly-chart');
        
        // Simplified chart representation
        const monthlyData = this.stats.monthlyGrowth || [0, 2, 5, 3, 8, 12];
        const maxValue = Math.max(...monthlyData);
        
        container.innerHTML = `
            <div class="simple-chart">
                ${monthlyData.map((value, index) => `
                    <div class="chart-bar">
                        <div class="bar" style="height: ${(value / maxValue) * 100}%"></div>
                        <div class="bar-label">${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][index]}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderGoals() {
        const container = qs('#goals-section');
        
        const goals = this.stats.goals || [
            { title: 'Reduzir Turnover', progress: 75, target: '< 5%' },
            { title: 'Aumentar Satisfação', progress: 60, target: '> 85%' },
            { title: 'Treinamentos', progress: 90, target: '100 horas' }
        ];
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <div class="goal-header">
                    <span class="goal-title">${goal.title}</span>
                    <span class="goal-target">${goal.target}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.progress}%"></div>
                </div>
                <div class="goal-progress">${goal.progress}% concluído</div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'hire': '👋',
            'fire': '👋',
            'document': '📄',
            'training': '🎓',
            'vacation': '🏖️',
            'birthday': '🎂',
            'promotion': '📈',
            'meeting': '🤝'
        };
        
        return icons[type] || '📌';
    }

    async refreshData() {
        await this.loadDashboardData();
        this.renderComponents();
        showToast('Dashboard atualizado!', 'success');
    }
}

// Initialize dashboard module
const dashboardModule = new DashboardModule();
