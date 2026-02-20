// js/services.js

class InvoiceService {
    constructor(config) {
        this.config = config;
    }

    /**
     * 3️⃣ Processamento Local com Google Gemini (Serverless)
     * Lê o arquivo PDF/Imagem, converte para Base64 e envia para a API do Google.
     * 
     * @param {File} file - O arquivo (PDF ou Imagem)
     * @returns {Promise<Object>} - Dados extraídos
     */
    async lerNotaFiscal(file) {
        console.log(`Iniciando processamento local com Gemini para: ${file.name}`);
        
        // 1. Validar API Key
        // Tenta pegar do Config (se implementado) ou usa a fixa de teste
        let apiKey = this.config.googleApiKey || localStorage.getItem('google_api_key') || 'AIzaSyA4XbKD84SIqsW_m3XP0QZ0c4psUl2NkIw';
        
        if (!apiKey) {
            // Fallback apenas se a fixa for removida
            apiKey = prompt("Para processar sem servidor, insira sua Google API Key (Gemini):");
            if (apiKey) {
                localStorage.setItem('google_api_key', apiKey);
                // Opcional: Salvar no config runtime se desejar
                if(this.config) this.config.googleApiKey = apiKey; 
            } else {
                alert("API Key necessária para processamento. Usando dados mockados.");
                return this.mockExtractData(file);
            }
        }

        try {
            // 2. Converter Arquivo para Base64
            const base64Data = await this.fileToBase64(file);
            const mimeType = file.type;

            // 3. Chamar Gemini
            return await this.callGeminiFlash(apiKey, base64Data, mimeType);

        } catch (error) {
            console.error("Erro no Gemini Local:", error);
            alert("Erro ao processar com IA: " + error.message + ". Usando dados de teste.");
            return this.mockExtractData(file);
        }
    }

    /**
     * Helper to read file as Base64 for Gemini API (supports PDF/Image)
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
                if ((encoded.length % 4) > 0) {
                    encoded += '='.repeat(4 - (encoded.length % 4));
                }
                resolve(encoded);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Calls Google Gemini Flash 2.0 API directly from browser
     */
    async callGeminiFlash(apiKey, base64Data, mimeType) {
        // Dynamic import if not available on window (though index.html should provide it)
        const genAI = new window.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });

        const prompt = `
        Analise esta nota fiscal (imagem ou documento). Extraia os dados cruciais em JSON estrito.
        Não use markdown. Responda apenas o JSON.
        Campos: numeroNota (string), cnpj (formatado), fornecedor (string), valor (number float ex: 150.50), dataEmissao (YYYY-MM-DD), dataVencimento (YYYY-MM-DD).
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);
        
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text);
        
        return this.parseGeminiJson(text);
    }
    
    parseGeminiJson(text) {
        try {
            // Remove markdown code blocks if present
            let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanText);
            
            // Post-processing to match app structure
            return {
                id: Date.now().toString(),
                numeroNota: data.numeroNota || "",
                cnpj: data.cnpj || "",
                fornecedor: data.fornecedor || "",
                valor: data.valor || 0,
                dataEmissao: data.dataEmissao || new Date().toISOString().split('T')[0],
                dataVencimento: data.dataVencimento || new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
                centroCusto: "1001",
                status: "pendente",
                paymentMethod: "Boleto Bancário"
            };
        } catch (e) {
            console.error("Failed to parse Gemini JSON", e);
            throw e;
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
