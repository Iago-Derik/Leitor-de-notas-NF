// js/storage.js

class StorageManager {
    constructor() {
        this.storageKeyPrefix = 'sinf_data_';
        this.commonKey = 'sinf_global_users'; // List of registered users
    }

    // --- Global User Management (Registered Emails) ---

    getRegisteredUsers() {
        const users = localStorage.getItem(this.commonKey);
        return users ? JSON.parse(users) : {};
    }

    registerUser(email, webhookUrl, role = 'member') {
        const users = this.getRegisteredUsers();
        // Support old format migration if needed, but since we are rewriting, let's stick to new object format
        // If users[email] is string, it's old format.
        
        users[email] = {
            webhookUrl: webhookUrl,
            role: role
        };
        localStorage.setItem(this.commonKey, JSON.stringify(users));
    }

    updateUser(oldEmail, newEmail, webhookUrl, role) {
        const users = this.getRegisteredUsers();
        
        // If email changed, delete old key and add new
        if (oldEmail !== newEmail) {
            delete users[oldEmail];
            // Also need to migrate data? 
            // For simplicity in this mock, we might lose data or need to rename key
            const oldData = localStorage.getItem(this.storageKeyPrefix + oldEmail);
            if (oldData) {
                localStorage.setItem(this.storageKeyPrefix + newEmail, oldData);
                localStorage.removeItem(this.storageKeyPrefix + oldEmail);
            }
        }
        
        users[newEmail] = {
            webhookUrl: webhookUrl,
            role: role
        };
        localStorage.setItem(this.commonKey, JSON.stringify(users));
    }

    removeUser(email) {
        const users = this.getRegisteredUsers();
        delete users[email];
        localStorage.setItem(this.commonKey, JSON.stringify(users));
        
        // Also remove user specific data
        localStorage.removeItem(this.storageKeyPrefix + email);
    }

    // --- User Specific Data (Config & Invoices) ---

    getUserData(email) {
        const key = this.storageKeyPrefix + email;
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        return null; // No data found (new user)
    }

    saveUserData(email, data) {
        const key = this.storageKeyPrefix + email;
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * Creates a default user configuration structure
     */
    createDefaultUserConfig(email, webhookUrl) {
        // Deep copy of the default config from global Config object (template)
        // We'll construct it based on what's available in Config at runtime or define here
        return {
            email: email,
            webhookUrl: webhookUrl,
            savedInvoices: [],
            customFields: [],
            costCenters: [
                { codigo: 1001, descricao: "Administrativo" },
                { codigo: 2002, descricao: "Financeiro" }
            ],
            // We can clone the default field config state
            fieldConfigState: {
                // Stores only overrides or full config? Better store full config for isolation
            }
        };
    }
}

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}