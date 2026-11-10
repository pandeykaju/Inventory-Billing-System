/**
 * Customer Management Module
 */

const CustomersView = {
    init() {
        this.setupFormListeners();
        this.setupSearch();
    },

    render() {
        this.renderCustomerTable();
    },

    renderCustomerTable() {
        const searchVal = (document.getElementById('customer-search-input')?.value || '').toLowerCase();
        const customers = db.find('customers', c => {
            return c.name.toLowerCase().includes(searchVal) || (c.phone && c.phone.includes(searchVal));
        });

        const tbody = document.getElementById('customer-table-tbody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No customer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || 'N/A'}</td>
                <td>${c.email || 'N/A'}</td>
                <td>${c.address || 'N/A'}</td>
                <td><strong>₹${Number(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> (${c.ordersCount || 0} orders)</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="CustomersView.viewHistory('${c.name}')" title="Purchase History">
                        <i class="fas fa-history"></i> Orders
                    </button>
                    <button class="btn btn-sm btn-outline" style="color: var(--danger);" onclick="CustomersView.deleteCustomer('${c._id}')" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    setupSearch() {
        const input = document.getElementById('customer-search-input');
        if (input) input.addEventListener('input', () => this.renderCustomerTable());
    },

    setupFormListeners() {
        const form = document.getElementById('customer-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCustomer();
            });
        }
    },

    openAddModal() {
        document.getElementById('customer-form').reset();
        App.openModal('modal-customer');
    },

    saveCustomer() {
        const custData = {
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            email: document.getElementById('cust-email').value,
            address: document.getElementById('cust-address').value,
            totalSpent: 0,
            ordersCount: 0
        };

        db.insert('customers', custData);
        App.showToast(`Customer "${custData.name}" added successfully!`, 'success');
        App.closeModal('modal-customer');
        this.renderCustomerTable();
    },

    viewHistory(customerName) {
        const invoices = db.find('invoices', inv => inv.customerName === customerName);
        const modalBody = document.getElementById('customer-history-body');
        if (!modalBody) return;

        document.getElementById('customer-history-title').textContent = `Order History: ${customerName}`;

        if (invoices.length === 0) {
            modalBody.innerHTML = `<p class="text-muted text-center">No invoice history recorded for this customer.</p>`;
        } else {
            modalBody.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoices.map(inv => `
                            <tr>
                                <td><strong>${inv.invoiceNumber}</strong></td>
                                <td>${new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                                <td>${inv.items ? inv.items.map(i => i.name + ' (x' + i.qty + ')').join(', ') : 'N/A'}</td>
                                <td>₹${Number(inv.grandTotal).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        App.openModal('modal-customer-history');
    },

    deleteCustomer(id) {
        const cust = db.findById('customers', id);
        if (!cust) return;

        if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
            db.delete('customers', id);
            App.showToast('Customer record deleted.', 'info');
            this.renderCustomerTable();
        }
    }
};

window.CustomersView = CustomersView;
