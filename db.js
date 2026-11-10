/**
 * NoSQL Document Database Engine for Browser Storage
 * Simulates a Document Store (MongoDB / NeDB style) using LocalStorage / IndexedDB.
 * Supports collections, schema-less document insertion, auto-increment IDs, querying, and JSON export/import.
 */

class NoSQLDatabase {
    constructor(dbName = 'StockFlowNoSQLDB') {
        this.dbName = dbName;
        this.prefix = `${dbName}_collection_`;
        this.init();
    }

    init() {
        if (!this.getCollectionNames().length || !localStorage.getItem(`${this.prefix}products`)) {
            this.seedDatabase();
        }
    }

    getCollectionNames() {
        const collections = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                collections.push(key.replace(this.prefix, ''));
            }
        }
        return collections;
    }

    _getRaw(collectionName) {
        const raw = localStorage.getItem(`${this.prefix}${collectionName}`);
        try {
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error(`Error parsing collection ${collectionName}`, e);
            return [];
        }
    }

    _setRaw(collectionName, docs) {
        localStorage.setItem(`${this.prefix}${collectionName}`, JSON.stringify(docs));
    }

    // Collection Operations
    find(collectionName, queryFn = null) {
        const docs = this._getRaw(collectionName);
        if (!queryFn) return docs;
        return docs.filter(queryFn);
    }

    findById(collectionName, id) {
        const docs = this._getRaw(collectionName);
        return docs.find(doc => doc._id === id || doc._id === String(id) || doc.id === id);
    }

    insert(collectionName, doc) {
        const docs = this._getRaw(collectionName);
        const newDoc = {
            ...doc,
            _id: doc._id || 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            createdAt: doc.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        docs.push(newDoc);
        this._setRaw(collectionName, docs);
        return newDoc;
    }

    update(collectionName, id, updates) {
        const docs = this._getRaw(collectionName);
        const index = docs.findIndex(doc => doc._id === id || doc.id === id);
        if (index === -1) return null;

        docs[index] = {
            ...docs[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this._setRaw(collectionName, docs);
        return docs[index];
    }

    delete(collectionName, id) {
        let docs = this._getRaw(collectionName);
        const initialLen = docs.length;
        docs = docs.filter(doc => doc._id !== id && doc.id !== id);
        this._setRaw(collectionName, docs);
        return docs.length < initialLen;
    }

    // Database Reset & Seeding for College Project Demo
    seedDatabase() {
        const sampleProducts = [
            { _id: 'prod_101', sku: 'PRD-101', name: 'Wireless Ergonomic Mouse', category: 'Electronics', purchasePrice: 450, sellingPrice: 799, stock: 24, minStockAlert: 5, unit: 'pcs' },
            { _id: 'prod_102', sku: 'PRD-102', name: 'Mechanical RGB Keyboard', category: 'Electronics', purchasePrice: 1800, sellingPrice: 2499, stock: 15, minStockAlert: 5, unit: 'pcs' },
            { _id: 'prod_103', sku: 'PRD-103', name: '27" Ultra HD Monitor', category: 'Electronics', purchasePrice: 14000, sellingPrice: 18500, stock: 3, minStockAlert: 5, unit: 'pcs' }, // Low stock!
            { _id: 'prod_104', sku: 'PRD-104', name: 'USB-C Fast Charger 65W', category: 'Accessories', purchasePrice: 600, sellingPrice: 999, stock: 40, minStockAlert: 10, unit: 'pcs' },
            { _id: 'prod_105', sku: 'PRD-105', name: 'A4 Printing Paper (500 Sheets)', category: 'Stationery', purchasePrice: 220, sellingPrice: 320, stock: 4, minStockAlert: 10, unit: 'ream' }, // Low stock!
            { _id: 'prod_106', sku: 'PRD-106', name: 'HD Noise Cancelling Headset', category: 'Electronics', purchasePrice: 1200, sellingPrice: 1999, stock: 8, minStockAlert: 5, unit: 'pcs' },
            { _id: 'prod_107', sku: 'PRD-107', name: 'Notebook Spiral Hardbound', category: 'Stationery', purchasePrice: 60, sellingPrice: 120, stock: 55, minStockAlert: 15, unit: 'pcs' },
            { _id: 'prod_108', sku: 'PRD-108', name: 'Gel Ink Pen Blue (Box of 10)', category: 'Stationery', purchasePrice: 80, sellingPrice: 150, stock: 2, minStockAlert: 8, unit: 'box' } // Low stock!
        ];

        const sampleCustomers = [
            { _id: 'cust_1', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.s@example.com', address: 'B-12, Sector 62, Noida', totalSpent: 20498, ordersCount: 2 },
            { _id: 'cust_2', name: 'Priya Patel', phone: '9812345678', email: 'priya.patel@example.com', address: '45 Green Park, New Delhi', totalSpent: 3118, ordersCount: 1 },
            { _id: 'cust_3', name: 'Amit Kumar', phone: '9955443322', email: 'amit.k@example.com', address: '78 MG Road, Bengaluru', totalSpent: 1048, ordersCount: 1 },
            { _id: 'cust_4', name: 'Walk-in Customer', phone: 'N/A', email: 'N/A', address: 'Counter Sale', totalSpent: 0, ordersCount: 0 }
        ];

        const sampleCategories = [
            { _id: 'cat_1', name: 'Electronics', description: 'Gadgets, peripherals, and computer parts' },
            { _id: 'cat_2', name: 'Accessories', description: 'Cables, chargers, and adapters' },
            { _id: 'cat_3', name: 'Stationery', description: 'Office supplies, papers, and writing tools' }
        ];

        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const sampleInvoices = [
            {
                _id: 'INV-1001',
                invoiceNumber: 'INV-1001',
                createdAt: threeDaysAgo.toISOString(),
                customerName: 'Rahul Sharma',
                customerPhone: '9876543210',
                items: [
                    { productId: 'prod_103', name: '27" Ultra HD Monitor', price: 18500, qty: 1, total: 18500 }
                ],
                subtotal: 18500,
                discountPercent: 5,
                discountAmount: 925,
                taxableAmount: 17575,
                gstRate: 5,
                gstAmount: 878.75,
                grandTotal: 18453.75,
                paymentMode: 'UPI'
            },
            {
                _id: 'INV-1002',
                invoiceNumber: 'INV-1002',
                createdAt: yesterday.toISOString(),
                customerName: 'Priya Patel',
                customerPhone: '9812345678',
                items: [
                    { productId: 'prod_102', name: 'Mechanical RGB Keyboard', price: 2499, qty: 1, total: 2499 },
                    { productId: 'prod_104', name: 'USB-C Fast Charger 65W', price: 999, qty: 1, total: 999 }
                ],
                subtotal: 3498,
                discountPercent: 10,
                discountAmount: 349.80,
                taxableAmount: 3148.20,
                gstRate: 5,
                gstAmount: 157.41,
                grandTotal: 3305.61,
                paymentMode: 'Credit Card'
            },
            {
                _id: 'INV-1003',
                invoiceNumber: 'INV-1003',
                createdAt: today.toISOString(),
                customerName: 'Rahul Sharma',
                customerPhone: '9876543210',
                items: [
                    { productId: 'prod_101', name: 'Wireless Ergonomic Mouse', price: 799, qty: 2, total: 1598 },
                    { productId: 'prod_105', name: 'A4 Printing Paper (500 Sheets)', price: 320, qty: 1, total: 320 }
                ],
                subtotal: 1918,
                discountPercent: 0,
                discountAmount: 0,
                taxableAmount: 1918,
                gstRate: 5,
                gstAmount: 95.90,
                grandTotal: 2013.90,
                paymentMode: 'Cash'
            }
        ];

        this._setRaw('products', sampleProducts);
        this._setRaw('customers', sampleCustomers);
        this._setRaw('categories', sampleCategories);
        this._setRaw('invoices', sampleInvoices);
        this._setRaw('settings', [{ _id: 'app_config', storeName: 'TechCollege Supplies & Electronics', storeAddress: 'College Campus Tech Block, Delhi, India', storePhone: '+91 98765 43210', gstNumber: '07AAAAA0000A1Z5', gstRate: 5 }]);

        console.log('NoSQL Database seeded successfully with sample data!');
    }

    // Export full DB to JSON document
    exportJSON() {
        const data = {};
        const collections = this.getCollectionNames();
        collections.forEach(col => {
            data[col] = this._getRaw(col);
        });
        return JSON.stringify(data, null, 2);
    }

    // Import full DB from JSON document
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.keys(data).forEach(col => {
                this._setRaw(col, data[col]);
            });
            return true;
        } catch (e) {
            console.error('Failed to import JSON data into NoSQL DB', e);
            return false;
        }
    }
}

// Global Singleton Instance
const db = new NoSQLDatabase();
