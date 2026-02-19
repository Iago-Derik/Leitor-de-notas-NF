// js/dom.js

class DOMManager {
    constructor(config) {
        this.config = config;
        this.elements = {
            paymentSelect: document.getElementById('paymentMethod'),
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
            addCostCenterForm: document.getElementById('addCostCenterForm')
        };
    }

    /**
     * 1️⃣ Formas de pagamento dinâmicas
     * Populates the payment method select box.
     */
    populatePaymentMethods() {
        const select = this.elements.paymentSelect;
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Selecione...</option>';

        this.config.paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            select.appendChild(option);
        });
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
            } else if (fieldConfig.type === 'select') {
                input = document.createElement('select');
                // Custom select logic would go here
            } else {
                input = document.createElement('input');
                input.type = fieldConfig.type === 'text' || fieldConfig.type === 'date' ? fieldConfig.type : 'text';
            }

            input.id = fieldConfig.id;
            input.name = fieldConfig.id;

            if (fieldConfig.type !== 'select') {
                input.value = value;
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
            row.innerHTML = `<td colspan="8" style="text-align:center">Nenhuma nota salva.</td>`;
            tbody.appendChild(row);
            return;
        }

        invoices.forEach(invoice => {
            const row = document.createElement('tr');

            const costCenter = this.config.costCenters.find(c => c.codigo == invoice.centroCusto);
            const costCenterText = costCenter ? `${costCenter.codigo} - ${costCenter.descricao}` : invoice.centroCusto;

            const statusConfig = this.config.invoiceStatus.find(s => s.id === invoice.status) || { label: invoice.status, color: 'secondary' };

            row.innerHTML = `
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

    showLoader() {
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
