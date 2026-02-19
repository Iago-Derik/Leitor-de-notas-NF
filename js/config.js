// js/config.js

const Config = {
    // 0️⃣ Configuração de Usuários
    users: {
        "admin@empresa.com": "https://prod-00.brazilsouth.logic.azure.com:443/workflows/sample-admin",
        "financeiro@empresa.com": "https://prod-00.brazilsouth.logic.azure.com:443/workflows/sample-financeiro",
        "iago@empresa.com": "https://prod-00.brazilsouth.logic.azure.com:443/workflows/sample-iago"
    },
    currentUser: "admin@empresa.com",

    // 1️⃣ Formas de pagamento dinâmicas
    paymentMethods: [
        "Boleto Bancário",
        "Cartão de Crédito",
        "PIX",
        "Transferência Bancária",
        "Dinheiro"
    ],

    // 2️⃣ Campos configuráveis (Campos Padrão)
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
        }
    },

    // 3️⃣ Campos Personalizados (Adicionados pelo usuário)
    customFields: [],

    // 4️⃣ Centros de Custo (Numérico e Dinâmico)
    costCenters: [
        { codigo: 1001, descricao: "Administrativo" },
        { codigo: 2002, descricao: "Financeiro" },
        { codigo: 3003, descricao: "Operacional" },
        { codigo: 4004, descricao: "Marketing" }
    ],

    // 5️⃣ Status da Nota
    invoiceStatus: [
        { id: "pendente", label: "Pendente", color: "warning" },
        { id: "aprovada", label: "Aprovada", color: "success" },
        { id: "paga", label: "Paga", color: "info" }
    ],

    // 6️⃣ Notas Salvas (Armazenamento em memória)
    savedInvoices: [],

    // API Configuration
    api: {
        baseUrl: 'http://127.0.0.1:5001',
        endpoints: {
            upload: '/api/ler-nota'
        }
    }
};

// Export for usage in other modules
if (typeof window !== 'undefined') {
    window.AppConfig = Config;
}
