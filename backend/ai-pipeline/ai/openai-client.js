/**
 * Cliente OpenAI para el Pipeline de IA
 */

const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

class OpenAIClient {
  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      timeout: config.AI_REQUEST_TIMEOUT,
    });
    
    this.tokensUsed = 0;
  }

  /**
   * Clasificar documento usando GPT
   */
  async classify(text, options = {}) {
    const startTime = Date.now();
    
    try {
      const prompt = this._buildClassificationPrompt(text);
      const model = options.model || config.MODELS.CLASSIFIER;
      
      logger.info('OpenAI classification request', { model, textLength: text.length });
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at classifying real estate and mortgage documents. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      const tokensUsed = response.usage.total_tokens;
      this.tokensUsed += tokensUsed;
      
      const duration = Date.now() - startTime;
      logger.info('OpenAI classification completed', { 
        duration, 
        tokensUsed,
        documentType: result.document_type 
      });
      
      return {
        document_type: result.document_type,
        confidence: result.confidence,
        reasoning: result.reasoning,
        metadata: {
          model,
          tokens_used: tokensUsed,
          duration_ms: duration,
        }
      };
      
    } catch (error) {
      logger.error('OpenAI classification error', { error: error.message });
      throw new Error(`Classification failed: ${error.message}`);
    }
  }

  /**
   * Extraer datos estructurados usando GPT
   */
  async extract(text, documentType, options = {}) {
    const startTime = Date.now();
    
    try {
      const prompt = this._buildExtractionPrompt(text, documentType);
      const model = options.model || config.MODELS.EXTRACTOR;
      
      logger.info('OpenAI extraction request', { 
        model, 
        documentType,
        textLength: text.length 
      });
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured data from ${documentType} documents. Extract all relevant fields with high accuracy. Always respond with valid JSON including confidence scores for each field.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 16000, // Increased from 4000 to handle large documents
      });

      // Log response details for debugging
      const responseContent = response.choices[0].message.content;
      const finishReason = response.choices[0].finish_reason;

      logger.info('OpenAI extraction response received', {
        contentLength: responseContent?.length || 0,
        finishReason,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      });

      // Check if response was truncated
      if (finishReason === 'length') {
        logger.warn('OpenAI response truncated due to max_tokens limit', {
          max_tokens: 16000,
          completion_tokens: response.usage.completion_tokens
        });
      }

      // Attempt to parse JSON with better error handling
      let result;
      try {
        result = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error('JSON parse error', {
          error: parseError.message,
          contentPreview: responseContent?.substring(0, 200),
          contentLength: responseContent?.length || 0,
          finishReason
        });
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}. Response may be truncated.`);
      }

      const tokensUsed = response.usage.total_tokens;
      this.tokensUsed += tokensUsed;
      
      const duration = Date.now() - startTime;
      logger.info('OpenAI extraction completed', { 
        duration, 
        tokensUsed,
        fieldsExtracted: Object.keys(result.fields || {}).length
      });
      
      return {
        fields: result.fields || {},
        confidence: result.overall_confidence || 0.8,
        metadata: {
          model,
          tokens_used: tokensUsed,
          duration_ms: duration,
        }
      };
      
    } catch (error) {
      logger.error('OpenAI extraction error', { error: error.message });
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }

  /**
   * Construir prompt de clasificación
   */
  _buildClassificationPrompt(text) {
    const sampleText = text.substring(0, 3000); // Primeros 3000 caracteres
    
    return `Classify this real estate/mortgage document into ONE of these types:

DOCUMENT TYPES:
- closing_alta: Closing statement or ALTA settlement statement
- first_payment_letter: First payment information letter
- escrow_disclosure: Initial escrow account disclosure
- home_owner_insurance: Home owner insurance policy or declaration
- exhibit_a: Exhibit A (legal property description)
- tax_bill: Property tax bill or assessment
- lease_agreement: Residential lease agreement
- mortgage_statement: Mortgage/loan statement
- unknown: Cannot determine type

DOCUMENT TEXT:
${sampleText}

Respond with JSON in this exact format:
{
  "document_type": "one_of_the_types_above",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this classification"
}`;
  }

  /**
   * Construir prompt de extracción
   */
  _buildExtractionPrompt(text, documentType) {
    const schema = this._getExtractionSchema(documentType);

    // Special instructions for closing documents
    const closingInstructions = documentType === 'closing_alta' ? `

CRITICAL FIELDS FOR CLOSING DOCUMENTS - PAY SPECIAL ATTENTION:
These fields MUST be extracted accurately from the Closing/ALTA Statement:

1. PROPERTY TAX (escrow_property_tax): Look for monthly escrow amount for property taxes
   - Usually in "Monthly Payment Breakdown" or "PITI" section
   - May be labeled as "Taxes", "Property Tax Escrow", "Tax Reserve"

2. MORTGAGE PAYMENT (monthly_payment_principal_interest): Principal + Interest only
   - Look for "P&I", "Principal & Interest", or base payment amount
   - This is separate from escrow amounts

3. HAZARD INSURANCE (escrow_home_owner_insurance): Monthly homeowner insurance escrow
   - Look for "Homeowner Insurance", "Hazard Insurance", "HOI"
   - This is the monthly escrow amount, NOT the annual premium

4. FLOOD INSURANCE (escrow_flood_insurance): Monthly flood insurance escrow if applicable
   - Look for "Flood Insurance", "Flood Ins", "FI" in monthly payment breakdown
   - May be $0 if property is not in flood zone

5. TOTAL MONTHLY PAYMENT (total_monthly_payment_piti): PITI total
   - Look for "Total Monthly Payment", "PITI", "Total Payment"
   - Should equal: P&I + Property Tax + Homeowner Insurance + Flood Insurance
   - This is the complete monthly mortgage payment

IMPORTANT: These amounts should be MONTHLY figures, not annual. If you find annual amounts, divide by 12.
` : '';

    return `Extract structured data from this ${documentType} document.

DOCUMENT TEXT:
${text}

REQUIRED FIELDS TO EXTRACT:
${JSON.stringify(schema, null, 2)}
${closingInstructions}
Instructions:
1. Extract ALL fields listed in the schema
2. For each field, provide:
   - value: The extracted value (use null if not found)
   - confidence: Your confidence in the extraction (0.0 to 1.0)
   - source_text: The exact text snippet where you found this value
3. Use proper data types (numbers for amounts, dates in ISO format)
4. For interest_rate, preserve UP TO 3 decimal places (e.g., 6.237)
5. Include an overall_confidence score

Respond with JSON in this format:
{
  "fields": {
    "field_name": {
      "value": "extracted_value",
      "confidence": 0.95,
      "source_text": "text snippet from document"
    },
    ...
  },
  "overall_confidence": 0.90
}`;
  }

  /**
   * Obtener esquema de extracción por tipo de documento
   */
  _getExtractionSchema(documentType) {
    const schemas = {
      closing_alta: {
        // Owner Information
        owner_name: 'string',
        owner_principal_address: 'string',
        owner_phone_number: 'string',
        owner_email_address: 'string',
        company_name: 'string',
        company_address: 'string',
        company_phone_number: 'string',
        company_email_address: 'string',

        // Property Information
        property_address: 'string',
        city: 'string',
        state: 'string',
        zip_code: 'string',
        property_address_legal_description: 'string',
        property_type: 'string',
        property_sqf: 'number',
        construction_year: 'number',
        property_owner: 'string',
        property_type_2: 'string',

        // Title Company Information
        title_company: 'string',
        title_company_contact: 'string',
        title_company_phone_number: 'string',
        title_company_email_address: 'string',

        // Financial Information
        purchase_price: 'number',
        refinance_price: 'number',
        purchase_refinance_closing_date: 'date',

        // Lender Information
        lender_mortgage_name: 'string',
        lender_mortgage_address: 'string',
        lender_mortgage_phone: 'string',
        lender_mortgage_web_page: 'string',
        lender_contact_primary_name: 'string',
        lender_contact_primary_phone: 'string',
        lender_contact_primary_fax: 'string',
        lender_contact_primary_email: 'string',
        lender_contact_secondary_name: 'string',
        lender_contact_secondary_email: 'string',
        lender_counsel_name: 'string',
        lender_counsel_address: 'string',
        lender_counsel_phone: 'string',
        lender_counsel_fax: 'string',
        lender_counsel_email: 'string',
        mortgage_servicing_company: 'string',
        mortgage_servicing_company_address: 'string',
        mortgage_servicing_company_phone_number: 'string',
        lender_web_page: 'string',

        // Loan Information
        loan_number: 'string',
        loan_amount: 'number',
        interest_rate: 'number',
        term_years: 'number',
        monthly_payment_principal_interest: 'number',
        escrow_property_tax: 'number',
        escrow_home_owner_insurance: 'number',
        escrow_flood_insurance: 'number',
        total_monthly_payment_piti: 'number',
        home_owner_insurance_initial_escrow: 'number',
        property_taxes_initial_escrow: 'number',
        first_payment_date: 'date',
        pre_payment_penalty: 'string',

        // Tax Information
        year_1: 'number',
        year_2: 'number',
        year_3: 'number',
        year_4: 'number',
        year_5: 'number',
        property_tax_county: 'string',
        tax_authority: 'string',
        tax_authority_web_page: 'string',
        account_number: 'string',
        assessed_value: 'number',
        taxes_paid_last_year: 'number',
        property_tax_percentage: 'number',

        // Insurance Information
        home_owner_insurance_initial_premium: 'number',
        insurance_company: 'string',
        insurance_agent_name: 'string',
        insurance_agent_contact: 'string',
        insurance_agent_phone_number: 'string',
        insurance_agent_email_address: 'string',
        hoi_effective_date: 'date',
        hoi_expiration_date: 'date',
        policy_number: 'string',
        coverage_a_dwelling: 'number',
        coverage_b_other_structures: 'number',
        coverage_c_personal_property: 'number',
        coverage_d_fair_rental_value: 'number',
        coverage_e_additional_living_expenses: 'number',

        // Lease Information
        initial_lease_tenant_name: 'string',
        lease_effective_date: 'date',
        lease_termination_date: 'date',
        gross_monthly_income_rent: 'number',
        property_management_percentage: 'number',
        property_management_amount: 'number',
        net_monthly_income: 'number',

        // Additional Insurance Fields
        insurance_initial_premium: 'number',
        insurance_agent_name: 'string',
        insurance_agent_contact: 'string',
        insurance_agent_phone_number: 'string',
        insurance_agent_email_address: 'string',
        hoi_effective_date: 'date',
        hoi_expiration_date: 'date',
        coverage_a_dwelling: 'number',
        coverage_b_other_structures: 'number',
        coverage_c_personal_property: 'number',
        coverage_d_fair_rental_value: 'number',
        coverage_e_additional_living_expenses: 'number',

        // Additional Lease Fields
        initial_lease_tenant_name: 'string',
        lease_effective_date: 'date',
        lease_termination_date: 'date',
        gross_monthly_income_rent: 'number',
        property_management_percentage: 'number',
        property_management_amount: 'number',
        net_monthly_income: 'number',

        // Legacy fields for backward compatibility
        borrower_name: 'string',
        lender_name: 'string',
        closing_date: 'date',
        down_payment: 'number',
      },
      first_payment_letter: {
        loan_number: 'string',
        first_payment_date: 'date',
        monthly_payment: 'number',
        principal_and_interest: 'number',
        escrow_amount: 'number',
        total_payment: 'number',
      },
      escrow_disclosure: {
        loan_number: 'string',
        property_taxes: 'number',
        homeowner_insurance: 'number',
        monthly_escrow: 'number',
        initial_deposit: 'number',
      },
      home_owner_insurance: {
        // Policy Info
        policy_number: 'string',
        effective_date: 'date',
        expiration_date: 'date',
        annual_premium: 'number',
        insurance_initial_premium: 'number',
        coverage_amount: 'number',
        deductible: 'number',

        // Insurance Company Info
        insurance_company: 'string',
        insurance_agent_name: 'string',
        insurance_agent_contact: 'string',
        insurance_agent_phone_number: 'string',
        insurance_agent_email_address: 'string',

        // Coverage Details
        coverage_a_dwelling: 'number',
        coverage_b_other_structures: 'number',
        coverage_c_personal_property: 'number',
        coverage_d_fair_rental_value: 'number',
        coverage_e_additional_living_expenses: 'number',

        // Property Info (often in insurance docs)
        property_address: 'string',
        city: 'string',
        state: 'string',
        zip_code: 'string',
        property_sqf: 'number',
        construction_year: 'number',

        // Insured/Owner Info
        owner_name: 'string',
        borrower_name: 'string',
        owner_principal_address: 'string',
        owner_phone_number: 'string',
        owner_email_address: 'string',
      },
      tax_bill: {
        // Tax Info
        parcel_number: 'string',
        account_number: 'string',
        assessed_value: 'number',
        tax_amount: 'number',
        taxes: 'number',
        annual_taxes: 'number',
        taxes_paid_last_year: 'number',
        due_date: 'date',
        property_tax_percentage: 'number',

        // Tax Authority
        property_tax_county: 'string',
        tax_county: 'string',
        tax_authority: 'string',
        tax_authority_web_page: 'string',

        // Property Info
        property_address: 'string',
        city: 'string',
        state: 'string',
        zip_code: 'string',
        property_sqf: 'number',
        construction_year: 'number',
        legal_description: 'string',

        // Owner Info
        owner_name: 'string',
        property_owner: 'string',
        owner_principal_address: 'string',
      },
      lease_agreement: {
        // Parties
        tenant_name: 'string',
        initial_lease_tenant_name: 'string',
        landlord_name: 'string',
        owner_name: 'string',

        // Property Info
        property_address: 'string',
        city: 'string',
        state: 'string',
        zip_code: 'string',
        property_sqf: 'number',
        construction_year: 'number',

        // Lease Terms
        monthly_rent: 'number',
        rent: 'number',
        lease_start_date: 'date',
        lease_effective_date: 'date',
        lease_end_date: 'date',
        lease_termination_date: 'date',
        security_deposit: 'number',

        // Property Management
        gross_monthly_income_rent: 'number',
        property_management_percentage: 'number',
        property_management_amount: 'number',
        net_monthly_income: 'number',
      },
      mortgage_statement: {
        // Loan Info
        loan_number: 'string',
        statement_date: 'date',
        principal_balance: 'number',
        loan_amount: 'number',
        interest_rate: 'number',
        loan_rate: 'number',
        term_years: 'number',
        monthly_payment: 'number',
        monthly_payment_principal_interest: 'number',
        next_payment_date: 'date',
        first_payment_date: 'date',

        // Escrow Info
        escrow_property_tax: 'number',
        escrow_home_owner_insurance: 'number',
        total_monthly_payment_piti: 'number',

        // Property Info
        property_address: 'string',
        city: 'string',
        state: 'string',
        zip_code: 'string',

        // Borrower/Lender
        borrower_name: 'string',
        owner_name: 'string',
        lender_name: 'string',
        lender_mortgage_name: 'string',
        lender_mortgage_address: 'string',
        lender_mortgage_phone: 'string',
        mortgage_servicing_company: 'string',
      },
    };

    return schemas[documentType] || {};
  }

  /**
   * Obtener total de tokens usados
   */
  getTotalTokensUsed() {
    return this.tokensUsed;
  }

  /**
   * Resetear contador de tokens
   */
  resetTokensUsed() {
    this.tokensUsed = 0;
  }
}

module.exports = OpenAIClient;