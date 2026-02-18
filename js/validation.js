// js/validation.js

class Validator {
    constructor(config) {
        this.config = config;
    }

    /**
     * 2️⃣ Campos configuráveis
     * Validates the form data based on the configuration object.
     * @param {Object} data - The form data object.
     * @returns {Object} - Object with isValid (boolean) and errors (array of strings).
     */
    validate(data) {
        const errors = [];
        const config = this.config.fieldConfig;

        // Iterate through configured fields
        for (const [key, field] of Object.entries(config)) {
            if (field.required && !data[key]) {
                errors.push(`${field.label} é obrigatório.`);
            }

            // Basic type validation
            if (data[key] && field.type === 'number') {
                if (isNaN(parseFloat(data[key]))) {
                    errors.push(`${field.label} deve ser um número válido.`);
                }
            }
        }

        // Validate payment method (assuming it's a select field outside of fieldConfig for now)
        if (!data.paymentMethod) {
            errors.push('Forma de Pagamento é obrigatória.');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

if (typeof window !== 'undefined') {
    window.Validator = Validator;
}
