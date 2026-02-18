// js/config.js

const Config = {
    // 1️⃣ Formas de pagamento dinâmicas
    paymentMethods: [
        "Boleto Bancário",
        "Cartão de Crédito",
        "PIX",
        "Transferência Bancária",
        "Dinheiro"
    ],

    // 2️⃣ Campos configuráveis
    fieldConfig: {
        numeroNota: {
            label: "Número da Nota",
            type: "text",
            required: true,
            editable: false // Typically read-only after extraction
        },
        cnpj: {
            label: "CNPJ do Fornecedor",
            type: "text",
            required: true,
            editable: true
        },
        fornecedor: {
            label: "Nome do Fornecedor",
            type: "text",
            required: true,
            editable: true
        },
        valor: {
            label: "Valor Total (R$)",
            type: "number",
            step: "0.01",
            required: true,
            editable: true
        },
        dataEmissao: {
            label: "Data de Emissão",
            type: "date",
            required: true,
            editable: true
        },
        dataVencimento: {
            label: "Data de Vencimento",
            type: "date",
            required: true, // Often calculated or extracted
            editable: true
        }
    },

    // API Configuration
    api: {
        baseUrl: 'http://localhost:5001/api',
        endpoints: {
            upload: '/ler-nota'
        }
    }
};

// Export for usage in other modules (simulated module system via global scope or ES6 modules if supported)
// In a pure JS environment without bundlers, we attach to window or use ES6 modules directly if script type="module".
// For simplicity and compatibility as per "pure JS" request, I'll attach to window if not in a module environment.
if (typeof window !== 'undefined') {
    window.AppConfig = Config;
}
