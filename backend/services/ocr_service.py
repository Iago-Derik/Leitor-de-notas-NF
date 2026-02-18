try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

from google import genai
import re
import os
import json
import httpx 

def extract_text_pdf(pdf_path):
    """
    Extracts text from PDF and uses Google Gemini (New SDK) to parse invoice data.
    """
    # 1. Extract raw text
    full_text = ""
    try:
        if not PyPDF2:
             raise ImportError("PyPDF2 não instalado")

        with open(pdf_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception as e:
        print(f"Erro na extração de texto bruto: {e}")
        return {}

    # 2. Use Google Gemini to understand the invoice
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
             raise ValueError("API Key do Google não encontrada no arquivo .env (GOOGLE_API_KEY)")
             
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Você é um assistente especializado em contabilidade. Analise o texto desta Nota Fiscal e extraia os seguintes dados em formato JSON.
        
        Texto da Nota:
        {full_text[:5000]}  # Increase limit slightly

        Retorne APENAS um JSON válido com esta estrutura exata. Não use Markdown (```json).:
        {{
            "numeroNota": "string (apenas números)",
            "cnpj": "string (XX.XXX.XXX/YYYY-ZZ)",
            "fornecedor": "string (Nome da Razão Social)",
            "valor": 0.00 (float, use ponto para decimais),
            "dataEmissao": "YYYY-MM-DD",
            "dataVencimento": "YYYY-MM-DD"
        }}
        """

        # Usando o modelo gemini-1.5-flash que é o padrão atual gratuito
        # Se este falhar, pode tentar 'gemini-1.5-pro'
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite', 
            contents=prompt
        )
        
        if not response.text:
            raise ValueError("Resposta da IA vazia")

        content = response.text.strip()
        
        # Clean potential markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        data = json.loads(content)
        return data

    except Exception as e:
        print(f"Erro na IA (Google Gemini): {e}")
        print("Tentando fallback para regex básico...")
        return parse_invoice_text(full_text)

def parse_invoice_text(text):
    """
    Helper function to extract structured data from raw OCR text.
    """
    data = {}
    
    # CNPJ (xx.xxx.xxx/xxxx-xx)
    # Matches standard CNPJ format
    cnpj_match = re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', text)
    if cnpj_match:
        data['cnpj'] = cnpj_match.group(0)
        
    # Valor Total
    # Look for "Valor Total", "Total da Nota", etc followed by currency format
    # Example: 1.500,00
    valor_match = re.search(r'(?:Valor Total|Total da Nota|Vlr\. Total).*?R\$\s*([\d\.,]+)', text, re.IGNORECASE | re.DOTALL)
    if valor_match:
        val_str = valor_match.group(1).strip()
        # Convert 1.234,56 to 1234.56
        try:
            val_clean = val_str.replace('.', '').replace(',', '.')
            data['valor'] = float(val_clean)
        except ValueError:
            pass # Failed to parse number
            
    # Data Emissao (dd/mm/yyyy)
    # Look for "Data de Emissão", "Dt. Emissão"
    data_emi_match = re.search(r'(?:Data|Dt\.?)\s*(?:de)?\s*Emiss[ãa]o.*?(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
    if data_emi_match:
        d_str = data_emi_match.group(1)
        try:
            d, m, y = d_str.split('/')
            data['dataEmissao'] = f"{y}-{m}-{d}"
        except:
            pass
    
    # Numero Nota
    # Look for "Nota Fiscal", "NF-e", "Nº" followed by digits, potentially with dots
    nota_match = re.search(r'(?:Nota Fiscal|NF-e|N[ºo])\.?\s*([0-9\.]+)', text, re.IGNORECASE)
    if nota_match:
        # Remove dots to get pure number
        raw_num = nota_match.group(1).replace('.', '')
        # Remove leading zeros? Maybe not, keep as is for now or just return what's found.
        # Often NFe number is just the significant digits, but sometimes full series.
        # Let's strip leading zeros to be cleaner.
        data['numeroNota'] = raw_num.lstrip('0') or raw_num
    # Hard to extract accurately without layout knowledge or Named Entity Recognition (NER).
    # Might fallback to manual entry or look for specific keywords near the top.
    
    return data
