#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parser optimizado de PDFs de cierre de propiedades
Usa lambdas, comprehensions y técnicas modernas de Python
"""

import re
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any

# Lambdas para limpieza de texto
clean_whitespace = lambda text: re.sub(r'\s+', ' ', text).strip()
remove_line_breaks = lambda text: re.sub(r'-\s*\n\s*', '', text)
normalize_text = lambda text: clean_whitespace(remove_line_breaks(text))

# Lambda para parsear moneda
parse_currency = lambda val: (
    float(re.sub(r'[^\d.]', '', val.replace(',', '')))
    if val and isinstance(val, str) and re.search(r'\d', val)
    else None
)

# Lambda para parsear porcentaje
parse_percentage = lambda val: parse_currency(val.replace('%', '')) if val else None

# Lambda para parsear enteros
parse_int = lambda val: int(float(val)) if val and str(val).replace('.', '').isdigit() else None

def extract_with_context(text: str, pattern: str, group: int = 1) -> Optional[str]:
    """Extrae usando regex con contexto"""
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
    return clean_whitespace(match.group(group)) if match else None

def parse_address_components(address_str: str) -> Dict[str, Optional[str]]:
    """Parsea dirección completa en componentes usando lambdas"""
    if not address_str:
        return {'address': None, 'city': None, 'state': None, 'zip': None}
    
    # Patrón: "123 Main St, City, ST 12345" o "123 Main St, City, ST"
    pattern = r'^(.+?),\s*([^,]+),\s*([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?'
    match = re.search(pattern, address_str.strip())
    
    if match:
        return {
            'address': match.group(1).strip(),
            'city': match.group(2).strip(),
            'state': match.group(3).strip(),
            'zip': match.group(4).strip() if match.group(4) else None
        }
    
    # Si no coincide, intentar extraer solo dirección
    return {
        'address': address_str.strip(),
        'city': None,
        'state': None,
        'zip': None
    }

def extract_data(text: str) -> Dict[str, Any]:
    """
    Extrae datos del PDF usando técnicas modernas de Python
    """
    # Normalizar texto
    text = normalize_text(text)
    
    # Patrones de extracción usando dict comprehension
    patterns = {
        'loan_number': r'Loan\s+No\.?\s*[:\-]?\s*(\d+)',
        'loan_amount': r'Loan\s+Amount\s+of\s+\$?([\d,]+\.?\d*)',
        'lender_name': r'from\s+([^(]+?)\s*\((?:â€œ)?Lender',
        'borrower_name': r'to\s+([^(]+?)\s*\((?:â€œ)?Borrower',
        'property_address': r'Property\s+(?:Address|Location)\s*[:\-]?\s*([^\n]+?)(?=\n|$)',
        'property_type': r'Property\s+Type\s*[:\-]?\s*([^\n]+)',
        'purchase_price': r'Purchase\s+Price\s*[:\-]?\s*\$?([\d,]+\.?\d*)',
        'closing_date': r'Closing\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        'interest_rate': r'Interest\s+Rate\s*[:\-]?\s*([\d.]+)\s*%?',
        'term_years': r'Term\s*[:\-]?\s*(\d+)\s*(?:years?|yrs?)',
        'monthly_payment': r'Monthly\s+Payment\s*[:\-]?\s*\$?([\d,]+\.?\d*)',
        'property_tax': r'Property\s+Tax(?:es)?\s*[:\-]?\s*\$?([\d,]+\.?\d*)',
        'insurance': r'Insurance\s*[:\-]?\s*\$?([\d,]+\.?\d*)',
        'monthly_rent': r'(?:Monthly\s+)?Rent\s*[:\-]?\s*\$?([\d,]+\.?\d*)',
    }
    
    # Extraer todos los campos usando dict comprehension
    extracted = {
        key: extract_with_context(text, pattern)
        for key, pattern in patterns.items()
    }
    
    # Parsear dirección en componentes
    addr_components = parse_address_components(extracted.get('property_address', ''))
    
    # Construir JSON estructurado usando dict comprehension y lambdas
    return {
        "loan": {
            "number": extracted.get('loan_number'),
            "amount": parse_currency(extracted.get('loan_amount')),
            "interest_rate": parse_percentage(extracted.get('interest_rate')),
            "term_years": parse_int(extracted.get('term_years')),
            "monthly_payment": parse_currency(extracted.get('monthly_payment')),
        },
        "lender": {
            "name": extracted.get('lender_name'),
        },
        "borrower": {
            "name": extracted.get('borrower_name'),
        },
        "property": {
            "full_address": extracted.get('property_address'),
            "address": addr_components['address'],
            "city": addr_components['city'],
            "state": addr_components['state'],
            "zip": addr_components['zip'],
            "type": extracted.get('property_type'),
        },
        "financial": {
            "purchase_price": parse_currency(extracted.get('purchase_price')),
            "closing_date": extracted.get('closing_date'),
        },
        "taxes": {
            "annual_amount": parse_currency(extracted.get('property_tax')),
        },
        "insurance": {
            "annual_premium": parse_currency(extracted.get('insurance')),
        },
        "lease": {
            "monthly_rent": parse_currency(extracted.get('monthly_rent')),
        },
        "_debug": {
            "text_length": len(text),
            "text_sample": text[:500] + "..." if len(text) > 500 else text,
            "extracted_fields": {k: v for k, v in extracted.items() if v}
        }
    }

if __name__ == "__main__":
    # Configurar stdout con manejo de errores
    sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None
    
    # Leer y limpiar texto
    pdf_text = sys.stdin.read()
    pdf_text = pdf_text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    
    # Extraer datos
    result = extract_data(pdf_text)
    
    # Imprimir JSON
    print(json.dumps(result, ensure_ascii=True, indent=2))