// js/services.js

class InvoiceService {
    constructor(config) {
        this.config = config;
    }

    /**
     * 3️⃣ Estrutura preparada para integração com API
     * Simulates uploading a file and receiving extracted data.
     * In a real scenario, this would use fetch() to send the file to the backend.
     * 
     * @param {File} file - The file object from the input.
     * @returns {Promise<Object>} - A promise resolving to the extracted invoice data.
     */
    async lerNotaFiscal(file) {
        console.log(`Starting upload for file: ${file.name}`);
        return await this.uploadToBackend(file);
    }

    /**
     * Function to actually send the file to the backend API (when ready).
     * @param {File} file 
     */
    async uploadToBackend(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(this.config.api.baseUrl + this.config.api.endpoints.upload, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    }
}

// Expose the service
if (typeof window !== 'undefined') {
    window.InvoiceService = InvoiceService;
}
