// Modal Component
class Modal {
    constructor() {
        this.currentModal = null;
        this.createModalContainer();
    }

    createModalContainer() {
        if (qs('#modal-container')) return;
        
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        modalContainer.className = 'modal-overlay';
        modalContainer.style.display = 'none';
        
        document.body.appendChild(modalContainer);
        
        // Close modal when clicking overlay
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                this.close();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close();
            }
        });
    }

    show(content, options = {}) {
        const modalContainer = qs('#modal-container');
        const modal = document.createElement('div');
        modal.className = `modal ${options.size || 'medium'}`;
        modal.innerHTML = content;
        
        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        modalContainer.style.display = 'flex';
        
        this.currentModal = modal;
        
        // Attach close button event
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Focus first input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        return modal;
    }

    close() {
        const modalContainer = qs('#modal-container');
        if (modalContainer) {
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        }
        this.currentModal = null;
    }

    confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn" id="cancel-btn">Cancelar</button>
                    <button class="btn primary" id="confirm-btn">Confirmar</button>
                </div>
            `;
            
            const modal = this.show(content, { size: 'small' });
            
            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                this.close();
                resolve(false);
            });
            
            modal.querySelector('#confirm-btn').addEventListener('click', () => {
                this.close();
                resolve(true);
            });
        });
    }
}

// Toast Component
class Toast {
    constructor() {
        this.createToastContainer();
        this.toasts = [];
    }

    createToastContainer() {
        if (qs('#toast-container')) return;
        
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    show(message, type = 'info', duration = 5000) {
        const toastContainer = qs('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        toastContainer.appendChild(toast);
        this.toasts.push(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }
        
        return toast;
    }

    remove(toast) {
        if (!toast.parentNode) return;
        
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    clear() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// Loading Component
class Loading {
    constructor() {
        this.createLoadingOverlay();
    }

    createLoadingOverlay() {
        if (qs('#loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Carregando...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    show(message = 'Carregando...') {
        const overlay = qs('#loading-overlay');
        const textEl = overlay.querySelector('.loading-text');
        textEl.textContent = message;
        overlay.style.display = 'flex';
    }

    hide() {
        const overlay = qs('#loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Dropdown Component
class Dropdown {
    constructor(trigger, options = {}) {
        this.trigger = trigger;
        this.options = options;
        this.isOpen = false;
        this.dropdown = null;
        this.init();
    }

    init() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        document.addEventListener('click', () => {
            if (this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;
        
        this.createDropdown();
        this.positionDropdown();
        this.isOpen = true;
        
        this.trigger.classList.add('dropdown-open');
    }

    close() {
        if (!this.isOpen) return;
        
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
        
        this.isOpen = false;
        this.dropdown = null;
        this.trigger.classList.remove('dropdown-open');
    }

    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown-menu';
        
        if (this.options.items) {
            this.dropdown.innerHTML = this.options.items.map(item => {
                if (item.type === 'divider') {
                    return '<div class="dropdown-divider"></div>';
                }
                
                return `
                    <a href="#" class="dropdown-item" data-action="${item.action || ''}">
                        ${item.icon ? `<span class="dropdown-icon">${item.icon}</span>` : ''}
                        ${item.label}
                    </a>
                `;
            }).join('');
        }
        
        // Attach click handlers
        this.dropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const item = e.target.closest('.dropdown-item');
            if (item && this.options.onSelect) {
                const action = item.dataset.action;
                this.options.onSelect(action, item);
                this.close();
            }
        });
        
        document.body.appendChild(this.dropdown);
    }

    positionDropdown() {
        if (!this.dropdown) return;
        
        const triggerRect = this.trigger.getBoundingClientRect();
        const dropdownRect = this.dropdown.getBoundingClientRect();
        
        let top = triggerRect.bottom + window.scrollY;
        let left = triggerRect.left + window.scrollX;
        
        // Adjust if dropdown goes off screen
        if (left + dropdownRect.width > window.innerWidth) {
            left = triggerRect.right - dropdownRect.width;
        }
        
        if (top + dropdownRect.height > window.innerHeight + window.scrollY) {
            top = triggerRect.top + window.scrollY - dropdownRect.height;
        }
        
        this.dropdown.style.top = `${top}px`;
        this.dropdown.style.left = `${left}px`;
    }
}

// Initialize components
const modal = new Modal();
const toast = new Toast();
const loading = new Loading();

// Global helper functions
window.showModal = (content, options) => modal.show(content, options);
window.closeModal = () => modal.close();
window.confirmModal = (message, title) => modal.confirm(message, title);

window.showToast = (message, type, duration) => toast.show(message, type, duration);
window.showLoading = (message) => loading.show(message);
window.hideLoading = () => loading.hide();

window.createDropdown = (trigger, options) => new Dropdown(trigger, options);
