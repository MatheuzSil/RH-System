// Departments Module
class DepartmentsModule {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.departments = [];
    }

    async init() {
        await this.loadDepartments();
        this.render();
        this.attachEventListeners();
    }

    async loadDepartments() {
        try {
            const response = await api('/departments');
            this.departments = response.success ? response.data : [];
        } catch (error) {
            console.error('Erro ao carregar departamentos:', error);
            this.departments = [];
        }
    }

    render() {
        const main = qs('main');
        main.innerHTML = `
            <div class="toolbar">
                <h1>Departamentos</h1>
                <div>
                    <button class="btn primary" id="add-dept-btn">
                        📁 Novo Departamento
                    </button>
                </div>
            </div>
            
            <div class="search-toolbar">
                <div class="search-box">
                    <input type="text" id="dept-search" placeholder="Pesquisar departamentos...">
                    <button class="btn" id="search-dept-btn">🔍 Buscar</button>
                </div>
            </div>

            <div class="card">
                <div id="departments-table"></div>
            </div>
        `;
        
        this.renderTable();
    }

    renderTable() {
        const container = qs('#departments-table');
        
        if (this.departments.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum departamento encontrado</p>';
            return;
        }

        const table = `
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Responsável</th>
                        <th>Funcionários</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.departments.map(dept => `
                        <tr>
                            <td><strong>${dept.name}</strong></td>
                            <td>${dept.description || '-'}</td>
                            <td>${dept.manager || '-'}</td>
                            <td>${dept.employeeCount || 0}</td>
                            <td>
                                <button class="btn small" onclick="departmentsModule.editDepartment('${dept.id}')">✏️</button>
                                <button class="btn small danger" onclick="departmentsModule.deleteDepartment('${dept.id}')">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    }

    attachEventListeners() {
        const addBtn = qs('#add-dept-btn');
        const searchBtn = qs('#search-dept-btn');
        const searchInput = qs('#dept-search');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.showDepartmentModal());
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }

    performSearch() {
        const searchTerm = qs('#dept-search').value.toLowerCase();
        
        if (!searchTerm) {
            this.renderTable();
            return;
        }

        const filtered = this.departments.filter(dept => 
            dept.name.toLowerCase().includes(searchTerm) ||
            (dept.description && dept.description.toLowerCase().includes(searchTerm)) ||
            (dept.manager && dept.manager.toLowerCase().includes(searchTerm))
        );

        const container = qs('#departments-table');
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum departamento encontrado</p>';
            return;
        }

        const table = `
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Responsável</th>
                        <th>Funcionários</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(dept => `
                        <tr>
                            <td><strong>${dept.name}</strong></td>
                            <td>${dept.description || '-'}</td>
                            <td>${dept.manager || '-'}</td>
                            <td>${dept.employeeCount || 0}</td>
                            <td>
                                <button class="btn small" onclick="departmentsModule.editDepartment('${dept.id}')">✏️</button>
                                <button class="btn small danger" onclick="departmentsModule.deleteDepartment('${dept.id}')">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    }

    showDepartmentModal(deptId = null) {
        const isEdit = !!deptId;
        const dept = isEdit ? this.departments.find(d => d.id === deptId) : {};

        const modalContent = `
            <div class="modal-header">
                <h3>${isEdit ? 'Editar' : 'Novo'} Departamento</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form id="dept-form">
                <div class="form-group">
                    <label for="dept-name">Nome do Departamento</label>
                    <input type="text" id="dept-name" value="${dept.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="dept-desc">Descrição</label>
                    <textarea id="dept-desc" rows="3">${dept.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="dept-manager">Responsável</label>
                    <input type="text" id="dept-manager" value="${dept.manager || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn primary">
                        ${isEdit ? 'Atualizar' : 'Criar'}
                    </button>
                </div>
            </form>
        `;

        showModal(modalContent);

        qs('#dept-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDepartment(isEdit ? deptId : null);
        });
    }

    async saveDepartment(deptId = null) {
        const formData = {
            name: qs('#dept-name').value,
            description: qs('#dept-desc').value,
            manager: qs('#dept-manager').value
        };

        try {
            const url = deptId ? `/departments/${deptId}` : '/departments';
            const method = deptId ? 'PUT' : 'POST';
            
            const response = await (deptId ? put(url, formData) : post(url, formData));
            
            if (response.success) {
                closeModal();
                await this.loadDepartments();
                this.renderTable();
                showToast(`Departamento ${deptId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            } else {
                showToast(response.message || 'Erro ao salvar departamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar departamento:', error);
            showToast('Erro ao salvar departamento', 'error');
        }
    }

    async deleteDepartment(deptId) {
        if (!confirm('Tem certeza que deseja excluir este departamento?')) {
            return;
        }

        try {
            const response = await del(`/departments/${deptId}`);
            
            if (response.success) {
                await this.loadDepartments();
                this.renderTable();
                showToast('Departamento excluído com sucesso!', 'success');
            } else {
                showToast(response.message || 'Erro ao excluir departamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir departamento:', error);
            showToast('Erro ao excluir departamento', 'error');
        }
    }

    editDepartment(deptId) {
        this.showDepartmentModal(deptId);
    }
}

// Initialize departments module
const departmentsModule = new DepartmentsModule();
