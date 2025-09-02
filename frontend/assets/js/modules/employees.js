// Employee Management Module
import { api, post, put, del } from '../utils/api.js';
import { qs, brl, btn, formatDateBR, getInitials, sanitizeHtml } from '../utils/helpers.js';
import { currentUser } from '../auth/session.js';
import { ROLES, EMPLOYEE_STATUS } from '../utils/constants.js';

// Module state
let employees = [];
let departments = [];
let currentEmployee = null;
let viewMode = 'cards'; // 'cards' or 'table'
let searchTerm = '';

// Initialize employee module
export async function initEmployeeModule() {
  await refreshData();
  setupEventListeners();
  render();
}

// Refresh data from API
async function refreshData() {
  try {
    employees = await api('/employees');
    departments = await api('/departments');
  } catch (error) {
    console.error('Error loading employee data:', error);
  }
}

// Main render function
export async function render() {
  await refreshData();
  
  if (viewMode === 'cards') {
    renderCards();
  } else {
    renderTable();
  }
  
  updateToggleButton();
  setupSearch();
}

// Setup event listeners
function setupEventListeners() {
  const newEmpBtn = qs('#new-emp');
  const toggleBtn = qs('#toggle-view');
  const exportBtn = qs('#exp-emp');
  
  if (newEmpBtn) {
    newEmpBtn.onclick = () => openEmployeeModal();
  }
  
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      viewMode = viewMode === 'cards' ? 'table' : 'cards';
      render();
    };
  }
  
  if (exportBtn) {
    exportBtn.onclick = (e) => {
      e.preventDefault();
      window.open('/api/export/employees.csv', '_blank');
    };
  }
}

// Update toggle button text
function updateToggleButton() {
  const toggleBtn = qs('#toggle-view');
  if (toggleBtn) {
    toggleBtn.textContent = viewMode === 'cards' ? '📋 Tabela' : '📊 Cards';
  }
}

// Setup search functionality
function setupSearch() {
  const searchInput = qs('#search-input');
  const searchBtn = qs('#btn-search-employees');
  
  if (!searchInput || !searchBtn) return;
  
  const performSearch = () => {
    searchTerm = searchInput.value;
    if (viewMode === 'cards') {
      renderCards();
    } else {
      renderTable();
    }
  };
  
  searchBtn.onclick = (e) => {
    e.preventDefault();
    performSearch();
  };
  
  searchInput.onkeyup = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    } else if (searchInput.value.trim() === '' && searchTerm !== '') {
      searchTerm = '';
      performSearch();
    }
  };
}

// Filter employees based on search term
function filterEmployees(employeeList) {
  if (!searchTerm.trim()) {
    return employeeList;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const filtered = employeeList.filter(emp => {
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.email && emp.email.toLowerCase().includes(term)) ||
      (emp.position && emp.position.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      (emp.phone && emp.phone.toLowerCase().includes(term))
    );
  });
  
  console.log(`Search for "${term}": ${filtered.length} results of ${employeeList.length} total`);
  return filtered;
}

// Render cards view
function renderCards() {
  const cardsContainer = qs('#employees-cards');
  const tableContainer = qs('#employees-table');
  
  if (!cardsContainer) return;
  
  cardsContainer.classList.remove('hidden');
  if (tableContainer) tableContainer.classList.add('hidden');
  
  const filteredEmployees = filterEmployees(employees);
  cardsContainer.innerHTML = '';
  
  if (filteredEmployees.length === 0) {
    cardsContainer.innerHTML = createEmptyState();
    return;
  }
  
  filteredEmployees.forEach(emp => {
    const card = createEmployeeCard(emp);
    cardsContainer.appendChild(card);
  });
  
  updateSearchResults(filteredEmployees.length, employees.length);
}

// Render table view
function renderTable() {
  const cardsContainer = qs('#employees-cards');
  const tableContainer = qs('#employees-table');
  const tbody = qs('#tbl-emp tbody');
  
  if (!tableContainer || !tbody) return;
  
  if (cardsContainer) cardsContainer.classList.add('hidden');
  tableContainer.classList.remove('hidden');
  
  const filteredEmployees = filterEmployees(employees);
  tbody.innerHTML = '';
  
  if (filteredEmployees.length === 0) {
    tbody.innerHTML = createEmptyTableRow();
    return;
  }
  
  filteredEmployees.forEach(emp => {
    const row = createEmployeeRow(emp);
    tbody.appendChild(row);
  });
  
  updateSearchResults(filteredEmployees.length, employees.length);
}

// Create employee card
function createEmployeeCard(emp) {
  const card = document.createElement('div');
  card.className = 'employee-card';
  
  const initials = getInitials(emp.name);
  const salary = emp.salary ? brl(emp.salary) : 'Não informado';
  const hireDate = formatDateBR(emp.hireDate);
  const deptName = getDepartmentName(emp.department);
  
  card.innerHTML = `
    <div class="employee-avatar">${initials}</div>
    <div class="employee-name">${sanitizeHtml(emp.name)}</div>
    <div class="employee-position">${sanitizeHtml(emp.position || 'Cargo não informado')}</div>
    <div class="employee-department">${sanitizeHtml(deptName)}</div>
    <div class="employee-info">
      <div>📧 ${sanitizeHtml(emp.email)}</div>
      <div>📱 ${sanitizeHtml(emp.phone || 'Não informado')}</div>
      <div>💰 ${salary}</div>
      <div>📅 Admissão: ${hireDate}</div>
    </div>
    <div style="margin-top: 1rem;">
      <span class="employee-status ${emp.status || 'ATIVO'}">${emp.status || 'ATIVO'}</span>
    </div>
    <div class="employee-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
      <button type="button" class="btn small view-btn">👁️ Ver</button>
      ${currentUser.role === ROLES.ADMIN ? '<button type="button" class="btn small bad delete-btn">🗑️ Excluir</button>' : ''}
    </div>
  `;
  
  // Add event listeners
  const viewBtn = card.querySelector('.view-btn');
  if (viewBtn) {
    viewBtn.onclick = (e) => {
      e.stopPropagation();
      openEmployeeModal(emp);
    };
  }
  
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteEmployee(emp.id);
    };
  }
  
  // Click anywhere on card to open modal (except buttons)
  card.onclick = (e) => {
    if (!e.target.closest('button')) {
      openEmployeeModal(emp);
    }
  };
  
  return card;
}

// Create employee table row
function createEmployeeRow(emp) {
  const row = document.createElement('tr');
  const deptName = getDepartmentName(emp.department);
  
  row.innerHTML = `
    <td>${sanitizeHtml(emp.name)}</td>
    <td>${sanitizeHtml(emp.email)}</td>
    <td>${sanitizeHtml(deptName)}</td>
    <td>${sanitizeHtml(emp.position || '')}</td>
    <td>${brl(emp.salary || 0)}</td>
    <td>${sanitizeHtml(emp.status || 'ATIVO')}</td>
    <td class="right"></td>
  `;
  
  const actionCell = row.querySelector('td:last-child');
  
  if ([ROLES.ADMIN, ROLES.RH, ROLES.GESTOR].includes(currentUser.role)) {
    actionCell.appendChild(btn('Ver', () => openEmployeeModal(emp)));
    
    if (currentUser.role === ROLES.ADMIN) {
      actionCell.appendChild(btn('Excluir', () => deleteEmployee(emp.id), 'bad'));
    }
  }
  
  return row;
}

// Get department name by ID
function getDepartmentName(deptId) {
  const dept = departments.find(d => d.id === deptId);
  return dept ? dept.name : 'Departamento não informado';
}

// Create empty state for cards
function createEmptyState() {
  return `
    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
      <h3>Nenhum colaborador encontrado</h3>
      <p>Tente usar outros termos de busca ou verifique se há colaboradores cadastrados.</p>
      ${searchTerm ? '<button type="button" class="btn" onclick="window.employeeModule.clearSearch()">Limpar Busca</button>' : ''}
    </div>
  `;
}

// Create empty table row
function createEmptyTableRow() {
  return `
    <tr>
      <td colspan="7" style="text-align: center; padding: 2rem;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
        <div>Nenhum colaborador encontrado</div>
        ${searchTerm ? '<button type="button" class="btn mt1" onclick="window.employeeModule.clearSearch()">Limpar Busca</button>' : ''}
      </td>
    </tr>
  `;
}

// Update search results counter
function updateSearchResults(found, total) {
  let resultsDiv = qs('#search-results');
  
  if (!resultsDiv) {
    resultsDiv = document.createElement('div');
    resultsDiv.id = 'search-results';
    resultsDiv.className = 'search-results';
    
    const toolbar = qs('#view-employees .toolbar');
    if (toolbar) toolbar.appendChild(resultsDiv);
  }
  
  if (searchTerm.trim()) {
    resultsDiv.innerHTML = `
      <div class="note" style="margin: 0; padding: 0.5rem; background: #e3f2fd; border-color: #2196f3; color: #1976d2;">
        📊 Mostrando <strong>${found}</strong> de <strong>${total}</strong> colaboradores para "${searchTerm}"
        <button type="button" class="btn small" onclick="window.employeeModule.clearSearch()" style="margin-left: 0.5rem;">✖ Limpar</button>
      </div>
    `;
    resultsDiv.style.display = 'block';
  } else {
    resultsDiv.style.display = 'none';
  }
}

// Clear search
export function clearSearch() {
  searchTerm = '';
  const searchInput = qs('#search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  render();
}

// Open employee modal
function openEmployeeModal(employee = null) {
  console.log('Opening employee modal:', employee);
  // This will be implemented in the modal component
}

// Delete employee
async function deleteEmployee(employeeId) {
  if (!confirm('Tem certeza que deseja excluir este colaborador?')) {
    return;
  }
  
  try {
    await del(`/employees/${employeeId}`);
    await render();
    alert('Colaborador excluído com sucesso!');
  } catch (error) {
    alert('Erro ao excluir colaborador: ' + error.message);
  }
}

// Export functions for global access
window.employeeModule = {
  clearSearch
};
