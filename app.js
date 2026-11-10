/**
 * Application Controller (SPA Routing, Modals, Toasts, Theme & Utilities)
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentView: 'dashboard',

    init() {
        this.setupNavigation();
        this.setupTheme();
        this.setupMobileMenu();
        this.updateLowStockBadge();

        // Initialize Module Views
        if (window.DashboardView) DashboardView.init();
        if (window.InventoryView) InventoryView.init();
        if (window.BillingView) BillingView.init();
        if (window.CustomersView) CustomersView.init();
        if (window.ReportsView) ReportsView.init();

        console.log('StockFlow POS Application Initialized.');
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = item.getAttribute('data-view');
                this.switchView(viewName);
                
                // Close mobile sidebar if open
                document.querySelector('.sidebar').classList.remove('mobile-open');
            });
        });
    },

    switchView(viewName) {
        this.currentView = viewName;

        // Update active nav state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.sidebar-nav .nav-item[data-view="${viewName}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update active view section
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const activeSection = document.getElementById(`view-${viewName}`);
        if (activeSection) activeSection.classList.add('active');

        // Refresh views on switch
        if (viewName === 'dashboard' && window.DashboardView) DashboardView.render();
        if (viewName === 'inventory' && window.InventoryView) InventoryView.render();
        if (viewName === 'billing' && window.BillingView) BillingView.render();
        if (viewName === 'customers' && window.CustomersView) CustomersView.render();
        if (viewName === 'reports' && window.ReportsView) ReportsView.render();

        this.updateLowStockBadge();
    },

    updateLowStockBadge() {
        const lowStockProducts = db.find('products', p => Number(p.stock) <= Number(p.minStockAlert));
        const badgeEl = document.getElementById('nav-lowstock-badge');
        if (badgeEl) {
            badgeEl.textContent = lowStockProducts.length;
            badgeEl.style.display = lowStockProducts.length > 0 ? 'inline-block' : 'none';
        }
    },

    setupTheme() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        const savedTheme = localStorage.getItem('stockflow_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('stockflow_theme', next);
                this.showToast(`Switched to ${next} theme`, 'info');
            });
        }
    },

    setupMobileMenu() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    },

    // UI Utilities: Toast Notifications
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-check-circle';
        if (type === 'danger') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        if (type === 'info') icon = 'fa-info-circle';

        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Modal Utility
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    // Export & Import Database JSON (NoSQL Backup)
    exportDatabase() {
        const jsonStr = db.exportJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StockFlow_NoSQL_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Database exported successfully!', 'success');
    },

    importDatabase(fileEvent) {
        const file = fileEvent.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = db.importJSON(e.target.result);
            if (success) {
                this.showToast('NoSQL Database restored from file!', 'success');
                this.switchView(this.currentView);
            } else {
                this.showToast('Failed to import database file.', 'danger');
            }
        };
        reader.readAsText(file);
    },

    resetDatabase() {
        if (confirm('Are you sure you want to reset all data back to initial sample state?')) {
            localStorage.clear();
            db.seedDatabase();
            this.showToast('Database reset to default sample data.', 'info');
            this.switchView('dashboard');
        }
    }
};
