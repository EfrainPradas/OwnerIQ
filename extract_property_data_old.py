import re
import json
import sys

def extract_data(text):
    # Define regex patterns for each field
    patterns = {
        "owner_name": r"OWNER NAME\s*(.*)",
        "owner_principal_address": r"OWNER PRINCIPAL ADDRESS\s*(.*)",
        "owner_phone_number": r"OWNER PHONE NUMBER\s*(.*)",
        "owner_email_address": r"OWNER EMAIL ADDRESS\s*(.*)",
        "company_name": r"COMPANY NAME\s*(.*)",
        "company_address": r"COMPANY ADDRESS\s*(.*)",
        "company_phone_number": r"COMPANY PHONE NUMBER\s*(.*)",
        "company_email_address": r"COMPANY EMAIL ADDRESS\s*(.*)",
        "property_address": r"PROPERTY ADDRESS\s*(.*)",
        "city": r"CITY\s*(.*)",
        "state": r"STATE\s*(.*)",
        "zip_code": r"ZIP CODE\s*(.*)",
        "property_address_legal_description": r"PROPERTY ADDRESS LEGAL DESCRIPTION\s*(.*)",
        "property_type": r"PROPERTY TYPE\s*(.*)",
        "property_sqf": r"PROPERTY SQF\s*(.*)",
        "construction_year": r"CONSTRUCTION YEAR\s*(.*)",
        "property_owner": r"PROPERTY OWNER\s*(.*)",
        "property_type_2": r"PROPERTY TYPE 2\s*(.*)",
        "title_company": r"TITLE COMPANY\s*(.*)",
        "title_company_contact": r"TITLE COMPANY CONTACT\s*(.*)",
        "title_company_phone_number": r"TITLE COMPANY PHONE NUMBER\s*(.*)",
        "title_company_email_address": r"TITLE COMPANY EMAIL ADDRESS\s*(.*)",
        "purchase_price": r"PURCHASE PRICE / REFINANCE PRICE\s*(.*)",
        "purchase_closing_date": r"PURCHASE/REFINANCE CLOSING DATE\s*(.*)",
        "lender_mortgage_name": r"LENDER MORTGAGE NAME\s*(.*)",
        "lender_mortgage_address": r"LENDER MORTGAGE ADDRESS\s*(.*)",
        "lender_mortgage_phone": r"LENDER MORTGAGE PHONE\s*(.*)",
        "lender_mortgage_web_page": r"LENDER MORTGAGE WEB PAGE\s*(.*)",
        "mortgage_servicing_company": r"MORTGAGE SERVICING COMPANY\s*(.*)",
        "mortgage_servicing_company_address": r"MORTGAGE SERVICING COMPANY ADDRESS\s*(.*)",
        "mortgage_servicing_company_phone_number": r"MORTGAGE SERVICING COMPANY PHONE NUMBER\s*(.*)",
        "lender_web_page": r"LENDER WEB PAGE\s*(.*)",
        "loan_number": r"LOAN NUMBER\s*(.*)",
        "loan_amount": r"LOAN AMOUNT\s*(.*)",
        "interest_rate": r"INTEREST RATE\s*(.*)",
        "term_years": r"TERM -YEARS\s*(.*)",
        "monthly_payment_principal_interest": r"MONHLY PAYMENT PRICIPAL \+ INTEREST\s*(.*)",
        "escrow_property_tax": r"ESCROW - PROPERTY TAX\s*(.*)",
        "escrow_home_owner_insurance": r"ESCROW - HOME OWNER INSURANCE\s*(.*)",
        "total_monthly_payment_piti": r"TOTAL MONTLY PAYMENT P.I.T.I\s*(.*)",
        "home_owner_insurance_initial_escrow": r"HOME OWNER INSURANCE INITIAL ESCROW\s*(.*)",
        "property_taxes_initial_escrow": r"PROPERTY TAXES INITIAL ESCROW\s*(.*)",
        "first_payment_date": r"FIRST PAYMENT DATE\s*(.*)",
        "pre_payment_penalty": r"PRE-PAYMENT PENALTY\s*(.*)",
        "pre_payment_penalty_year_1": r"YEAR 1\s*(.*)",
        "pre_payment_penalty_year_2": r"YEAR 2\s*(.*)",
        "pre_payment_penalty_year_3": r"YEAR 3\s*(.*)",
        "pre_payment_penalty_year_4": r"YEAR 4\s*(.*)",
        "pre_payment_penalty_year_5": r"YEAR 5\s*(.*)",
        "property_tax_county": r"PROPERTY TAX COUNTY\s*(.*)",
        "tax_authority": r"TAX AUTHORITY\s*(.*)",
        "tax_authority_web_page": r"TAX AUTHORITY WEB PAGE\s*(.*)",
        "account_number": r"ACCOUNT NUMBER\s*(.*)",
        "assesed_value": r"ASSESED VALUE\s*(.*)",
        "taxes_paid_last_year": r"TAXES PAID LAST YEAR\s*(.*)",
        "property_tax_percent": r"PROPERTY TAX %\s*(.*)",
        "home_owner_insurance_initial_premium": r"HOME OWNER INSURANCE INITIAL PREMIUM\s*(.*)",
        "insurance_company": r"INSURANCE COMPANY\s*(.*)",
        "insurance_agent_name": r"INUSRARANCE AGENT NAME\s*(.*)",
        "insurance_agent_contact": r"INSURANCE AGENT CONTACT\s*(.*)",
        "insurance_agent_phone_number": r"INSURANCE AGENT PHONE NUMBER\s*(.*)",
        "insurance_agent_email_address": r"INSURANCE AGENT EMAIL ADDRESS\s*(.*)",
        "hoi_effective_date": r"H.O.I EFFECTIVE DATE\s*(.*)",
        "hoi_expiration_date": r"H.O.I EXPIRATION DATE\s*(.*)",
        "policy_number": r"POLICY NUMBER\s*(.*)",
        "coverage_a_dwelling": r"COVERGAE A - DWELLING\s*(.*)",
        "coverage_b_other_structures": r"COVERAGE B - OTHER STRUCTURES\s*(.*)",
        "coverage_c_personal_property": r"COVERAGE C - PERSONAL PROPERTY\s*(.*)",
        "coverage_d_fair_rental_value": r"COVERAGE D - FAIR RENTAL VALUE\s*(.*)",
        "coverage_e_additional_living_expenses": r"COVERAGE E - ADDITIONAL LIVING EXPENSES\s*(.*)",
        "initial_lease_tenant_name": r"INITIAL LEASE - TENANT NAME\s*(.*)",
        "lease_effective_date": r"LEASE EFFCETIVE DATE\s*(.*)",
        "lease_termination_date": r"LEASE TERMINATION DATE\s*(.*)",
        "gross_monthly_income_rent": r"GROSS MONTHLY INCOME \(RENT\)\s*(.*)",
        "property_management_percent": r"PROPERTY MANAGEMENT %\s*(.*)",
        "property_management_amount": r"PROPERTY MANAGEMENT AMOUNT\s*(.*)",
        "net_monthly_income": r"NET MONTHLY INCOME\s*(.*)",
    }

    # Extract raw data
    raw_data = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_data[key] = match.group(1).strip()

    # Transform to structured JSON format
    structured_data = {
        "owner": {
            "individuals": [],
            "principal_address": raw_data.get("owner_principal_address", "")
        },
        "company": {
            "name": raw_data.get("company_name", ""),
            "address": raw_data.get("company_address", ""),
            "phone": raw_data.get("company_phone_number", ""),
            "email": raw_data.get("company_email_address", "")
        },
        "property": {
            "address": raw_data.get("property_address", ""),
            "city": raw_data.get("city", ""),
            "state": raw_data.get("state", ""),
            "zip": raw_data.get("zip_code", ""),
            "legal_description": raw_data.get("property_address_legal_description", ""),
            "type": raw_data.get("property_type", ""),
            "sqft": parse_float(raw_data.get("property_sqf", "")),
            "year_built": parse_int(raw_data.get("construction_year", "")),
            "use_type": raw_data.get("property_type_2", ""),
            "owner_of_record": raw_data.get("property_owner", "")
        },
        "title_company": {
            "name": raw_data.get("title_company", ""),
            "contact": raw_data.get("title_company_contact", ""),
            "phone": raw_data.get("title_company_phone_number", ""),
            "email": raw_data.get("title_company_email_address", "")
        },
        "purchase_or_refi": {
            "kind": "refinance" if "refinance" in text.lower() else "purchase",
            "price_or_amount": parse_float(raw_data.get("purchase_price", "")),
            "closing_date": raw_data.get("purchase_closing_date", "")
        },
        "loan": {
            "lender": {
                "name": raw_data.get("lender_mortgage_name", ""),
                "address": raw_data.get("lender_mortgage_address", ""),
                "phone": raw_data.get("lender_mortgage_phone", ""),
                "website": raw_data.get("lender_mortgage_web_page", "")
            },
            "servicer": {
                "name": raw_data.get("mortgage_servicing_company", ""),
                "address": raw_data.get("mortgage_servicing_company_address", ""),
                "phone": raw_data.get("mortgage_servicing_company_phone_number", ""),
                "website": raw_data.get("lender_web_page", "")
            },
            "loan_number": raw_data.get("loan_number", ""),
            "principal": parse_float(raw_data.get("loan_amount", "")),
            "interest_rate_apy": parse_float(raw_data.get("interest_rate", "")),
            "term_years": parse_int(raw_data.get("term_years", "")),
            "first_payment_date": raw_data.get("first_payment_date", ""),
            "monthly_pi": parse_float(raw_data.get("monthly_payment_principal_interest", "")),
            "escrow_property_tax": parse_float(raw_data.get("escrow_property_tax", "")),
            "escrow_insurance": parse_float(raw_data.get("escrow_home_owner_insurance", "")),
            "monthly_piti": parse_float(raw_data.get("total_monthly_payment_piti", "")),
            "prepayment_penalty": raw_data.get("pre_payment_penalty", "").lower() == "yes" if raw_data.get("pre_payment_penalty") else False,
            "prepay_steps": extract_prepay_steps(raw_data)
        },
        "taxes": {
            "county": raw_data.get("property_tax_county", ""),
            "authority": raw_data.get("tax_authority", ""),
            "website": raw_data.get("tax_authority_web_page", ""),
            "account_number": raw_data.get("account_number", ""),
            "assessed_value": parse_float(raw_data.get("assesed_value", "")),
            "last_year_taxes": parse_float(raw_data.get("taxes_paid_last_year", "")),
            "tax_rate_pct": parse_float(raw_data.get("property_tax_percent", "")),
            "initial_escrow": parse_float(raw_data.get("property_taxes_initial_escrow", ""))
        },
        "insurance": {
            "carrier": raw_data.get("insurance_company", ""),
            "agent_company": raw_data.get("insurance_agent_name", ""),
            "agent_contacts": raw_data.get("insurance_agent_contact", ""),
            "agent_phone": raw_data.get("insurance_agent_phone_number", ""),
            "agent_email": raw_data.get("insurance_agent_email_address", ""),
            "effective_date": raw_data.get("hoi_effective_date", ""),
            "expiration_date": raw_data.get("hoi_expiration_date", ""),
            "policy_number": raw_data.get("policy_number", ""),
            "premiums": {
                "initial": parse_float(raw_data.get("home_owner_insurance_initial_premium", "")),
                "initial_escrow": parse_float(raw_data.get("home_owner_insurance_initial_escrow", ""))
            },
            "coverages": {
                "dwelling": parse_float(raw_data.get("coverage_a_dwelling", "")),
                "other_structures": parse_float(raw_data.get("coverage_b_other_structures", "")),
                "personal_property": parse_float(raw_data.get("coverage_c_personal_property", "")),
                "fair_rental_value": parse_float(raw_data.get("coverage_d_fair_rental_value", "")),
                "additional_living_expenses": parse_float(raw_data.get("coverage_e_additional_living_expenses", ""))
            }
        },
        "lease": {
            "tenant_name": raw_data.get("initial_lease_tenant_name", ""),
            "start_date": raw_data.get("lease_effective_date", ""),
            "end_date": raw_data.get("lease_termination_date", ""),
            "monthly_rent": parse_float(raw_data.get("gross_monthly_income_rent", "")),
            "pm_fee_pct": parse_float(raw_data.get("property_management_percent", ""))
        }
    }

    # Handle owner individuals - split by common separators
    owner_name = raw_data.get("owner_name", "")
    if owner_name:
        # Split by common separators like "and", "&", ","
        individuals = re.split(r'\s+(?:and|&)\s+|,\s*', owner_name)
        for name in individuals:
            name = name.strip()
            if name:
                structured_data["owner"]["individuals"].append({
                    "full_name": name,
                    "email": raw_data.get("owner_email_address", ""),
                    "phone": raw_data.get("owner_phone_number", "")
                })

    return structured_data

def parse_float(value):
    """Safely parse float values, removing currency symbols and commas"""
    if not value:
        return None
    try:
        # Remove currency symbols, commas, and extra spaces
        cleaned = re.sub(r'[$,\s]', '', str(value))
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None

def parse_int(value):
    """Safely parse integer values"""
    if not value:
        return None
    try:
        return int(float(value)) if value else None
    except (ValueError, TypeError):
        return None

def extract_prepay_steps(raw_data):
    """Extract prepayment penalty steps"""
    steps = []
    for year in range(1, 6):
        key = f"pre_payment_penalty_year_{year}"
        pct = raw_data.get(key, "")
        if pct:
            pct_value = parse_float(pct)
            if pct_value is not None:
                steps.append({"year": year, "pct": pct_value})
    return steps if steps else None

if __name__ == "__main__":
    # Read text from stdin
    pdf_text = sys.stdin.read()
    extracted_data = extract_data(pdf_text)
    print(json.dumps(extracted_data, indent=4))
