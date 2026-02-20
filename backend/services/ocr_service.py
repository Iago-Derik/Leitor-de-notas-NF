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
        
        # Using Gemma 2 (9B parameters) via Google AI Studio API
        # Model ID: "gemini-2.0-flash" (or "gemma-2-9b-it" if explicitly available in your region)
        # Note: As of now, Google AI Studio exposes Gemini models primarily. 
        # However, if Gemma is available to your API key, you can try "gemma-2-9b-it".
        # If that fails, we can fallback to "gemini-2.0-flash" which is very high limit.
        # Let's try to set it to a model name that represents the user intent or a very cost-effective one.
        
        # User requested Gemma. In Google AI Studio, Gemma models are often accessed as "gemma-2-9b-it" 
        # or similar. If this specific string fails, we might need to revert to "gemini-1.5-flash" 
        # which has a massive free tier.
        
        # Usando o modelo Gemini Flash que é mais estável para JSON
        model_id = "gemini-2.0-flash" 

        prompt = f"""
        Você é um assistente especializado em contabilidade. Analise o texto desta Nota Fiscal e extraia os seguintes dados em formato JSON.
        
        Texto da Nota:
        {full_text[:8000]}

        Retorne APENAS um JSON válido com esta estrutura exata. Não use Markdown (```json). Não inclua nenhuma explicação.
        {{
            "numeroNota": "string (apenas números)",
            "cnpj": "string (XX.XXX.XXX/YYYY-ZZ)",
            "fornecedor": "string (Nome da Razão Social)",
            "valor": 0.00 (float, use ponto para decimais),
            "dataEmissao": "YYYY-MM-DD",
            "dataVencimento": "YYYY-MM-DD"
        }}
        """

        response = client.models.generate_content(
            model=model_id,
            contents=prompt
        )
        
        if not response.text:
            raise ValueError("Resposta da IA vazia")

        content = response.text.strip()
        
        # Limpeza robusta para encontrar o JSON dentro da resposta
        # Remove blocos de código markdown se existirem
        if "```" in content:
            # Pega tudo que estiver entre o primeiro ``` (e opcional "json") e o último ```
            patterns = [r"```json\s*(.*?)\s*```", r"```\s*(.*?)\s*```"]
            for pattern in patterns:
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    content = match.group(1)
                    break
        
        # Tenta sanitizar o JSON (caso tenha sobrado algo)
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: Tenta encontrar o primeiro "{" e o último "}"
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = content[start:end]
                data = json.loads(json_str)
            else:
                raise ValueError(f"Não foi possível encontrar JSON válido na resposta: {content[:100]}...")

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
