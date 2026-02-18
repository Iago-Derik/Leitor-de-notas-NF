# Sistema Inteligente de Notas Fiscais

Sistema para upload e processamento automático de Notas Fiscais Eletrônicas (NFe) em formato PDF (via OCR) e XML.

## Funcionalidades

- **Upload Dinâmico**: Interface moderna para envio de arquivos.
- **Processamento Automático**: Extração de dados (Número, CNPJ, Valor, Datas) de PDF e XML.
- **Campos Configuráveis**: Validação e renderização dinâmica baseada em configuração JS.
- **Formas de Pagamento Dinâmicas**: Lista populada via JS.
- **Backend Python**: API Flask para processamento de arquivos.

## Requisitos do Sistema

- Python 3.8+
- Tesseract OCR (`sudo apt install tesseract-ocr`)
- Poppler Utils (`sudo apt install poppler-utils`) - necessário para converter PDF em imagens.

## Instalação Backend

1. Crie um ambiente virtual:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Instale as dependências:
   ```bash
   pip install -r backend/requirements.txt
   ```

## Execução

1. Inicie o servidor backend:
   ```bash
   python3 backend/app.py
   ```
   O servidor rodará em `http://localhost:5000`.

2. Abra o arquivo `index.html` no navegador.
   - Para integração real, configure o frontend para apontar para o backend em `js/config.js`.

## Estrutura do Projeto

- `index.html`: Página principal.
- `css/`: Estilos.
- `js/`: Lógica do Frontend (Config, Services, DOM, Validation).
- `backend/`: Código do servidor Flask e serviços de processamento.
  - `services/ocr_service.py`: Extração de texto de PDF.
  - `services/xml_service.py`: Parser de XML NFe.
