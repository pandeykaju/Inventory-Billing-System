/**
 * Product & Inventory Management Module
 */

const InventoryView = {
    editingProductId: null,

    init() {
        this.setupFormListeners();
        this.setupSearchAndFilter();
    },

    render() {
        this.populateCategoriesDropdown();
        this.renderProductTable();
    },

    populateCategoriesDropdown() {
        const categories = db.find('categories');
        const filterSelect = document.getElementById('inventory-category-filter');
        const formSelect = document.getElementById('prod-category');

        if (filterSelect) {
            filterSelect.innerHTML = `<option value="">All Categories</option>` +
                categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }

        if (formSelect) {
            formSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    },

    renderProductTable() {
        const searchTerm = (document.getElementById('inventory-search-input')?.value || '').toLowerCase();
        const categoryFilter = document.getElementById('inventory-category-filter')?.value || '';
        const lowStockOnly = document.getElementById('inventory-lowstock-check')?.checked || false;

        const products = db.find('products', p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm);
            const matchesCat = !categoryFilter || p.category === categoryFilter;
            const matchesLowStock = !lowStockOnly || Number(p.stock) <= Number(p.minStockAlert);
            return matchesSearch && matchesCat && matchesLowStock;
        });

        const tbody = document.getElementById('inventory-table-tbody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;" class="text-muted">No products found matching criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = products.map(p => {
            const isLowStock = Number(p.stock) <= Number(p.minStockAlert);
            const stockBadgeClass = isLowStock ? 'badge-danger' : 'badge-success';

            return `
                <tr>
                    <td><strong>${p.sku}</strong></td>
                    <td>${p.name}</td>
                    <td><span class="badge badge-secondary">${p.category}</span></td>
                    <td>₹${Number(p.purchasePrice).toFixed(2)}</td>
                    <td><strong>₹${Number(p.sellingPrice).toFixed(2)}</strong></td>
                    <td>
                        <span class="badge ${stockBadgeClass}">
                            ${p.stock} ${p.unit || 'pcs'} ${isLowStock ? '(Low)' : ''}
                        </span>
                    </td>
                    <td>${p.minStockAlert} ${p.unit || 'pcs'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="InventoryView.openEditModal('${p._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="InventoryView.quickRestock('${p._id}')" title="Restock">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--danger);" onclick="InventoryView.deleteProduct('${p._id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    setupSearchAndFilter() {
        const searchInput = document.getElementById('inventory-search-input');
        const catFilter = document.getElementById('inventory-category-filter');
        const lowStockCheck = document.getElementById('inventory-lowstock-check');

        if (searchInput) searchInput.addEventListener('input', () => this.renderProductTable());
        if (catFilter) catFilter.addEventListener('change', () => this.renderProductTable());
        if (lowStockCheck) lowStockCheck.addEventListener('change', () => this.renderProductTable());
    },

    setupFormListeners() {
        const form = document.getElementById('product-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }
    },

    openAddModal() {
        this.editingProductId = null;
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        document.getElementById('product-form').reset();
        document.getElementById('prod-sku').value = 'PRD-' + Math.floor(100 + Math.random() * 900);
        App.openModal('modal-product');
    },

    openEditModal(id) {
        const prod = db.findById('products', id);
        if (!prod) return;

        this.editingProductId = id;
        document.getElementById('product-modal-title').textContent = 'Edit Product';

        document.getElementById('prod-sku').value = prod.sku;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-category').value = prod.category;
        document.getElementById('prod-purchase-price').value = prod.purchasePrice;
        document.getElementById('prod-selling-price').value = prod.sellingPrice;
        document.getElementById('prod-stock').value = prod.stock;
        document.getElementById('prod-min-stock').value = prod.minStockAlert;
        document.getElementById('prod-unit').value = prod.unit || 'pcs';

        App.openModal('modal-product');
    },

    saveProduct() {
        const prodData = {
            sku: document.getElementById('prod-sku').value,
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            purchasePrice: parseFloat(document.getElementById('prod-purchase-price').value) || 0,
            sellingPrice: parseFloat(document.getElementById('prod-selling-price').value) || 0,
            stock: parseInt(document.getElementById('prod-stock').value) || 0,
            minStockAlert: parseInt(document.getElementById('prod-min-stock').value) || 5,
            unit: document.getElementById('prod-unit').value || 'pcs'
        };

        if (this.editingProductId) {
            db.update('products', this.editingProductId, prodData);
            App.showToast('Product updated successfully!', 'success');
        } else {
            db.insert('products', prodData);
            App.showToast('New product added to inventory!', 'success');
        }

        App.closeModal('modal-product');
        this.renderProductTable();
        App.updateLowStockBadge();
    },

    quickRestock(id) {
        const prod = db.findById('products', id);
        if (!prod) return;

        const addQty = prompt(`Restock ${prod.name}\nCurrent stock: ${prod.stock} ${prod.unit || 'pcs'}.\nEnter quantity to add:`, "10");
        if (addQty && !isNaN(addQty) && Number(addQty) > 0) {
            const newStock = Number(prod.stock) + Number(addQty);
            db.update('products', id, { stock: newStock });
            App.showToast(`Restocked ${prod.name}! New Stock: ${newStock}`, 'success');
            this.renderProductTable();
            App.updateLowStockBadge();
        }
    },

    deleteProduct(id) {
        const prod = db.findById('products', id);
        if (!prod) return;

        if (confirm(`Are you sure you want to delete product "${prod.name}"?`)) {
            db.delete('products', id);
            App.showToast('Product deleted from inventory.', 'info');
            this.renderProductTable();
            App.updateLowStockBadge();
        }
    }
};

window.InventoryView = InventoryView;
