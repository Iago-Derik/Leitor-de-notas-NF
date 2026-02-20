// js/dom.js

class DOMManager {
    constructor(config) {
        this.config = config;
        this.elements = {
            statusSelect: document.getElementById('invoiceStatus'),
            dynamicFieldsContainer: document.getElementById('dynamic-fields'),
            loader: document.getElementById('loader'),
            detailsSection: document.getElementById('details-section'),
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('fileInput'),
            form: document.getElementById('invoiceForm'),
            invoicesTableBody: document.querySelector('#invoicesTable tbody'),
            fieldsConfigList: document.getElementById('fields-config-list'),
            costCentersList: document.getElementById('cost-centers-list'),
            addCustomFieldForm: document.getElementById('addCustomFieldForm'),
            addCostCenterForm: document.getElementById('addCostCenterForm'),
            currentUserDisplay: document.getElementById('currentUserDisplay'), // Changed from userSelect
            btnLogout: document.getElementById('btnLogout'),
            loaderText: document.getElementById('loader-text')
        };
    }

    // Removed populateUserSelect() as it is no longer used for sidebar select

    /**
     * Updates the user display in the sidebar
     */
    updateUserDisplay(email) {
        if (this.elements.currentUserDisplay) {
            this.elements.currentUserDisplay.textContent = email;
        }
    }


    /**
     * Populates the status select box.
     */
    populateStatusSelect() {
        const select = this.elements.statusSelect;
        select.innerHTML = '';

        this.config.invoiceStatus.forEach(status => {
            const option = document.createElement('option');
            option.value = status.id;
            option.textContent = status.label;
            select.appendChild(option);
        });
    }

    /**
     * 2️⃣ Campos configuráveis
     * Renders fields based on configuration and populates with data.
     * @param {Object} data - The data extracted from the invoice (optional).
     */
    renderFields(data = {}) {
        const container = this.elements.dynamicFieldsContainer;
        container.innerHTML = ''; // Clear existing fields

        // Combine standard and custom fields
        const allFields = { ...this.config.fieldConfig };
        this.config.customFields.forEach(field => {
            allFields[field.id] = field;
        });

        Object.values(allFields).forEach(fieldConfig => {
            if (!fieldConfig.active) return;

            const value = data[fieldConfig.id] || '';
            const isAuto = data[fieldConfig.id] !== undefined;

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.htmlFor = fieldConfig.id;
            label.textContent = fieldConfig.label;

            // Badges
            if (value && isAuto) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-auto';
                badge.textContent = 'Auto';
                label.appendChild(badge);
            } else if (fieldConfig.required && !value) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-manual';
                badge.textContent = 'Manual';
                label.appendChild(badge);
            }

            let input;
            
            if (fieldConfig.type === 'select' && fieldConfig.id === 'centroCusto') {
                input = document.createElement('select');
                input.innerHTML = '<option value="">Selecione...</option>';
                this.config.costCenters.forEach(cc => {
                    const option = document.createElement('option');
                    option.value = cc.codigo;
                    option.textContent = `${cc.codigo} - ${cc.descricao}`;
                    if (value == cc.codigo) option.selected = true;
                    input.appendChild(option);
                });
            } else if (fieldConfig.type === 'select' && fieldConfig.id === 'paymentMethod') {
                input = document.createElement('select');
                input.innerHTML = '<option value="">Selecione...</option>';
                this.config.paymentMethods.forEach(method => {
                    const option = document.createElement('option');
                    option.value = method;
                    option.textContent = method;
                    if (value === method) option.selected = true;
                    input.appendChild(option);
                });
            } else if (fieldConfig.type === 'select') {
                input = document.createElement('select');
                
                // Add default empty option
                const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = "Selecione...";
                input.appendChild(defaultOption);

                if (fieldConfig.options && Array.isArray(fieldConfig.options)) {
                    fieldConfig.options.forEach(optVal => {
                         const option = document.createElement('option');
                         option.value = optVal;
                         option.textContent = optVal;
                         if (value === optVal) option.selected = true;
                         input.appendChild(option);
                    });
                }
            } else {
                input = document.createElement('input');
                input.type = fieldConfig.type === 'text' || fieldConfig.type === 'date' ? fieldConfig.type : 'text';
            }

            input.id = fieldConfig.id;
            input.name = fieldConfig.id;

            if (fieldConfig.type !== 'select') {
                input.value = value;
                if (fieldConfig.id === 'valor' && value) {
                    let valStr = String(value);

                    // Se já estiver formatado como moeda (ex: R$ 1.500,00 ou 1.500,00)
                    // Removemos tudo que não é dígito para obter os centavos brutos (ex: 150000)
                    if (valStr.includes('R$') || valStr.includes(',')) {
                        valStr = valStr.replace(/\D/g, '');
                    } else {
                        // Se for um número float/int puro (ex: 1500.0 ou 1050.50)
                        // A função formatCurrency espera centavos inteiros (ex: 150000 para 1500.00)
                        valStr = (Number(value) * 100).toFixed(0); 
                    }
                    
                    // Aplica a formatação visual
                    input.value = this.formatCurrency(valStr);
                }
            }

            if (fieldConfig.required) {
                input.required = true;
            }
            
            if (!fieldConfig.editable) {
                input.readOnly = true;
                input.style.backgroundColor = '#e9ecef';
            }

            // Currency formatting
            if (fieldConfig.id === 'valor') {
                 input.addEventListener('input', (e) => {
                    e.target.value = this.formatCurrency(e.target.value);
                });
            }

            formGroup.appendChild(label);
            formGroup.appendChild(input);
            container.appendChild(formGroup);
        });
    }

    formatCurrency(value) {
        // Remove non-numeric characters
        value = value.replace(/\D/g, "");

        // Convert to float-like string (divide by 100)
        value = (Number(value) / 100).toFixed(2) + "";

        // Split integer and decimal parts
        let parts = value.split(".");
        let integerPart = parts[0];
        let decimalPart = parts[1];

        // Add thousand separators
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        return `R$ ${integerPart},${decimalPart}`;
    }

    /**
     * Renders the table of saved invoices.
     * @param {Array} invoices
     */
    renderInvoicesTable(invoices) {
        const tbody = this.elements.invoicesTableBody;
        tbody.innerHTML = '';

        if (invoices.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="9" style="text-align:center">Nenhuma nota salva.</td>`;
            tbody.appendChild(row);
            return;
        }

        // Sort invoices by uploadDate descending (newest first)
        const sortedInvoices = [...invoices].sort((a, b) => {
            const dateA = a.uploadDate || '';
            const dateB = b.uploadDate || '';
            return dateB.localeCompare(dateA);
        });

        let currentUploadDate = null;

        sortedInvoices.forEach(invoice => {
            // Group Header Logic
            const invoiceDate = invoice.uploadDate || 'Sem Data';
            
            if (invoiceDate !== currentUploadDate) {
                currentUploadDate = invoiceDate;
                
                // Format Date for Header
                let dateDisplay = 'Sem Data';
                if (invoice.uploadDate) {
                    const [y, m, d] = invoice.uploadDate.split('-');
                    dateDisplay = `📅 Enviado em: ${d}/${m}/${y}`;
                }

                const headerRow = document.createElement('tr');
                headerRow.className = 'table-group-header';
                // Increased colspan to 9 due to checkbox column
                headerRow.innerHTML = `<td colspan="9" style="background-color: #e9ecef; font-weight: bold; color: #495057; padding: 10px 15px;">${dateDisplay}</td>`;
                tbody.appendChild(headerRow);
            }

            const row = document.createElement('tr');
            row.setAttribute('data-invoice-id', invoice.id);
            row.className = 'invoice-row';
            
            // Toggle checkbox on row click (delegated or direct)
            row.onclick = (e) => {
                // Ignore if clicking on buttons or links
                if (e.target.closest('button') || e.target.closest('a') || e.target.type === 'checkbox') return;
                
                const checkbox = row.querySelector('.invoice-select');
                checkbox.checked = !checkbox.checked;
                // Dispatch input event to trigger any change listeners (like "select all" state update)
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            };

            const costCenter = this.config.costCenters.find(c => c.codigo == invoice.centroCusto);
            const costCenterText = costCenter ? `${costCenter.codigo} - ${costCenter.descricao}` : invoice.centroCusto;

            const statusConfig = this.config.invoiceStatus.find(s => s.id === invoice.status) || { label: invoice.status, color: 'secondary' };

            row.innerHTML = `
                <td class="checkbox-cell" style="text-align: center;">
                    <input type="checkbox" class="invoice-select" value="${invoice.id}">
                </td>
                <td>${invoice.numeroNota || '-'}</td>
                <td>${invoice.cnpj || '-'}</td>
                <td>${invoice.fornecedor || '-'}</td>
                <td>${invoice.valor || '-'}</td>
                <td>${invoice.dataEmissao || '-'}</td>
                <td>${costCenterText}</td>
                <td><span class="badge badge-${statusConfig.color}">${statusConfig.label}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.editInvoice('${invoice.id}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteInvoice('${invoice.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderCustomizationPanel() {
        // Render Fields Config
        const fieldsList = this.elements.fieldsConfigList;
        fieldsList.innerHTML = '';

        const allFields = { ...this.config.fieldConfig };
        this.config.customFields.forEach(field => {
            allFields[field.id] = field;
        });

        Object.values(allFields).forEach(field => {
            const item = document.createElement('div');
            item.className = 'config-item';

            const isStandard = this.config.fieldConfig[field.id] !== undefined;
            const deleteBtn = !isStandard ? `<button class="btn btn-sm btn-danger" onclick="window.deleteCustomField('${field.id}')">Excluir</button>` : '';

            item.innerHTML = `
                <div>
                    <strong>${field.label}</strong> (${field.type})
                </div>
                <div class="config-item-controls">
                    <label>
                        <input type="checkbox" ${field.active ? 'checked' : ''} onchange="window.toggleField('${field.id}', 'active')"> Ativo
                    </label>
                    <label>
                        <input type="checkbox" ${field.required ? 'checked' : ''} onchange="window.toggleField('${field.id}', 'required')"> Obrigatório
                    </label>
                    ${deleteBtn}
                </div>
            `;
            fieldsList.appendChild(item);
        });

        // Render Cost Centers
        const ccList = this.elements.costCentersList;
        ccList.innerHTML = '';

        this.config.costCenters.forEach(cc => {
            const item = document.createElement('div');
            item.className = 'config-item';
            item.innerHTML = `
                <div>
                    <strong>${cc.codigo}</strong> - ${cc.descricao}
                </div>
                <div class="config-item-controls">
                    <button class="btn btn-sm btn-danger" onclick="window.deleteCostCenter(${cc.codigo})">Excluir</button>
                </div>
            `;
            ccList.appendChild(item);
        });
    }

    showLoader(message = "Processando nota fiscal...") {
        if (this.elements.loaderText) {
            this.elements.loaderText.textContent = message;
        }
        this.elements.loader.classList.remove('hidden');
        this.elements.dropZone.classList.add('hidden');
    }

    hideLoader() {
        this.elements.loader.classList.add('hidden');
        this.elements.dropZone.classList.remove('hidden');
    }

    showDetails() {
        this.elements.detailsSection.classList.remove('hidden');
    }

    hideDetails() {
        this.elements.detailsSection.classList.add('hidden');
    }

    getFormData() {
        const formData = new FormData(this.elements.form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }
}

if (typeof window !== 'undefined') {
    window.DOMManager = DOMManager;
}
