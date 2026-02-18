from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.ocr_service import extract_text_pdf
from services.xml_service import ler_xml_nfe

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (important for file:// or localhost)

# Configure upload folder (optional, or process in memory)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'backend', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/ler-nota', methods=['POST'])
def ler_nota():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nome do arquivo vazio'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        data = {}
        if filename.lower().endswith('.pdf'):
            # OCR Service
            # Since extract_text_pdf returns raw text, we might need to parse it further.
            # For this exercise, let's assume the service returns structured data or we parse it here.
            # But the prompt says "Criar função extrair_texto_pdf(caminho)".
            # So I'll assume the service returns text and maybe we have a parser, or the service returns a dict.
            # I will implement the service to return a dict for simplicity in the integration.
            data = extract_text_pdf(filepath)
        elif filename.lower().endswith('.xml'):
            # XML Service
            data = ler_xml_nfe(filepath)
        else:
            return jsonify({'error': 'Formato não suportado. Use PDF ou XML.'}), 400
            
        return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
