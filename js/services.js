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
        try {
            return await this.uploadToBackend(file);
        } catch (error) {
            console.warn("Backend unavailable or upload failed. Falling back to mock data.", error);
            // Fallback for demonstration/offline mode
            return this.mockExtractData(file);
        }
    }

    mockExtractData(file) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const isXml = file.name.toLowerCase().endsWith('.xml');
                resolve({
                    id: Date.now().toString(),
                    numeroNota: Math.floor(Math.random() * 10000).toString(),
                    cnpj: "00.000.000/0001-91",
                    fornecedor: "Fornecedor Mock " + (isXml ? "(XML)" : "(PDF)"),
                    valor: (Math.random() * 1000).toFixed(2),
                    dataEmissao: new Date().toISOString().split('T')[0],
                    dataVencimento: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
                    centroCusto: "1001", // Default to first one
                    status: "pendente",
                    paymentMethod: "Boleto Bancário"
                });
            }, 1000); // Simulate network delay
        });
    }

    /**
     * Function to actually send the file to the backend API (when ready).
     * @param {File} file 
     */
    async uploadToBackend(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Ensure URL doesn't have double slashes if concatenated
            const baseUrl = this.config.api.baseUrl.endsWith('/') ? this.config.api.baseUrl.slice(0, -1) : this.config.api.baseUrl;
            const endpoint = this.config.api.endpoints.upload.startsWith('/') ? this.config.api.endpoints.upload : '/' + this.config.api.endpoints.upload;
            
            const response = await fetch(baseUrl + endpoint, {
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

    /**
     * Envia os dados da nota para o Power Automate via Webhook.
     * @param {Object} invoiceData - Os dados da nota fiscal.
     * @param {string} webhookUrl - A URL do webhook do Power Automate.
     */
    async sendToPowerAutomate(invoiceData, webhookUrl) {
        if (!webhookUrl) {
            console.warn("URL do Webhook não configurada. Simulando envio.");
            return true;
        }

        console.log("Sending to Power Automate:", invoiceData);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            if (!response.ok) {
                // Check if it's a CORS opaque response or just an error
                throw new Error(`Erro no envio para Power Automate: ${response.status} ${response.statusText}`);
            }

            console.log("Successfully sent to Power Automate");
            return true;
        } catch (error) {
            console.error("Failed to send to Power Automate:", error);
            throw error; // Propagate error so main.js handles it
        }
    }
}

// Expose the service
if (typeof window !== 'undefined') {
    window.InvoiceService = InvoiceService;
}
