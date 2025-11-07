# Análisis del Problema de Extracción de PDF

## 🔴 PROBLEMA IDENTIFICADO

Los datos extraídos del PDF **NO llenan el formulario** porque hay un **desajuste entre la estructura de datos** que devuelve el Python y lo que espera el frontend.

---

## 📊 ESTRUCTURA DE DATOS

### Lo que DEVUELVE el Python (`extract_property_data.py`)

```json
{
  "owner": {
    "individuals": [
      {
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone": "555-1234"
      }
    ],
    "principal_address": "123 Main St"
  },
  "company": {
    "name": "ABC Company",
    "address": "456 Business Ave",
    "phone": "555-5678",
    "email": "info@abc.com"
  },
  "property": {
    "address": "789 Property Lane",
    "city": "Orlando",
    "state": "FL",
    "zip": "32801",
    "legal_description": "Lot 5 Block 3",
    "type": "Single Family",
    "sqft": 2500,
    "year_built": 2020,
    "use_type": "Residential",
    "owner_of_record": "John Doe"
  },
  "purchase_or_refi": {
    "kind": "purchase",
    "price_or_amount": 350000,
    "closing_date": "2024-01-15"
  },
  "loan": {
    "lender": {
      "name": "Bank of America",
      "address": "100 Bank St",
      "phone": "555-9999",
      "website": "www.bankofamerica.com"
    },
    "servicer": {
      "name": "Loan Servicer Inc",
      "address": "200 Service Rd",
      "phone": "555-8888",
      "website": "www.servicer.com"
    },
    "loan_number": "LN123456",
    "principal": 280000,
    "interest_rate_apy": 6.5,
    "term_years": 30,
    "first_payment_date": "2024-03-01",
    "monthly_pi": 1770.83,
    "escrow_property_tax": 350,
    "escrow_insurance": 150,
    "monthly_piti": 2270.83,
    "prepayment_penalty": false,
    "prepay_steps": null
  },
  "taxes": {
    "county": "Orange County",
    "authority": "Orange County Tax Collector",
    "website": "www.octaxcol.com",
    "account_number": "TAX123456",
    "assessed_value": 340000,
    "last_year_taxes": 4200,
    "tax_rate_pct": 1.2,
    "initial_escrow": 700
  },
  "insurance": {
    "carrier": "State Farm",
    "agent_company": "ABC Insurance Agency",
    "agent_contacts": "Jane Smith",
    "agent_phone": "555-7777",
    "agent_email": "jane@abcinsurance.com",
    "effective_date": "2024-01-15",
    "expiration_date": "2025-01-15",
    "policy_number": "POL987654",
    "premiums": {
      "initial": 1800,
      "initial_escrow": 300
    },
    "coverages": {
      "dwelling": 350000,
      "other_structures": 35000,
      "personal_property": 175000,
      "fair_rental_value": 10500,
      "additional_living_expenses": 70000
    }
  },
  "lease": {
    "tenant_name": "Bob Johnson",
    "start_date": "2024-02-01",
    "end_date": "2025-01-31",
    "monthly_rent": 2500,
    "pm_fee_pct": 10
  }
}
```

### Lo que BUSCA el Frontend (`PropertiesView.js` líneas 78-91)

```javascript
const mappedForm = {
  ...INITIAL_FORM,
  address: cleanedData.property_address || '',           // ❌ BUSCA: property_address
  city: cleanedData.city || '',                          // ❌ BUSCA: city
  state: cleanedData.state || '',                        // ❌ BUSCA: state
  zipCode: cleanedData.zip_code || '',                   // ❌ BUSCA: zip_code
  propertyType: (cleanedData.property_type || '').toLowerCase().includes('single family') ? 'residential' : 'commercial',
  valuation: getNumericValue(cleanedData.purchase_price) || '',  // ❌ BUSCA: purchase_price
  rent: getNumericValue(cleanedData.gross_monthly_income_rent) || '',  // ❌ BUSCA: gross_monthly_income_rent
  taxes: getNumericValue(cleanedData.taxes_paid_last_year) || '',  // ❌ BUSCA: taxes_paid_last_year
  insurance: getNumericValue(cleanedData.home_owner_insurance_initial_premium) || '',  // ❌ BUSCA: home_owner_insurance_initial_premium
  loanRate: getNumericValue(cleanedData.interest_rate) || '',  // ❌ BUSCA: interest_rate
  loanTerm: getNumericValue(cleanedData.term_years) || '',  // ❌ BUSCA: term_years
};
```

---

## 🔧 MAPEO CORRECTO NECESARIO

| Campo del Formulario | Debe buscar en JSON Python |
|---------------------|----------------------------|
| `address` | `extractedData.property.address` |
| `city` | `extractedData.property.city` |
| `state` | `extractedData.property.state` |
| `zipCode` | `extractedData.property.zip` |
| `propertyType` | `extractedData.property.type` |
| `valuation` | `extractedData.purchase_or_refi.price_or_amount` |
| `rent` | `extractedData.lease.monthly_rent` |
| `taxes` | `extractedData.taxes.last_year_taxes` |
| `insurance` | `extractedData.insurance.premiums.initial` |
| `loanRate` | `extractedData.loan.interest_rate_apy` |
| `loanTerm` | `extractedData.loan.term_years` |
| `ltv` | Calcular: `(loan.principal / purchase_or_refi.price_or_amount) * 100` |

---

## ✅ SOLUCIÓN

Necesitamos actualizar la función `handleDataExtracted` en `PropertiesView.js` (líneas 65-102) para que acceda correctamente a la estructura JSON anidada que devuelve el Python.

### Código Actual (INCORRECTO):
```javascript
address: cleanedData.property_address || '',
```

### Código Correcto (DEBE SER):
```javascript
address: extractedData.property?.address || '',
```

---

## 📝 DATOS ADICIONALES DISPONIBLES

El PDF también extrae información valiosa que NO se está usando:

- **Propietario**: `owner.individuals[0].full_name`, `owner.individuals[0].email`, `owner.individuals[0].phone`
- **Prestamista**: `loan.lender.name`, `loan.lender.phone`, `loan.lender.website`
- **Número de préstamo**: `loan.loan_number`
- **Pago mensual P&I**: `loan.monthly_pi`
- **Pago mensual PITI**: `loan.monthly_piti`
- **Impuestos mensuales en escrow**: `loan.escrow_property_tax`
- **Seguro mensual en escrow**: `loan.escrow_insurance`
- **Inquilino inicial**: `lease.tenant_name`
- **Fechas de arrendamiento**: `lease.start_date`, `lease.end_date`

Estos datos podrían agregarse al formulario o guardarse en campos adicionales.