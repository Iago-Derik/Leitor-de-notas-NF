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

        // Combine standard and custom fields
        const allFields = { ...this.config.fieldConfig };
        this.config.customFields.forEach(field => {
            allFields[field.id] = field;
        });

        // Iterate through configured fields
        for (const [key, field] of Object.entries(allFields)) {
            // Skip inactive fields
            if (!field.active) continue;

            if (field.required && !data[key]) {
                errors.push(`${field.label} é obrigatório.`);
            }

            // Basic type validation
            if (data[key] && field.type === 'number') {
                // If using comma as decimal separator, replace it before checking
                const val = data[key].replace(',', '.');
                if (isNaN(parseFloat(val))) {
                    errors.push(`${field.label} deve ser um número válido.`);
                }
            }
        }

        // Validate payment method
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
