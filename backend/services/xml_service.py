import xml.etree.ElementTree as ET

def ler_xml_nfe(xml_path):
    """
    Parses an NFe XML file and extracts relevant information.
    
    Args:
        xml_path (str): Path to the XML file.
        
    Returns:
        dict: Extracted invoice data.
    """
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # XML namespace handling
        # NFe usually has a namespace like {http://www.portalfiscal.inf.br/nfe}
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Helper to find text with namespace
        def find_text(path):
            # Try with namespace first
            element = root.find(path, ns)
            if element is not None:
                return element.text
            # Fallback: try without namespace (if user removed it or different version)
            # This is tricky with ElementTree. We might need to strip namespaces.
            return None

        # Alternative: Strip namespaces for easier parsing
        for elem in root.iter():
            if '}' in elem.tag:
                elem.tag = elem.tag.split('}', 1)[1]
        
        # Now we can search without namespace prefix
        # Structure: NFe -> infNFe -> ...
        
        # Depending on if it's NFe or nfeProc, the root might differ.
        # Usually nfeProc contains NFe.
        
        inf_nfe = root.find('.//infNFe')
        if inf_nfe is None:
            raise ValueError("Estrutura infNFe não encontrada.")
            
        emit = inf_nfe.find('emit')
        ide = inf_nfe.find('ide')
        total = inf_nfe.find('total')
        
        data = {}
        
        if ide is not None:
            data['numeroNota'] = ide.find('nNF').text if ide.find('nNF') is not None else ''
            dh_emi = ide.find('dhEmi').text if ide.find('dhEmi') is not None else ''
            # Format date: YYYY-MM-DDTHH:MM:SS-OFFSET -> YYYY-MM-DD
            if dh_emi:
                data['dataEmissao'] = dh_emi.split('T')[0]
                
        if emit is not None:
            data['cnpj'] = emit.find('CNPJ').text if emit.find('CNPJ') is not None else ''
            data['fornecedor'] = emit.find('xNome').text if emit.find('xNome') is not None else ''
            
        if total is not None:
            icms_tot = total.find('ICMSTot')
            if icms_tot is not None:
                data['valor'] = icms_tot.find('vNF').text if icms_tot.find('vNF') is not None else ''

        # Data Vencimento (fatura/duplicata)
        cobr = inf_nfe.find('cobr')
        if cobr is not None:
            dup = cobr.find('dup')
            if dup is not None:
                data['dataVencimento'] = dup.find('dVenc').text if dup.find('dVenc') is not None else ''

        return data

    except Exception as e:
        print(f"Erro ao ler XML: {e}")
        return {}
