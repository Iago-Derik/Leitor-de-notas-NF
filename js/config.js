// js/config.js

// This object now serves as the TEMPLATE and RUNTIME STATE holder.
// When a user logs in, their data is loaded INTO this object.
const Config = {
    // Current User Session
    currentUser: null,
    
    // Webhook URL for the current user
    currentWebhook: null,

    // 1️⃣ Formas de pagamento dinâmicas (Global)
    paymentMethods: [
        "Boleto Bancário",
        "Cartão de Crédito",
        "PIX",
        "Transferência Bancária",
        "Dinheiro"
    ],

    // 2️⃣ Campos configuráveis (Template Padrão)
    // The active state/editable state will be overwritten by user preferences
    fieldConfig: {
        numeroNota: {
            id: "numeroNota",
            label: "Número da Nota",
            type: "text",
            required: true,
            editable: false,
            active: true
        },
        cnpj: {
            id: "cnpj",
            label: "CNPJ do Fornecedor",
            type: "text",
            required: true,
            editable: true,
            active: true
        },
        fornecedor: {
            id: "fornecedor",
            label: "Nome do Fornecedor",
            type: "text",
            required: true,
            editable: true,
            active: true
        },
        valor: {
            id: "valor",
            label: "Valor Total (R$)",
            type: "text", // Changed to text for currency masking
            required: true,
            editable: true,
            active: true
        },
        dataEmissao: {
            id: "dataEmissao",
            label: "Data de Emissão",
            type: "date",
            required: true,
            editable: true,
            active: true
        },
        dataVencimento: {
            id: "dataVencimento",
            label: "Data de Vencimento",
            type: "date",
            required: true,
            editable: true,
            active: true
        },
        centroCusto: {
            id: "centroCusto",
            label: "Centro de Custo",
            type: "select", // Special type handling
            required: true,
            editable: true,
            active: true
        },
        paymentMethod: {
            id: "paymentMethod",
            label: "Forma de Pagamento",
            type: "select",
            required: true,
            editable: true,
            active: true
        }
    },

    // 3️⃣ Campos Personalizados (Carregados do Usuário)
    customFields: [],

    // 4️⃣ Centros de Custo (Carregados do Usuário)
    costCenters: [
        { codigo: 1001, descricao: "Administrativo" },
        { codigo: 2002, descricao: "Financeiro" }
    ],

    // 5️⃣ Status da Nota (Global)
    invoiceStatus: [
        { id: "pendente", label: "Pendente", color: "warning" },
        { id: "aprovada", label: "Aprovada", color: "success" },
        { id: "paga", label: "Paga", color: "info" }
    ],

    // 6️⃣ Notas Salvas (Carregadas do Usuário)
    savedInvoices: [],

    // API Configuration
    api: {
        // Lógica simples para alternar entre local e produção
        baseUrl: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? 'http://127.0.0.1:5001' 
            : 'https://SEU-BACKEND-NO-RENDER.onrender.com', // ⚠️ Substitua pela URL real após o deploy
        endpoints: {
            upload: '/api/ler-nota'
        }
    }
};

// Export for usage in other modules
if (typeof window !== 'undefined') {
    window.AppConfig = Config;
}
