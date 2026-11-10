/**
 * Dashboard View Controller (Metrics, Charts, Low Stock Table)
 */

const DashboardView = {
    revenueChart: null,
    categoryChart: null,

    init() {
        // Initial setup if needed
    },

    render() {
        this.renderMetrics();
        this.renderCharts();
        this.renderRecentTransactions();
        this.renderLowStockAlerts();
    },

    renderMetrics() {
        const invoices = db.find('invoices');
        const products = db.find('products');

        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
        const totalSalesCount = invoices.length;
        const totalProductsCount = products.length;
        const lowStockCount = products.filter(p => Number(p.stock) <= Number(p.minStockAlert)).length;

        document.getElementById('dash-total-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('dash-total-sales').textContent = totalSalesCount;
        document.getElementById('dash-total-products').textContent = totalProductsCount;
        document.getElementById('dash-low-stock-count').textContent = lowStockCount;
    },

    renderCharts() {
        const invoices = db.find('invoices');
        const products = db.find('products');

        // Revenue Chart (Last 7 invoices or grouped)
        const ctxRevenue = document.getElementById('chart-sales-trend');
        if (ctxRevenue) {
            const labels = invoices.slice(-7).map(inv => inv.invoiceNumber);
            const dataTotals = invoices.slice(-7).map(inv => inv.grandTotal);

            if (this.revenueChart) this.revenueChart.destroy();
            this.revenueChart = new Chart(ctxRevenue, {
                type: 'line',
                data: {
                    labels: labels.length ? labels : ['No Sales Yet'],
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: dataTotals.length ? dataTotals : [0],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 3,
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Category Chart (Doughnut)
        const ctxCategory = document.getElementById('chart-category-dist');
        if (ctxCategory) {
            const catCounts = {};
            products.forEach(p => {
                const cat = p.category || 'Uncategorized';
                catCounts[cat] = (catCounts[cat] || 0) + Number(p.stock);
            });

            const catLabels = Object.keys(catCounts);
            const catData = Object.values(catCounts);
            const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

            if (this.categoryChart) this.categoryChart.destroy();
            this.categoryChart = new Chart(ctxCategory, {
                type: 'doughnut',
                data: {
                    labels: catLabels.length ? catLabels : ['Empty'],
                    datasets: [{
                        data: catData.length ? catData : [1],
                        backgroundColor: bgColors.slice(0, catLabels.length)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    },

    renderRecentTransactions() {
        const invoices = db.find('invoices').slice().reverse().slice(0, 5);
        const tbody = document.getElementById('dash-recent-sales-tbody');
        if (!tbody) return;

        if (invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">No transactions recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = invoices.map(inv => `
            <tr>
                <td><strong>${inv.invoiceNumber}</strong></td>
                <td>${inv.customerName || 'Walk-in Customer'}</td>
                <td>₹${Number(inv.grandTotal).toFixed(2)}</td>
                <td><span class="badge badge-success">${inv.paymentMode || 'Paid'}</span></td>
                <td>${new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
            </tr>
        `).join('');
    },

    renderLowStockAlerts() {
        const lowStockProducts = db.find('products', p => Number(p.stock) <= Number(p.minStockAlert));
        const tbody = document.getElementById('dash-low-stock-tbody');
        if (!tbody) return;

        if (lowStockProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--success);" class="fw-bold"><i class="fas fa-check-circle"></i> All products have healthy stock levels!</td></tr>`;
            return;
        }

        tbody.innerHTML = lowStockProducts.map(p => `
            <tr>
                <td><strong>${p.name}</strong> <br><small class="text-muted">${p.sku}</small></td>
                <td><span class="badge badge-danger">${p.stock} ${p.unit || 'pcs'}</span></td>
                <td>Min: ${p.minStockAlert}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="InventoryView.quickRestock('${p._id}')">
                        <i class="fas fa-plus-circle"></i> Restock
                    </button>
                </td>
            </tr>
        `).join('');
    }
};

window.DashboardView = DashboardView;
