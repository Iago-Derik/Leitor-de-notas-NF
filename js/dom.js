// js/dom.js

class DOMManager {
    constructor(config) {
        this.config = config;
        this.elements = {
            paymentSelect: document.getElementById('paymentMethod'),
            dynamicFieldsContainer: document.getElementById('dynamic-fields'),
            loader: document.getElementById('loader'),
            detailsSection: document.getElementById('details-section'),
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('fileInput'),
            form: document.getElementById('invoiceForm')
        };
    }

    /**
     * 1️⃣ Formas de pagamento dinâmicas
     * Populates the payment method select box.
     */
    populatePaymentMethods() {
        const select = this.elements.paymentSelect;
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        this.config.paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
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

        Object.entries(this.config.fieldConfig).forEach(([key, fieldConfig]) => {
            const value = data[key] || '';
            const isAuto = data[key] !== undefined;

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.htmlFor = key;
            label.textContent = fieldConfig.label;

            // 5️⃣ Melhorias visuais - Badges
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

            const input = document.createElement('input');
            input.type = fieldConfig.type;
            input.id = key;
            input.name = key;
            input.value = value;
            
            if (fieldConfig.required) {
                input.required = true;
            }
            
            if (!fieldConfig.editable) {
                input.readOnly = true;
                input.style.backgroundColor = '#e9ecef';
            }

            if (fieldConfig.step) {
                input.step = fieldConfig.step;
            }

            formGroup.appendChild(label);
            formGroup.appendChild(input);
            container.appendChild(formGroup);
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
