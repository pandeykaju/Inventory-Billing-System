/**
 * Billing System & POS Module
 * Handles item selection, cart computation, discount & automatic 5% GST calculation,
 * customer binding, checkout, database transaction write, and printable invoice rendering.
 */

const BillingView = {
    cart: [],
    selectedCustomer: null,

    init() {
        this.setupEventListeners();
    },

    render() {
        this.renderProductCatalog();
        this.renderCustomerDropdown();
        this.updateCartUI();
    },

    renderCustomerDropdown() {
        const customers = db.find('customers');
        const selectEl = document.getElementById('billing-customer-select');
        if (!selectEl) return;

        selectEl.innerHTML = `<option value="">Walk-in Customer (Counter Sale)</option>` +
            customers.filter(c => c.name !== 'Walk-in Customer').map(c => `<option value="${c._id}">${c.name} (${c.phone})</option>`).join('');
    },

    renderProductCatalog() {
        const searchVal = (document.getElementById('pos-product-search')?.value || '').toLowerCase();
        const products = db.find('products', p => {
            return p.name.toLowerCase().includes(searchVal) || p.sku.toLowerCase().includes(searchVal);
        });

        const grid = document.getElementById('pos-product-grid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;" class="text-muted">No matching products found.</div>`;
            return;
        }

        grid.innerHTML = products.map(p => {
            const outOfStock = Number(p.stock) <= 0;
            return `
                <div class="product-item-card ${outOfStock ? 'disabled' : ''}" onclick="BillingView.addToCart('${p._id}')">
                    <div class="product-item-name">${p.name}</div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <span class="product-item-price">₹${Number(p.sellingPrice).toFixed(2)}</span>
                        <span class="product-item-stock ${outOfStock ? 'text-danger' : ''}">
                            ${outOfStock ? 'Out of stock' : p.stock + ' ' + (p.unit || 'pcs')}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const prod = db.findById('products', productId);
        if (!prod) return;

        if (Number(prod.stock) <= 0) {
            App.showToast(`"${prod.name}" is out of stock!`, 'danger');
            return;
        }

        const existing = this.cart.find(item => item.productId === productId);
        if (existing) {
            if (existing.qty + 1 > Number(prod.stock)) {
                App.showToast(`Cannot add more. Available stock limit reached (${prod.stock}).`, 'warning');
                return;
            }
            existing.qty += 1;
            existing.total = existing.qty * existing.price;
        } else {
            this.cart.push({
                productId: prod._id,
                sku: prod.sku,
                name: prod.name,
                price: Number(prod.sellingPrice),
                qty: 1,
                total: Number(prod.sellingPrice),
                maxStock: Number(prod.stock)
            });
        }

        this.updateCartUI();
    },

    updateQuantity(productId, delta) {
        const item = this.cart.find(i => i.productId === productId);
        if (!item) return;

        const newQty = item.qty + delta;
        if (newQty <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (newQty > item.maxStock) {
            App.showToast(`Stock limit reached (${item.maxStock}).`, 'warning');
            return;
        }

        item.qty = newQty;
        item.total = item.qty * item.price;
        this.updateCartUI();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.updateCartUI();
    },

    clearCart() {
        this.cart = [];
        this.updateCartUI();
    },

    updateCartUI() {
        const tbody = document.getElementById('pos-cart-tbody');
        if (!tbody) return;

        if (this.cart.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem;" class="text-muted">Cart is empty. Click items to add.</td></tr>`;
            this.calculateTotals(0, 0);
            return;
        }

        tbody.innerHTML = this.cart.map(item => `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="BillingView.updateQuantity('${item.productId}', -1)">-</button>
                        <span class="fw-bold">${item.qty}</span>
                        <button class="qty-btn" onclick="BillingView.updateQuantity('${item.productId}', 1)">+</button>
                    </div>
                </td>
                <td>₹${item.total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" style="color: var(--danger);" onclick="BillingView.removeFromCart('${item.productId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.calculateTotals();
    },

    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);

        const discountVal = parseFloat(document.getElementById('pos-discount-input')?.value || 0);
        const discountType = document.getElementById('pos-discount-type')?.value || 'percent';

        let discountAmount = 0;
        if (discountType === 'percent') {
            discountAmount = (subtotal * discountVal) / 100;
        } else {
            discountAmount = discountVal;
        }

        if (discountAmount > subtotal) discountAmount = subtotal;

        const taxableAmount = subtotal - discountAmount;

        // AUTOMATIC 5% GST CALCULATION
        const gstRate = 5;
        const gstAmount = (taxableAmount * gstRate) / 100;
        const grandTotal = taxableAmount + gstAmount;

        // UI Updates
        if (document.getElementById('pos-subtotal')) document.getElementById('pos-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        if (document.getElementById('pos-discount-amount')) document.getElementById('pos-discount-amount').textContent = `-₹${discountAmount.toFixed(2)}`;
        if (document.getElementById('pos-gst-amount')) document.getElementById('pos-gst-amount').textContent = `+₹${gstAmount.toFixed(2)} (5% GST)`;
        if (document.getElementById('pos-grand-total')) document.getElementById('pos-grand-total').textContent = `₹${grandTotal.toFixed(2)}`;

        return { subtotal, discountAmount, taxableAmount, gstRate, gstAmount, grandTotal };
    },

    setupEventListeners() {
        const searchInput = document.getElementById('pos-product-search');
        const discountInput = document.getElementById('pos-discount-input');
        const discountType = document.getElementById('pos-discount-type');

        if (searchInput) searchInput.addEventListener('input', () => this.renderProductCatalog());
        if (discountInput) discountInput.addEventListener('input', () => this.calculateTotals());
        if (discountType) discountType.addEventListener('change', () => this.calculateTotals());
    },

    processCheckout() {
        if (this.cart.length === 0) {
            App.showToast('Please add items to cart before checkout!', 'warning');
            return;
        }

        const totals = this.calculateTotals();
        const customerSelect = document.getElementById('billing-customer-select')?.value;
        let customerName = 'Walk-in Customer';
        let customerPhone = 'N/A';

        if (customerSelect) {
            const cust = db.findById('customers', customerSelect);
            if (cust) {
                customerName = cust.name;
                customerPhone = cust.phone;
                // Update customer total spent
                db.update('customers', cust._id, {
                    totalSpent: (Number(cust.totalSpent) || 0) + totals.grandTotal,
                    ordersCount: (Number(cust.ordersCount) || 0) + 1
                });
            }
        }

        const paymentMode = document.getElementById('pos-payment-mode')?.value || 'Cash';

        // Generate Invoice Document
        const invoiceCount = db.find('invoices').length + 1001;
        const invoiceData = {
            invoiceNumber: `INV-${invoiceCount}`,
            createdAt: new Date().toISOString(),
            customerName,
            customerPhone,
            items: this.cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty, total: i.total })),
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxableAmount: totals.taxableAmount,
            gstRate: totals.gstRate,
            gstAmount: totals.gstAmount,
            grandTotal: totals.grandTotal,
            paymentMode
        };

        // Save Invoice into NoSQL Database
        const savedInvoice = db.insert('invoices', invoiceData);

        // Deduct Stock from Products Collection
        this.cart.forEach(cartItem => {
            const prod = db.findById('products', cartItem.productId);
            if (prod) {
                const updatedStock = Math.max(0, Number(prod.stock) - cartItem.qty);
                db.update('products', prod._id, { stock: updatedStock });
            }
        });

        App.showToast(`Invoice ${savedInvoice.invoiceNumber} completed successfully!`, 'success');

        // Render printable receipt modal and trigger print option
        this.renderPrintableInvoice(savedInvoice);
        App.openModal('modal-invoice-print');

        // Clear cart
        this.clearCart();
        this.renderProductCatalog();
        App.updateLowStockBadge();
    },

    renderPrintableInvoice(invoice) {
        const container = document.getElementById('printable-invoice-container');
        if (!container) return;

        const config = db.find('settings')[0] || { storeName: 'TechCollege POS', storeAddress: 'Main Campus', gstNumber: '07AAAAA0000A1Z5' };

        container.innerHTML = `
            <div class="invoice-box">
                <div class="invoice-header">
                    <div>
                        <h2 style="margin:0; font-size: 20px; color: #1e293b;">${config.storeName}</h2>
                        <p style="margin:4px 0 0 0; font-size: 12px; color: #64748b;">${config.storeAddress} | Phone: ${config.storePhone}</p>
                        <p style="margin:2px 0 0 0; font-size: 12px; color: #64748b;">GSTIN: <strong>${config.gstNumber}</strong></p>
                    </div>
                    <div style="text-align: right;">
                        <h3 class="invoice-title" style="margin:0; color:#3b82f6;">TAX INVOICE</h3>
                        <p style="margin:4px 0 0 0; font-weight: bold;">${invoice.invoiceNumber}</p>
                        <p style="margin:2px 0 0 0; font-size: 12px;">Date: ${new Date(invoice.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div class="invoice-details-grid">
                    <div>
                        <strong>Billed To:</strong><br>
                        ${invoice.customerName}<br>
                        Phone: ${invoice.customerPhone}
                    </div>
                    <div style="text-align: right;">
                        <strong>Payment Method:</strong> ${invoice.paymentMode}<br>
                        <strong>Status:</strong> PAID
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Description</th>
                            <th style="text-align: right;">Price (₹)</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map((item, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${item.name}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: center;">${item.qty}</td>
                                <td style="text-align: right;">${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <table class="invoice-summary-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td>₹${invoice.subtotal.toFixed(2)}</td>
                    </tr>
                    ${invoice.discountAmount > 0 ? `
                    <tr>
                        <td>Discount:</td>
                        <td>-₹${invoice.discountAmount.toFixed(2)}</td>
                    </tr>` : ''}
                    <tr>
                        <td><strong>GST (5% Automatic Tax):</strong></td>
                        <td><strong>+₹${invoice.gstAmount.toFixed(2)}</strong></td>
                    </tr>
                    <tr class="grand-total">
                        <td>Grand Total:</td>
                        <td>₹${invoice.grandTotal.toFixed(2)}</td>
                    </tr>
                </table>

                <div class="invoice-footer">
                    <p>Thank you for your business!</p>
                    <p style="font-size: 10px; color: #aaa;">This is a computer-generated invoice for college project presentation.</p>
                </div>
            </div>
        `;
    },

    printCurrentInvoice() {
        window.print();
    }
};

window.BillingView = BillingView;
