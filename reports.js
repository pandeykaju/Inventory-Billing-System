/**
 * Sales Reports & Analytics Module
 * Provides sales data filtering, revenue analytics, invoice re-printing, and CSV report export.
 */

const ReportsView = {
    init() {
        this.setupFilterListeners();
    },

    render() {
        this.renderReports();
    },

    getFilteredInvoices() {
        const filterVal = document.getElementById('report-date-filter')?.value || 'all';
        const allInvoices = db.find('invoices');
        const now = new Date();

        return allInvoices.filter(inv => {
            const invDate = new Date(inv.createdAt);
            if (filterVal === 'today') {
                return invDate.toDateString() === now.toDateString();
            } else if (filterVal === '7days') {
                const diffTime = Math.abs(now - invDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            } else if (filterVal === '30days') {
                const diffTime = Math.abs(now - invDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            }
            return true; // 'all'
        });
    },

    renderReports() {
        const invoices = this.getFilteredInvoices();

        // Calculate Metrics
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
        const totalGST = invoices.reduce((sum, inv) => sum + Number(inv.gstAmount || 0), 0);
        const totalDiscounts = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0);

        document.getElementById('report-total-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('report-total-gst').textContent = `₹${totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('report-total-discounts').textContent = `₹${totalDiscounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('report-total-invoices').textContent = invoices.length;

        // Render Table
        const tbody = document.getElementById('report-sales-tbody');
        if (!tbody) return;

        if (invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">No sales invoices found for selected period.</td></tr>`;
            return;
        }

        tbody.innerHTML = invoices.slice().reverse().map(inv => `
            <tr>
                <td><strong>${inv.invoiceNumber}</strong></td>
                <td>${new Date(inv.createdAt).toLocaleString('en-IN')}</td>
                <td>${inv.customerName}</td>
                <td>₹${Number(inv.subtotal).toFixed(2)}</td>
                <td>₹${Number(inv.gstAmount).toFixed(2)} (5%)</td>
                <td><strong>₹${Number(inv.grandTotal).toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="ReportsView.viewInvoiceDetail('${inv._id}')">
                        <i class="fas fa-eye"></i> View / Print
                    </button>
                </td>
            </tr>
        `).join('');
    },

    setupFilterListeners() {
        const filterSelect = document.getElementById('report-date-filter');
        if (filterSelect) filterSelect.addEventListener('change', () => this.renderReports());
    },

    viewInvoiceDetail(id) {
        const inv = db.findById('invoices', id);
        if (!inv) return;

        BillingView.renderPrintableInvoice(inv);
        App.openModal('modal-invoice-print');
    },

    exportCSV() {
        const invoices = this.getFilteredInvoices();
        if (invoices.length === 0) {
            App.showToast('No sales data to export!', 'warning');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Invoice Number,Date,Customer Name,Phone,Subtotal,Discount Amount,GST Amount (5%),Grand Total,Payment Mode\n";

        invoices.forEach(inv => {
            const row = [
                `"${inv.invoiceNumber}"`,
                `"${new Date(inv.createdAt).toLocaleString('en-IN')}"`,
                `"${inv.customerName}"`,
                `"${inv.customerPhone}"`,
                inv.subtotal.toFixed(2),
                inv.discountAmount.toFixed(2),
                inv.gstAmount.toFixed(2),
                inv.grandTotal.toFixed(2),
                `"${inv.paymentMode}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        App.showToast('Sales report CSV exported!', 'success');
    }
};

window.ReportsView = ReportsView;
