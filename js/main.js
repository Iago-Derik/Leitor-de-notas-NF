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
    dom.renderFields(); // Initially render empty fields or hide them until upload

    // Handle File Upload
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('drop-zone');

    // Drag and Drop Events
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

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    // Form Submission
    const form = document.getElementById('invoiceForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Gather data
        const formData = dom.getFormData(); // Need to implement this in DOMManager or manually here
        // Helper function inside DOMManager would be better, adding it now.
        // Assuming I added getFormData() to DOMManager in previous step (I did).

        const validation = validator.validate(formData);

        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        // Mock saving
        console.log("Saving invoice...", formData);
        alert("Nota Fiscal salva com sucesso!");
        
        // Reset or redirect
        form.reset();
        dom.hideDetails();
        dom.showLoader(); // briefly simulate processing
        setTimeout(() => {
            dom.hideLoader();
            dom.showLoader(); // Oops, hideLoader shows dropZone.
            // Actually just reload or reset view
            location.reload(); 
        }, 1000);
    });

    // Cancel Button
    const btnCancel = document.getElementById('btnCancel');
    btnCancel.addEventListener('click', () => {
        form.reset();
        dom.hideDetails();
        dom.showLoader(); // Using the loader/dropzone toggle logic
        setTimeout(() => {
            dom.hideLoader(); // Show dropzone again
        }, 500);
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
});
