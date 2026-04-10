# Power Apps Canvas App Source & Dataverse Data Model

This repository includes a representation of the Power Apps Canvas application source based on the modern `pa.yaml` specification using the Power Fx language, tailored for the "Sistema Inteligente de Notas Fiscais" requirement.

## Dataverse Setup Instructions

To deploy this app, ensure the main Dataverse table `Registro de Notas Fiscais` exists with the following structure:

### Table: `Registro de Notas Fiscais`
- **Fornecedor**: Single line of text
- **Nota**: Single line of text
- **Empresa**: Choice or Text
- **STATUS**: Single line of text (or Choice)
- **STATUS AX**: Single line of text (or Choice)
- **STATUS PAGAMENTO**: Single line of text (or Choice)
- **DATA VENCIMENTO NF**: Date Only
- **DATA VENCIMENTO AX**: Date Only
- **Valor**: Currency
- **Email Responsavel NFE**: Single line of text (Email format)
- **Responsável NFE**: Choice (Display only)
- **Fornecedor Crítico?**: Yes/No (Boolean)
- **Requisição**: Single line of text
- **Pré-pedido**: Single line of text
- **Ordem de Compra**: Single line of text
- **Aprovador**: Single line of text (or Lookup)
- **Observações**: Multiple lines of text
- **Link NF**: URL

## Import and Structure (`power-apps-source.pa.yaml`)

The `power-apps-source.pa.yaml` file defines the 5 main screens requested:

1. **DashboardScreen**: Displays summary cards indicating notes assigned to the logged-in user, overdue invoices, critical suppliers, and pending payments.
2. **MinhasNotasScreen**: Shows a data table automatically filtered to `Email Responsavel NFE = User().Email`. Features color coded badges logically mapped via Power Fx.
3. **NotasGeraisScreen**: General list view containing all invoices without user filtering, including dropdown filters for Status and Empresa.
4. **RequisicoesScreen**: Displays requisitions and status.
5. **InvoiceDetailScreen**: A detail view for the selected record. It controls edit behavior via Power Fx (`DisplayMode: =If(varSelectedInvoice.'Email Responsavel NFE' = User().Email, DisplayMode.Edit, DisplayMode.View)`), preventing editing unless the user is the responsible party. Includes a button to launch the `Link NF` URL.

## Deployment Notes
Since creating an empty MSAPP file from CLI without an existing solution template is restricted by Microsoft Power Platform CLI, this source is provided in `pa.yaml` YAML format. To use it, copy the structural logic, controls, and Power Fx formulas defined in `power-apps-source.pa.yaml` into your target Power Apps Studio application.
