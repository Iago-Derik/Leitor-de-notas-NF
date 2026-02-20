// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if configuration is available
    if (!window.AppConfig) {
        console.error("Configura��o n�o encontrada!");
        return;
    }

    const config = window.AppConfig;
    const storage = new window.StorageManager();
    const services = new window.InvoiceService(config);
    const dom = new window.DOMManager(config);
    window.domManager = dom; // Expose
    const validator = new window.Validator(config);

    // --- Login Logic ---
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const appContainer = document.getElementById('appContainer');

    // Check for previous session
    const sessionUser = sessionStorage.getItem('sinf_current_user');
    if (sessionUser) {
        performLogin(sessionUser);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        if (email) {
            performLogin(email);
        }
    });

    document.getElementById('btnLogout')?.addEventListener('click', () => {
        performLogout();
    });

    function performLogin(email) {
        // 1. Get Global User List
        let registeredUsers = storage.getRegisteredUsers();
        
        // --- SECURITY CHECK ---
        const userCount = Object.keys(registeredUsers).length;
        
        if (userCount === 0) {
            // First run ever: Auto-register the first user as Admin
            if (confirm(`Nenhum usu�rio cadastrado. Deseja tornar "${email}" o administrador inicial?`)) {
                storage.registerUser(email, "", "admin"); // Admin role
                alert(`Usu�rio "${email}" cadastrado como administrador.`);
                // Refresh list
                registeredUsers = storage.getRegisteredUsers();
            } else {
                return; // User cancelled
            }
        } else {
            // Normal flow: Check if email is in the allowlist
            if (!registeredUsers[email]) {
                alert("Acesso negado! Este e-mail n�o est� cadastrado no sistema.");
                return;
            }
        }
        
        // Handle migration from old format (string) to new format (object) on the fly
        if (typeof registeredUsers[email] === 'string') {
            const oldWebhook = registeredUsers[email];
            registeredUsers = storage.getRegisteredUsers(); // refresh
            storage.registerUser(email, oldWebhook, "member"); // Default to member
        }

        // 2. Load User Config & Data
        let userData = storage.getUserData(email);
        
        const userInfo = storage.getRegisteredUsers()[email];
        // Ensure userInfo is object
        const role = (typeof userInfo === 'object') ? userInfo.role : 'member';
        const registeredWebhook = (typeof userInfo === 'object') ? userInfo.webhookUrl : userInfo;

        if (!userData) {
            // New User Setup: create default data structure
            console.log("New user detected, creating default config.");
            const webhook = registeredWebhook || ""; 
            userData = storage.createDefaultUserConfig(email, webhook);
            storage.saveUserData(email, userData);
        } else {
            // Sync Webhook if defined in registry
            if (registeredWebhook) {
                userData.webhookUrl = registeredWebhook;
            }
        }
        
        // Store Role in Config for UI permission checks
        config.userRole = role;

        // 3. Apply to Runtime Config
        applyUserConfig(userData);

        // Auto-save any migrations (like uploadDate backfill)
        saveCurrentUserData();

        // 4. Update UI
        dom.updateUserDisplay(email);
        loginOverlay.classList.add('hidden');
        appContainer.classList.remove('hidden');
        sessionStorage.setItem('sinf_current_user', email);
        
        // Initial Renders / Refresh
        dom.populateStatusSelect();
        dom.renderFields(); // uses loaded custom fields
        
        // Reset navigation to default upload section or maintain if desired
        // For simplicity, we just ensure views are updated if visible
        if (document.querySelector('#saved-invoices-section').classList.contains('hidden') === false) {
            dom.renderInvoicesTable(config.savedInvoices);
        }
        if (document.querySelector('#customization-section').classList.contains('hidden') === false) {
            dom.renderCustomizationPanel();
        }
        if (document.querySelector('#users-section').classList.contains('hidden') === false) {
             if (config.userRole !== 'admin' && config.userRole !== 'member') {
                 // alert("Sem permiss�o."); // Avoid alert loop or intrusive message on load
                 document.querySelector('.nav-link[data-target="upload-section"]').click();
                 return;
            }
            window.renderUsersTable();
            
            // Hide Add User form for non-admins
            const addForm = document.getElementById('addUserForm');
            if (config.userRole !== 'admin') {
                addForm.classList.add('hidden');
            } else {
                addForm.classList.remove('hidden');
            }
        }
    }

    function performLogout() {
        saveCurrentUserData();
        sessionStorage.removeItem('sinf_current_user');
        window.location.reload(); 
    }

    function applyUserConfig(userData) {
        config.currentUser = userData.email;
        config.currentWebhook = userData.webhookUrl;
        
        // Load Arrays (ensure they are arrays)
        config.savedInvoices = Array.isArray(userData.savedInvoices) ? userData.savedInvoices : [];
        
        // --- Migration: Backfill uploadDate ---
        // User stated old invoices are "from today".
        const todayStr = new Date().toISOString().split('T')[0];
        
        let needsSave = false;
        config.savedInvoices.forEach(inv => {
            if (!inv.uploadDate) {
                inv.uploadDate = todayStr;
                needsSave = true;
            }
        });
        // We will save this change implicitly on next action or logout, 
        // but let's persist immediately just in case
        if (needsSave) {
            // Can't call saveCurrentUserData because config.currentUser might not be fully set?
            // Actually it is set above.
            // However, this function is called DURING login, let's defer save or just modify in-memory.
            // Since `storage.saveUserData` writes to localStorage, we can do it after apply.
        }

        config.customFields = Array.isArray(userData.customFields) ? userData.customFields : [];
        config.costCenters = Array.isArray(userData.costCenters) ? userData.costCenters : [];

        // Apply saved field configurations onto default structure
        if (userData.fieldConfig) {
            Object.keys(userData.fieldConfig).forEach(key => {
                if (config.fieldConfig[key]) {
                    // Update only specific properties to allow schema updates
                    config.fieldConfig[key].active = userData.fieldConfig[key].active;
                    config.fieldConfig[key].required = userData.fieldConfig[key].required;
                }
            });
        }
    }

    function saveCurrentUserData() {
        if (!config.currentUser) return;
        
        const dataToSave = {
            email: config.currentUser,
            webhookUrl: config.currentWebhook,
            savedInvoices: config.savedInvoices,
            customFields: config.customFields,
            costCenters: config.costCenters,
            fieldConfig: config.fieldConfig // Save standard field config
        };
        storage.saveUserData(config.currentUser, dataToSave);
    }


    // --- Navigation Logic ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update Active Link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Target Section
            const targetId = link.getAttribute('data-target');
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });

            // Special Actions based on section
            if (targetId === 'saved-invoices-section') {
                dom.renderInvoicesTable(config.savedInvoices);
            } else if (targetId === 'customization-section') {
                dom.renderCustomizationPanel();
            } else if (targetId === 'users-section') {
                if (config.userRole !== 'admin' && config.userRole !== 'member') {
                     alert("Sem permiss�o.");
                     return;
                }
                window.renderUsersTable();
                
                // Hide Add User form for non-admins
                const addForm = document.getElementById('addUserForm');
                if (config.userRole !== 'admin') {
                    addForm.classList.add('hidden');
                } else {
                    addForm.classList.remove('hidden');
                }
            }
        });
    });

    // --- File Upload Logic ---
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('drop-zone');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone--over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drop-zone--over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone--over');
        if (e.dataTransfer.files.length) {
            if (e.dataTransfer.files.length > 1) {
                handleBatchUpload(e.dataTransfer.files);
            } else {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length) {
            if (fileInput.files.length > 1) {
                handleBatchUpload(fileInput.files);
            } else {
                handleFileUpload(fileInput.files[0]);
            }
        }
    });

    async function handleBatchUpload(files) {
        dom.showLoader(`Iniciando processamento em lote de ${files.length} arquivos...`);
        dom.hideDetails();

        let successCount = 0;
        let errorCount = 0;
        // Use current user's webhook
        const webhookUrl = config.currentWebhook; 

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            dom.showLoader(`Processando ${i + 1}/${files.length}: ${file.name}`);

            try {
                // 1. Extract Data
                const data = await services.lerNotaFiscal(file);

                if (!data.id) {
                     // Add literal prefix to force String type in Excel (avoids scientific notation corruption)
                     data.id = "ID-" + Date.now().toString() + Math.random().toString().substr(2, 5);
                     data._isNew = true;
                }
                if (!data.status) data.status = 'pendente';

                // Compatibilidade com Power Automate: Preenche campos que podem faltar no backend
                if (!data.centroCusto) data.centroCusto = "1001";
                if (!data.paymentMethod) data.paymentMethod = "Boleto Bancário";
                if (!data.cnpj) data.cnpj = "00.000.000/0001-91";
                if (!data.fornecedor) data.fornecedor = "Fornecedor Desconhecido";
                
                // Fallback para datas (essencial para evitar erro 400)
                const today = new Date().toISOString().split('T')[0];
                const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                if (!data.dataEmissao) data.dataEmissao = today;
                if (!data.dataVencimento) data.dataVencimento = nextMonth;

                // Fallback para número e valor
                if (!data.numeroNota) data.numeroNota = file.name.replace(/\.[^/.]+$/, "") + "-" + Date.now().toString().slice(-4);
                if (typeof data.valor === 'number') data.valor = data.valor.toFixed(2);
                if (!data.valor) data.valor = "0.00";
                
                // Add Upload Date
                data.uploadDate = new Date().toISOString().split('T')[0];

                // 2. Send to Power Automate with explicit logging.
                // Wait slightly longer for safety
                await new Promise(r => setTimeout(r, 2000));
                
                try {
                     const currentHook = config.currentWebhook;
                     if (currentHook) {
                        console.log(`[Batch] Enviando nota ${data.numeroNota || i} para ${currentHook}`);
                        
                        // Force ensuring request completes before moving to next
                        const result = await services.sendToPowerAutomate(data, currentHook);
                        if (!result) {
                            console.warn(`[Batch] Envio falhou (retorno falso) para ${data.numeroNota}`);
                        } else {
                            console.log(`[Batch] Sucesso envio para ${data.numeroNota}`);
                        }

                     } else {
                        console.warn("[Batch] Webhook não configurado.");
                     }
                } catch (e) {
                    console.error("Batch upload webhook failed for " + file.name, e);
                    // Don't modify errorCount here, as we saved locally successfully.
                    // Just log it.
                }

                // 3. Save Locally
                config.savedInvoices.push(data);
                successCount++;

            } catch (error) {
                console.error(`Falha ao processar ${file.name}:`, error);
                errorCount++;
            }
        }

        saveCurrentUserData(); // Save after batch
        dom.hideLoader();
        
        let msg = `Processamento finalizado!\nSucesso: ${successCount}\nErros: ${errorCount}`;
        if (errorCount > 0) {
            msg += "\n\nVerifique se o backend (Python) est� rodando na porta 5001.";
        }
        alert(msg);

        // Go to saved invoices
        document.querySelector('[data-target="saved-invoices-section"]').click();
    }

    async function handleFileUpload(file) {
        dom.showLoader();
        dom.hideDetails();

        try {
            const data = await services.lerNotaFiscal(file);
            console.log("Data extracted:", data);

            // Populate fields
            dom.renderFields(data);
            dom.hideLoader();
            dom.showDetails();

        } catch (error) {
            console.error(error);
            alert(`Erro ao processar arquivo: ${error.message}`);
            dom.hideLoader();
        }
    }

    // --- Form Submission Logic ---
    const form = document.getElementById('invoiceForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = dom.getFormData();
        const validation = validator.validate(formData);

        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        await saveInvoice(formData);
    });

    const btnCancel = document.getElementById('btnCancel');
    btnCancel.addEventListener('click', () => {
        form.reset();
        dom.hideDetails();
        dom.showLoader();
        setTimeout(() => {
            dom.hideLoader();
        }, 100);
    });

    async function saveInvoice(data) {
        if (!data.id) {
            data.id = Date.now().toString();
            data._isNew = true; // Flag to tell backend it's new
        } else {
            data._isNew = false; // Flag to tell backend it's an update
        }

        // Set upload date if not present
        if (!data.uploadDate) {
            data.uploadDate = new Date().toISOString().split('T')[0];
        }

        dom.hideDetails();
        dom.showLoader("Enviando para Power Automate...");

        const webhookUrl = config.currentWebhook;

        try {
            await services.sendToPowerAutomate(data, webhookUrl);

            const index = config.savedInvoices.findIndex(inv => inv.id === data.id);
            if (index >= 0) {
                // Merge existing data with new form data to preserve any non-form fields
                config.savedInvoices[index] = { ...config.savedInvoices[index], ...data };
                alert("Nota atualizada e enviada com sucesso!");
            } else {
                if (!data.status) data.status = 'pendente';
                config.savedInvoices.push(data);
                alert("Nota salva e enviada com sucesso!");
            }
            
            saveCurrentUserData(); // Save changes

            form.reset();
            dom.hideLoader();
            document.querySelector('[data-target="saved-invoices-section"]').click();

        } catch (error) {
            console.error(error);
            alert(`Erro ao enviar nota: ${error.message}`);
            dom.hideLoader();
            dom.showDetails();
        }
    }

    // --- Customization Logic ---

    // Add Custom Field
    const addFieldForm = document.getElementById('addCustomFieldForm');
    const fieldTypeSelect = document.getElementById('newFieldType');
    const optionsGroup = document.getElementById('optionsFieldGroup');

    // Toggle options input visibility listener needs to be outside submit or at init
    // But since the DOM elements exist, the code placed above is fine as long as it runs.
    if (addFieldForm) {
        // Toggle options input visibility logic
        // Ensure initial state is hidden (default)
        if (fieldTypeSelect) {
            fieldTypeSelect.addEventListener('change', () => {
                if (fieldTypeSelect.value === 'select') {
                    if (optionsGroup) optionsGroup.classList.remove('hidden');
                    const optInput = document.getElementById('newFieldOptions');
                    if (optInput) optInput.required = true;
                } else {
                    if (optionsGroup) optionsGroup.classList.add('hidden');
                    const optInput = document.getElementById('newFieldOptions');
                    if (optInput) optInput.required = false;
                }
            });
        }

        addFieldForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const label = document.getElementById('newFieldLabel').value;
            const type = document.getElementById('newFieldType').value;
            const optionsStr = document.getElementById('newFieldOptions').value;
            const id = 'custom_' + Date.now();

            let options = [];
            if (type === 'select' && optionsStr) {
                options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt);
            }

            config.customFields.push({
                id: id,
                label: label,
                type: type,
                options: options,
                required: false,
                editable: true,
                active: true
            });
            
            saveCurrentUserData(); // Save

            dom.renderCustomizationPanel();
            dom.renderFields();
            addFieldForm.reset();
            if (optionsGroup) optionsGroup.classList.add('hidden');
        });
    }

    // Add Cost Center
    const addCostCenterForm = document.getElementById('addCostCenterForm');
    if (addCostCenterForm) {
        addCostCenterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('newCostCenterCode').value;
            const desc = document.getElementById('newCostCenterDesc').value;

            if (config.costCenters.find(c => c.codigo == code)) {
                alert("C�digo j� existente!");
                return;
            }

            config.costCenters.push({
                codigo: parseInt(code),
                descricao: desc
            });
            
            saveCurrentUserData(); // Save

            dom.renderCustomizationPanel();
            dom.renderFields();
            addCostCenterForm.reset();
        });
    }

    // --- User Management Logic (Admin Panel) ---
    
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (config.userRole !== 'admin') {
                alert("Apenas administradores podem adicionar usu�rios.");
                return;
            }

            const email = document.getElementById('newUserEmail').value.trim();
            const webhook = document.getElementById('newUserWebhook').value.trim();
            const role = document.getElementById('newUserRole').value;

            const existing = storage.getRegisteredUsers();
            if (existing[email]) {
                alert("Usu�rio j� existe!");
                return;
            }

            storage.registerUser(email, webhook, role);
            alert("Usu�rio adicionado com sucesso!");
            addUserForm.reset();
            window.renderUsersTable();
        });
    }

    window.renderUsersTable = () => {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const users = storage.getRegisteredUsers();
        const currentIsAdmin = (config.userRole === 'admin');

        Object.entries(users).forEach(([email, data]) => {
            // Normalize data (string vs object)
            let webhook = "";
            let role = "member";
            if (typeof data === 'string') {
                webhook = data;
            } else {
                webhook = data.webhookUrl;
                role = data.role;
            }

            const tr = document.createElement('tr');
            
            // Logic for Buttons
            let buttonsHtml = '';
            const isSelf = (email === config.currentUser);
            
            // Access Logic
            // Admin: Can Edit/Delete Everyone
            // Member: Can Edit Self (Email Only essentially, but we use same Edit flow)
            
            if (currentIsAdmin) {
                buttonsHtml += `<button class="btn-icon edit" onclick="editUser('${email}')" title="Editar"></button>`;
                if (!isSelf) {
                     buttonsHtml += `<button class="btn-icon delete" onclick="deleteUser('${email}')" title="Excluir"></button>`;
                }
            } else {
                // Member
                if (isSelf) {
                    buttonsHtml += `<button class="btn-icon edit" onclick="editUser('${email}')" title="Editar"></button>`;
                }
            }

            tr.innerHTML = `
                <td>${email} ${isSelf ? '(Voc�)' : ''}</td>
                <td><span class="badge ${role === 'admin' ? 'badge-auto' : 'badge-manual'}">${role === 'admin' ? 'Administrador' : 'Membro'}</span></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${webhook}">${webhook}</td>
                <td>
                    ${buttonsHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.deleteUser = (email) => {
        if (config.userRole !== 'admin') {
            alert("Sem permiss�o.");
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o usu�rio ${email}? Todos os dados deste usu�rio tamb�m ser�o apagados!`)) {
            if (email === config.currentUser) {
                alert("Voc� n�o pode excluir a si mesmo enquanto est� logado.");
                return;
            }
            
            storage.removeUser(email);
            window.renderUsersTable();
        }
    };
    
    window.editUser = (oldEmail) => {
        const users = storage.getRegisteredUsers();
        let data = users[oldEmail];
        // normalize
        if (typeof data === 'string') data = { webhookUrl: data, role: 'member' };
        
        const isSelf = (oldEmail === config.currentUser);
        const isAdmin = (config.userRole === 'admin');
        
        if (!isAdmin && !isSelf) {
            alert("Permiss�o negada.");
            return;
        }

        // Simple prompt based UI for editing for now
        const newEmail = prompt("Novo E-mail:", oldEmail);
        if (newEmail === null) return;
        
        const newWebhook = prompt("URL Webhook:", data.webhookUrl);
        if (newWebhook === null) return;
        
        let newRole = data.role;
        if (isAdmin) {
             const roleInput = prompt("Cargo (admin/member):", data.role);
             if (roleInput && (roleInput === 'admin' || roleInput === 'member')) {
                 newRole = roleInput;
             }
        }
        
        if (isAdmin && isSelf && newRole !== 'admin') {
             if (!confirm("Voc� est� removendo seu pr�prio acesso de administrador. Tem certeza?")) {
                 return;
             }
        }

        storage.updateUser(oldEmail, newEmail, newWebhook, newRole);
        
        // If changed own email, update session and config
        if (isSelf) {
            config.currentUser = newEmail;
            config.currentWebhook = newWebhook;
            config.userRole = newRole;
            dom.updateUserDisplay(newEmail);
            sessionStorage.setItem('sinf_current_user', newEmail);
        }
        
        window.renderUsersTable();
    };

    // --- Global Helpers ---

    window.editInvoice = (id) => {
        const invoice = config.savedInvoices.find(inv => inv.id === id);
        if (invoice) {
            document.querySelector('[data-target="upload-section"]').click();
            dom.hideLoader();
            dom.showDetails();
            dom.renderFields(invoice);

            document.getElementById('paymentMethod').value = invoice.paymentMethod || '';
            document.getElementById('invoiceStatus').value = invoice.status || 'pendente';

            let idInput = document.getElementById('invoiceId');
            if (!idInput) {
                idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.id = 'invoiceId';
                idInput.name = 'id';
                form.appendChild(idInput);
            }
            idInput.value = invoice.id;
        }
    };

    window.deleteInvoice = (id) => {
        if (confirm("Tem certeza que deseja excluir esta nota?")) {
            config.savedInvoices = config.savedInvoices.filter(inv => inv.id !== id);
            saveCurrentUserData();
            dom.renderInvoicesTable(config.savedInvoices);
            updateBulkActionUI(); // Refresh UI state
        }
    };

    // --- Bulk Actions Logic ---

    const selectAllCheckbox = document.getElementById('selectAllInvoices');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const tableBody = document.querySelector('#invoicesTable tbody');

    function updateBulkActionUI() {
        const checkboxes = Array.from(tableBody.querySelectorAll('.invoice-select'));
        const selectedCheckboxes = checkboxes.filter(cb => cb.checked);
        
        // Update Select All Checkbox state
        if (checkboxes.length > 0) {
            const allChecked = checkboxes.every(cb => cb.checked);
            const someChecked = checkboxes.some(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }

        // Update Delete Button Visibility
        if (selectedCheckboxes.length > 0) {
            deleteSelectedBtn.classList.remove('hidden');
            deleteSelectedBtn.textContent = `Excluir Selecionados (${selectedCheckboxes.length})`;
        } else {
            deleteSelectedBtn.classList.add('hidden');
        }

        // Update Row Styles
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (cb.checked) row.classList.add('selected');
            else row.classList.remove('selected');
        });
    }

    if (selectAllCheckbox && tableBody) {
        // Toggle All
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = tableBody.querySelectorAll('.invoice-select');
            checkboxes.forEach(cb => cb.checked = isChecked);
            updateBulkActionUI();
        });

        // Delegate change event for individual checkboxes
        tableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('invoice-select')) {
                updateBulkActionUI(); 
            }
        });

        // Hook into Delete Button
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                const selectedCheckboxes = tableBody.querySelectorAll('.invoice-select:checked');
                const count = selectedCheckboxes.length;
                
                if (count === 0) return;
                
                if (confirm(`Tem certeza que deseja excluir ${count} nota(s) selecionada(s)?`)) {
                    const idsToDelete = Array.from(selectedCheckboxes).map(cb => cb.value);
                    
                    // Filter out from saved invoices
                    config.savedInvoices = config.savedInvoices.filter(inv => !idsToDelete.includes(inv.id));
                    
                    saveCurrentUserData();
                    dom.renderInvoicesTable(config.savedInvoices);
                    
                    // Reset UI
                    selectAllCheckbox.checked = false;
                    updateBulkActionUI();
                }
            });
        }
    }

    window.toggleField = (id, property) => {
        if (config.fieldConfig[id]) {
            config.fieldConfig[id][property] = !config.fieldConfig[id][property];
        } else {
            const field = config.customFields.find(f => f.id === id);
            if (field) field[property] = !field[property];
        }
        
        // Save current user customizations
        saveCurrentUserData();
        
        dom.renderCustomizationPanel();
        dom.renderFields(); 
    };

    window.deleteCustomField = (id) => {
        if (confirm("Excluir campo personalizado?")) {
            config.customFields = config.customFields.filter(f => f.id !== id);
            saveCurrentUserData();
            dom.renderCustomizationPanel();
            dom.renderFields();
        }
    };

    window.deleteCostCenter = (code) => {
        if (confirm("Excluir centro de custo?")) {
            config.costCenters = config.costCenters.filter(c => c.codigo != code);
            saveCurrentUserData();
            dom.renderCustomizationPanel();
            dom.renderFields();
        }
    };

    // --- Filter & Search Logic ---
    const searchField = document.getElementById('searchField');
    const searchInput = document.getElementById('searchInput'); // Text search
    const searchDate = document.getElementById('searchDate');   // Date filter
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    function applyFilters() {
        const field = searchField.value;
        const text = searchInput.value.toLowerCase();
        const date = searchDate ? searchDate.value : "";

        const filtered = config.savedInvoices.filter(invoice => {
            // Text Match Logic
            let matchText = true;
            if (text) {
                if (field === 'all') {
                    // Global search
                     const searchStr = (
                        (invoice.fornecedor || "") + " " + 
                        (invoice.numeroNota || "") + " " + 
                        (invoice.cnpj || "") + " " +
                        (invoice.status || "") + " " + 
                        (invoice.valor || "")
                    ).toLowerCase();
                    matchText = searchStr.includes(text);
                } else if (invoice[field]) {
                    // Specific field search
                    matchText = String(invoice[field]).toLowerCase().includes(text);
                } else {
                    matchText = false; // Field selected but empty/undefined in invoice
                }
            }

            // Date Match Logic
            let matchDate = true;
            if (date) {
                matchDate = invoice.uploadDate === date;
            }

            return matchText && matchDate;
        });

        dom.renderInvoicesTable(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    if (searchField) {
        searchField.addEventListener('change', applyFilters);
    }

    if (searchDate) {
        searchDate.addEventListener('change', applyFilters);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (searchField) searchField.value = 'all';
            if (searchDate) searchDate.value = '';
            dom.renderInvoicesTable(config.savedInvoices);
        });
    }

});
