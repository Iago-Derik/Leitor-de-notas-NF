// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if configuration is available
    if (!window.AppConfig) {
        console.error("Configuração não encontrada!");
        return;
    }

    const config = window.AppConfig;
    const services = new window.InvoiceService(config);
    const dom = new window.DOMManager(config);
    const validator = new window.Validator(config);

    // Initial setup
    dom.populatePaymentMethods();
    dom.populateStatusSelect();
    dom.renderFields();

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
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length) {
            handleFileUpload(fileInput.files[0]);
        }
    });

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
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = dom.getFormData();
        const validation = validator.validate(formData);

        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        // Save Invoice logic
        saveInvoice(formData);
    });

    const btnCancel = document.getElementById('btnCancel');
    btnCancel.addEventListener('click', () => {
        form.reset();
        dom.hideDetails();
        dom.showLoader(); // Reset to dropzone view logic
        setTimeout(() => {
            dom.hideLoader();
        }, 100);
    });

    function saveInvoice(data) {
        // Basic ID generation
        if (!data.id) {
            data.id = Date.now().toString();
        }

        // Check if editing existing
        const index = config.savedInvoices.findIndex(inv => inv.id === data.id);
        if (index >= 0) {
            config.savedInvoices[index] = data;
            alert("Nota atualizada com sucesso!");
        } else {
            // New invoice
            // Set default status if not present (should be handled by form default, but just in case)
            if (!data.status) data.status = 'pendente';
            config.savedInvoices.push(data);
            alert("Nota salva com sucesso!");
        }

        // Reset form and go to Saved Invoices
        form.reset();
        dom.hideDetails();
        dom.showLoader();
        setTimeout(() => {
             dom.hideLoader();
             // Simulate click on "Saved Invoices"
             document.querySelector('[data-target="saved-invoices-section"]').click();
        }, 100);
    }

    // --- Customization Logic ---

    // Add Custom Field
    const addFieldForm = document.getElementById('addCustomFieldForm');
    if (addFieldForm) {
        addFieldForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const label = document.getElementById('newFieldLabel').value;
            const type = document.getElementById('newFieldType').value;
            const id = 'custom_' + Date.now();

            config.customFields.push({
                id: id,
                label: label,
                type: type,
                required: false,
                editable: true,
                active: true
            });

            dom.renderCustomizationPanel();
            dom.renderFields(); // Refresh main form
            addFieldForm.reset();
        });
    }

    // Add Cost Center
    const addCostCenterForm = document.getElementById('addCostCenterForm');
    if (addCostCenterForm) {
        addCostCenterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('newCostCenterCode').value;
            const desc = document.getElementById('newCostCenterDesc').value;

            // Check duplicate
            if (config.costCenters.find(c => c.codigo == code)) {
                alert("Código já existente!");
                return;
            }

            config.costCenters.push({
                codigo: parseInt(code),
                descricao: desc
            });

            dom.renderCustomizationPanel();
            dom.renderFields(); // Refresh main form (cost center select)
            addCostCenterForm.reset();
        });
    }

    // --- Global Helpers for Inline Events ---

    window.editInvoice = (id) => {
        const invoice = config.savedInvoices.find(inv => inv.id === id);
        if (invoice) {
            // Switch to form view
            document.querySelector('[data-target="upload-section"]').click();
            dom.hideLoader();
            dom.showDetails();
            dom.renderFields(invoice);

            // Populate non-dynamic fields
            document.getElementById('paymentMethod').value = invoice.paymentMethod || '';
            document.getElementById('invoiceStatus').value = invoice.status || 'pendente';

            // Add hidden ID field if not exists or update it
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
            dom.renderInvoicesTable(config.savedInvoices);
        }
    };

    window.toggleField = (id, property) => {
        // Check standard config
        if (config.fieldConfig[id]) {
            config.fieldConfig[id][property] = !config.fieldConfig[id][property];
        } else {
            // Check custom fields
            const field = config.customFields.find(f => f.id === id);
            if (field) {
                field[property] = !field[property];
            }
        }
        dom.renderCustomizationPanel();
        dom.renderFields(); // Refresh main form
    };

    window.deleteCustomField = (id) => {
        if (confirm("Excluir campo personalizado?")) {
            config.customFields = config.customFields.filter(f => f.id !== id);
            dom.renderCustomizationPanel();
            dom.renderFields();
        }
    };

    window.deleteCostCenter = (code) => {
        if (confirm("Excluir centro de custo?")) {
            config.costCenters = config.costCenters.filter(c => c.codigo != code);
            dom.renderCustomizationPanel();
            dom.renderFields();
        }
    };
});
