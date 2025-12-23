import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';
import PropertyDocuments from '../components/PropertyDocuments';
// import PropertyScorecard from '../components/PropertyScorecard'; // REMOVED - Using MortgageCalculator instead
import PropertyLookup from './PropertyLookup';
import AIPDFUploader from '../components/AIPDFUploader';
import PropertyDocumentWizard from '../components/PropertyDocumentWizard';
import BulkPropertyWizard from '../components/BulkPropertyWizard';
import EnhancedPropertyCard from '../components/EnhancedPropertyCard';
import EnhancedPropertyEditor from '../components/EnhancedPropertyEditor';
import MortgageCalculator from '../components/MortgageCalculator';
import HelocDashboard from '../components/HelocDashboard';

const INITIAL_FORM = {
  address: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'residential',
  valuation: '',
  rent: '',
  taxes: '',
  insurance: '',
  hoa: '',
  maintenance: '',
  vacancy: '',
  loanRate: '',
  loanTerm: '',
  ltv: '',
  loanAmount: '',
  loanNumber: '',
  monthlyPayment: '',
  borrowerName: '',
  lenderName: '',
  closingDate: '',
  notes: '',
  insurancePolicyNumber: '',
  insuranceEffectiveDate: '',
  insuranceExpirationDate: '',
  insuranceCoverage: '',
  insuranceDeductible: '',
  downPayment: '',
  propertyTaxCounty: '',
  taxAuthority: '',
  taxAuthorityWebPage: '',
  accountNumber: '',
  assessedValue: '',
  taxesPaidLastYear: '',
  propertyTaxPercentage: '',
  insuranceInitialPremium: '',
  insuranceCompany: '',
  insuranceAgentName: '',
  insuranceAgentContact: '',
  insuranceAgentPhoneNumber: '',
  insuranceAgentEmailAddress: '',
  coverageADwelling: '',
  coverageBOtherStructures: '',
  coverageCPersonalProperty: '',
  coverageDFairRentalValue: '',
  coverageEAdditionalLivingExpenses: '',
  initialLeaseTenantName: '',
  leaseEffectiveDate: '',
  leaseTerminationDate: '',
  grossMonthlyIncomeRent: '',
  propertyManagementPercentage: '',
  propertyManagementAmount: '',
  netMonthlyIncome: '',
  ownerName: '',
  ownerPrincipalAddress: '',
  ownerPhoneNumber: '',
  ownerEmailAddress: '',
  companyName: '',
  companyAddress: '',
  companyPhoneNumber: '',
  companyEmailAddress: '',
  propertyAddressLegalDescription: '',
  propertySqf: '',
  constructionYear: '',
  propertyOwner: '',
  propertyType2: '',
  titleCompany: '',
  titleCompanyContact: '',
  titleCompanyPhoneNumber: '',
  titleCompanyEmailAddress: '',
  purchasePrice: '',
  purchaseRefinanceClosingDate: '',
  lenderMortgageName: '',
  lenderMortgageAddress: '',
  lenderMortgagePhone: '',
  lenderMortgageWebPage: '',
  mortgageServicingCompany: '',
  mortgageServicingCompanyAddress: '',
  mortgageServicingCompanyPhoneNumber: '',
  lenderWebPage: '',
  interestRate: '',
  termYears: '',
  monthlyPaymentPrincipalInterest: '',
  escrowPropertyTax: '',
  escrowHomeOwnerInsurance: '',
  totalMonthlyPaymentPiti: '',
  homeOwnerInsuranceInitialEscrow: '',
  propertyTaxesInitialEscrow: '',
  firstPaymentDate: '',
  prePaymentPenalty: '',
  year1: '',
  year2: '',
  year3: '',
  year4: '',
  year5: ''
};

const NUMERIC_FIELDS = [
  'valuation',
  'rent',
  'taxes',
  'insurance',
  'hoa',
  'maintenance',
  'vacancy',
  'loanRate',
  'loanTerm',
  'ltv',
  'loanAmount',
  'monthlyPayment'
];

const FIELD_CONFIG = {
  valuation: { label: 'Valuation (USD)', step: '0.01' },
  rent: { label: 'Monthly Rent (USD)', step: '0.01' },
  taxes: { label: 'Annual Taxes (USD)', step: '0.01' },
  insurance: { label: 'Annual Insurance (USD)', step: '0.01' },
  hoa: { label: 'Monthly HOA (USD)', step: '0.01' },
  maintenance: { label: 'Maintenance %', step: '0.01', min: '0', max: '100' },
  vacancy: { label: 'Vacancy %', step: '0.01', min: '0', max: '100' },
  loanRate: { label: 'Loan Rate %', step: '0.01', min: '0', max: '100' },
  loanTerm: { label: 'Loan Term (years)', step: '1', min: '0' },
  ltv: { label: 'LTV %', step: '0.01', min: '0', max: '100' },
  loanAmount: { label: 'Loan Amount (USD)', step: '0.01' },
  monthlyPayment: { label: 'Monthly Payment (USD)', step: '0.01' },
  insuranceCoverage: { label: 'Insurance Coverage (USD)', step: '0.01' },
  insuranceDeductible: { label: 'Insurance Deductible (USD)', step: '0.01' },
  downPayment: { label: 'Down Payment (USD)', step: '0.01' },
  assessedValue: { label: 'Assessed Value (USD)', step: '0.01' },
  taxesPaidLastYear: { label: 'Taxes Paid Last Year (USD)', step: '0.01' },
  propertyTaxPercentage: { label: 'Property Tax %', step: '0.01', min: '0', max: '100' },
  insuranceInitialPremium: { label: 'Insurance Initial Premium (USD)', step: '0.01' },
  coverageADwelling: { label: 'Coverage A - Dwelling (USD)', step: '0.01' },
  coverageBOtherStructures: { label: 'Coverage B - Other Structures (USD)', step: '0.01' },
  coverageCPersonalProperty: { label: 'Coverage C - Personal Property (USD)', step: '0.01' },
  coverageDFairRentalValue: { label: 'Coverage D - Fair Rental Value (USD)', step: '0.01' },
  coverageEAdditionalLivingExpenses: { label: 'Coverage E - Additional Living Expenses (USD)', step: '0.01' },
  grossMonthlyIncomeRent: { label: 'Gross Monthly Income (Rent) (USD)', step: '0.01' },
  propertyManagementPercentage: { label: 'Property Management %', step: '0.01', min: '0', max: '100' },
  propertyManagementAmount: { label: 'Property Management Amount (USD)', step: '0.01' },
  netMonthlyIncome: { label: 'Net Monthly Income (USD)', step: '0.01' }
};

const MODAL_OVERLAY_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(15, 23, 42, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '20px',
  backdropFilter: 'blur(4px)'
};

const MODAL_CARD_STYLE = {
  background: 'var(--panel-primary)',
  borderRadius: '18px',
  maxWidth: '1100px',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 80px rgba(15, 23, 42, 0.55)',
  overflow: 'hidden'
};

function PropertiesView({ user, properties, setProperties }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [documentProperty, setDocumentProperty] = useState(null);
  const [scorecardProperty, setScorecardProperty] = useState(null);
  const [helocProperty, setHelocProperty] = useState(null);
  const [showLookup, setShowLookup] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showBulkWizard, setShowBulkWizard] = useState(false);
  const [bulkUploadFiles, setBulkUploadFiles] = useState(null); // Store files from bulk upload
  const [bulkUploadResults, setBulkUploadResults] = useState(null); // Store AI results
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all'); // 'all', 'primary', 'investment'
  const [sortBy, setSortBy] = useState('recent');

  const handleLookupImport = useCallback((lookupData) => {
    const data = lookupData?.data;
    if (!data) {
      return;
    }

    const annualTaxes = (data.propertyTaxRate && data.price)
      ? Number((data.price * (data.propertyTaxRate / 100)).toFixed(2))
      : null;

    setForm((current) => ({
      ...current,
      address: data.streetAddress || current.address || '',
      city: data.city || current.city || '',
      state: data.state || current.state || '',
      zipCode: data.zipcode || current.zipCode || '',
      valuation: data.price ?? current.valuation,
      propertySqf: data.lotSizeSquareFeet ?? current.propertySqf,
      constructionYear: data.yearBuilt ?? current.constructionYear,
      taxes: annualTaxes ?? current.taxes,
      insurance: data.annualHomeownersInsurance ?? current.insurance,
      rent: data.rentZestimate ?? current.rent
    }));
    setShowForm(true);
  }, []);


  const handleWizardComplete = (wizardData) => {
    console.log('🎉 Wizard completado:', wizardData);
    console.log('📋 JSON Consolidado:', wizardData.consolidated);

    const formMapping = wizardData.consolidated.form_mapping || {};
    const mappedForm = { ...INITIAL_FORM };

    const fieldMapping = {
      'property_address': 'address',
      'loan_number': 'loanNumber',
      'loan_amount': 'loanAmount',
      'borrower_name': 'borrowerName',
      'lender_name': 'lenderName',
      'closing_date': 'closingDate',
      'purchase_price': 'valuation',
      'down_payment': 'downPayment',
      'policy_number': 'insurancePolicyNumber',
      'annual_premium': 'insurance',
      'effective_date': 'insuranceEffectiveDate',
      'expiration_date': 'insuranceExpirationDate',
      'coverage_amount': 'insuranceCoverage',
      'deductible': 'insuranceDeductible',
      'property_tax_county': 'propertyTaxCounty',
      'tax_authority': 'taxAuthority',
      'tax_authority_web_page': 'taxAuthorityWebPage',
      'account_number': 'accountNumber',
      'assessed_value': 'assessedValue',
      'taxes_paid_last_year': 'taxesPaidLastYear',
      'taxes': 'taxes',
      'property_tax_percentage': 'propertyTaxPercentage',
      'insurance_initial_premium': 'insuranceInitialPremium',
      'insurance_company': 'insuranceCompany',
      'insurance_agent_name': 'insuranceAgentName',
      'insurance_agent_contact': 'insuranceAgentContact',
      'insurance_agent_phone_number': 'insuranceAgentPhoneNumber',
      'insurance_agent_email_address': 'insuranceAgentEmailAddress',
      'coverage_a_dwelling': 'coverageADwelling',
      'coverage_b_other_structures': 'coverageBOtherStructures',
      'coverage_c_personal_property': 'coverageCPersonalProperty',
      'coverage_d_fair_rental_value': 'coverageDFairRentalValue',
      'coverage_e_additional_living_expenses': 'coverageEAdditionalLivingExpenses',
      'initial_lease_tenant_name': 'initialLeaseTenantName',
      'lease_effective_date': 'leaseEffectiveDate',
      'lease_termination_date': 'leaseTerminationDate',
      'monthly_rent': 'rent',
      'rent': 'rent',
      'gross_monthly_income_rent': 'grossMonthlyIncomeRent',
      'property_management_percentage': 'propertyManagementPercentage',
      'property_management_amount': 'propertyManagementAmount',
      'net_monthly_income': 'netMonthlyIncome',
      'interest_rate': 'loanRate',
      'loan_rate': 'loanRate',
      'term_years': 'loanTerm',
      'loan_term': 'loanTerm',
      'monthly_payment': 'monthlyPayment',
      'hoa': 'hoa',
      'hoa_fee': 'hoa',
      'maintenance': 'maintenance',
      'maintenance_percentage': 'maintenance',
      'vacancy': 'vacancy',
      'vacancy_percentage': 'vacancy',
      'ltv': 'ltv',
      'loan_to_value': 'ltv'
    };

    Object.entries(formMapping).forEach(([field, value]) => {
      const formField = fieldMapping[field] || field;
      if (formField in mappedForm) {
        mappedForm[formField] = value;
        if (field === 'loan_amount' && !mappedForm.valuation) {
          mappedForm.valuation = value;
        }
      }
    });

    if (mappedForm.address && mappedForm.address.includes(',')) {
      const parts = mappedForm.address.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        mappedForm.address = parts[0];
        mappedForm.city = parts[1];
        const stateZip = parts[2].split(' ');
        if (stateZip.length >= 2) {
          mappedForm.state = stateZip[0];
          mappedForm.zipCode = stateZip[1];
        }
      }
    }

    // Calculate LTV if we have loan amount and valuation
    if (mappedForm.loanAmount && mappedForm.valuation) {
      const loanAmountNum = Number(mappedForm.loanAmount);
      const valuationNum = Number(mappedForm.valuation);
      if (loanAmountNum > 0 && valuationNum > 0) {
        mappedForm.ltv = ((loanAmountNum / valuationNum) * 100).toFixed(2);
      }
    }

    // Calculate down payment if we have valuation and loan amount
    if (!mappedForm.downPayment && mappedForm.valuation && mappedForm.loanAmount) {
      const valuationNum = Number(mappedForm.valuation);
      const loanAmountNum = Number(mappedForm.loanAmount);
      if (valuationNum > 0 && loanAmountNum > 0) {
        mappedForm.downPayment = (valuationNum - loanAmountNum).toFixed(2);
      }
    }

    const consolidatedData = wizardData.consolidated.consolidated_data || {};
    const metadata = wizardData.consolidated._metadata || {};
    const notes = [];

    notes.push('📋 DOCUMENT SUMMARY');
    notes.push('==================');

    if (consolidatedData.property_address) {
      notes.push(`🏠 Property: ${consolidatedData.property_address.value}`);
    }
    if (consolidatedData.purchase_price) {
      notes.push(`💰 Purchase Price: $${consolidatedData.purchase_price.value.toLocaleString()}`);
    }
    if (consolidatedData.loan_amount) {
      notes.push(`🏦 Loan Amount: $${consolidatedData.loan_amount.value.toLocaleString()}`);
    }
    if (consolidatedData.closing_date) {
      notes.push(`📅 Closing Date: ${new Date(consolidatedData.closing_date.value).toLocaleDateString()}`);
    }
    if (consolidatedData.borrower_name) {
      notes.push(`👤 Borrower: ${consolidatedData.borrower_name.value}`);
    }
    if (consolidatedData.lender_name) {
      notes.push(`🏢 Lender: ${consolidatedData.lender_name.value}`);
    }
    if (consolidatedData.annual_premium) {
      notes.push(`🛡️ Annual Premium: $${consolidatedData.annual_premium.value}`);
    }
    if (consolidatedData.coverage_amount) {
      notes.push(`🛡️ Coverage: $${consolidatedData.coverage_amount.value.toLocaleString()}`);
    }
    if (consolidatedData.effective_date && consolidatedData.expiration_date) {
      notes.push(`🛡️ Insurance Period: ${new Date(consolidatedData.effective_date.value).toLocaleDateString()} - ${new Date(consolidatedData.expiration_date.value).toLocaleDateString()}`);
    }
    if (metadata.documents_processed) {
      notes.push('');
      notes.push('📄 DOCUMENTS PROCESSED:');
      notes.push(`   ${metadata.documents_processed.join(', ')}`);
    }
    if (metadata.total_fields) {
      notes.push(`📊 Total Fields Extracted: ${metadata.total_fields}`);
    }

    mappedForm.notes = notes.join('\n');

    console.log('📝 Formulario mapeado desde wizard usando form_mapping:', mappedForm);
    setForm(mappedForm);
    setShowForm(true);
    setShowWizard(false);
  };

  const handleDataExtracted = (extractedData) => {
    console.log('📥 Datos extraídos del PDF:', extractedData);

    // Get address components with fallback parsing
    let addressStr = extractedData.property?.address || extractedData.property?.full_address || '';
    let cityStr = extractedData.property?.city || '';
    let stateStr = extractedData.property?.state || '';
    let zipStr = extractedData.property?.zip || '';

    // If city/state/zip are missing but we have full address, try to parse it
    if (addressStr && (!cityStr || !stateStr || !zipStr)) {
      const addressParts = addressStr.split(',').map(p => p.trim());
      if (addressParts.length >= 2) {
        // Format: "Street, City, ST ZIP" or "Street, City ST ZIP"
        if (addressParts.length >= 3) {
          addressStr = addressParts[0];
          cityStr = cityStr || addressParts[1];
          const stateZipParts = addressParts[2].split(' ').filter(Boolean);
          if (stateZipParts.length >= 2) {
            stateStr = stateStr || stateZipParts[0];
            zipStr = zipStr || stateZipParts[1];
          }
        } else if (addressParts.length === 2) {
          // Format: "Street, City ST ZIP"
          addressStr = addressParts[0];
          const cityStateZip = addressParts[1].split(' ').filter(Boolean);
          if (cityStateZip.length >= 3) {
            cityStr = cityStr || cityStateZip.slice(0, -2).join(' ');
            stateStr = stateStr || cityStateZip[cityStateZip.length - 2];
            zipStr = zipStr || cityStateZip[cityStateZip.length - 1];
          }
        }
      }
    }

    const mappedForm = {
      ...INITIAL_FORM,
      address: addressStr,
      city: cityStr,
      state: stateStr,
      zipCode: zipStr,
      propertyType: (extractedData.property?.type || '').toLowerCase().includes('single family')
        ? 'residential'
        : (extractedData.property?.type || '').toLowerCase().includes('commercial')
          ? 'commercial'
          : 'residential',
      valuation: extractedData.financial?.purchase_price || extractedData.property?.value || '',
      closingDate: extractedData.financial?.closing_date || '',
      loanAmount: extractedData.loan?.amount || '',
      loanNumber: extractedData.loan?.number || '',
      loanRate: extractedData.loan?.interest_rate || extractedData.loan?.rate || '',
      loanTerm: extractedData.loan?.term_years || extractedData.loan?.term || '',
      monthlyPayment: extractedData.loan?.monthly_payment || '',
      ltv: (extractedData.loan?.amount && extractedData.financial?.purchase_price)
        ? ((extractedData.loan.amount / extractedData.financial.purchase_price) * 100).toFixed(2)
        : extractedData.loan?.ltv || '',
      downPayment: extractedData.financial?.down_payment ||
        (extractedData.financial?.purchase_price && extractedData.loan?.amount
          ? (extractedData.financial.purchase_price - extractedData.loan.amount)
          : ''),
      taxes: extractedData.taxes?.annual_amount || extractedData.property?.annual_taxes || '',
      insurance: extractedData.insurance?.annual_premium || extractedData.property?.annual_insurance || '',
      rent: extractedData.lease?.monthly_rent || extractedData.property?.monthly_rent || '',
      hoa: extractedData.property?.hoa || extractedData.property?.hoa_fee || '',
      maintenance: extractedData.property?.maintenance_percentage || extractedData.property?.maintenance || '',
      vacancy: extractedData.property?.vacancy_percentage || extractedData.property?.vacancy || '',
      borrowerName: extractedData.borrower?.name || '',
      lenderName: extractedData.lender?.name || '',
      lenderMortgageName: extractedData.lender?.name || '',
      lenderMortgageAddress: extractedData.lender?.address || '',
      lenderMortgagePhone: extractedData.lender?.phone || extractedData.lender?.contact_primary_phone || '',
      ownerName: extractedData.owner?.name || extractedData.borrower?.name || '',
      ownerPrincipalAddress: extractedData.owner?.address || extractedData.owner?.principal_address || '',
      ownerPhoneNumber: extractedData.owner?.phone || extractedData.owner?.phone_number || '',
      ownerEmailAddress: extractedData.owner?.email || extractedData.owner?.email_address || '',
      insurancePolicyNumber: extractedData.insurance?.policy_number || '',
      insuranceCompany: extractedData.insurance?.company || '',
      insuranceInitialPremium: extractedData.insurance?.initial_premium || '',
      propertyTaxCounty: extractedData.taxes?.county || '',
      taxAuthority: extractedData.taxes?.authority || '',
      assessedValue: extractedData.taxes?.assessed_value || '',
      notes: [
        extractedData.loan?.number ? `Loan #: ${extractedData.loan.number}` : '',
        extractedData.borrower?.name ? `Borrower: ${extractedData.borrower.name}` : '',
        extractedData.lender?.name ? `Lender: ${extractedData.lender.name}` : '',
        extractedData.lender?.address ? `Lender Address: ${extractedData.lender.address}` : '',
        extractedData.lender?.contact_primary_name ? `Lender Contact: ${extractedData.lender.contact_primary_name}` : '',
        extractedData.lender?.contact_primary_phone ? `Lender Phone: ${extractedData.lender.contact_primary_phone}` : '',
        extractedData.lender?.contact_primary_email ? `Lender Email: ${extractedData.lender.contact_primary_email}` : '',
        extractedData.lender?.counsel_name ? `Lender Counsel: ${extractedData.lender.counsel_name}` : ''
      ].filter(Boolean).join('\n')
    };

    console.log('📝 Formulario mapeado:', mappedForm);
    setForm(mappedForm);
    setShowForm(true);
  };

  const isEditing = Boolean(editingProperty);

  const formatPercentage = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'N/A';
    return `${numeric.toFixed(2)}%`;
  };

  const formatLoanTerm = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'N/A';
    return `${numeric}${numeric === 1 ? ' year' : ' years'}`;
  };

  const formatLocation = (property) => {
    const city = property.city || '';
    const state = property.state || '';
    const zip = property.zip_code || property.zipCode || '';

    const locationParts = [];
    const cityState = [city, state].filter(Boolean).join(', ');
    if (cityState) {
      locationParts.push(cityState);
    }
    if (zip) {
      locationParts.push(zip);
    }

    return locationParts.length > 0 ? locationParts.join(' | ') : 'Location not available';
  };

  const mapPropertyToForm = (property) => {
    const toInputValue = (value) => (value === null || value === undefined ? '' : `${value}`);
    const rawType = property.property_type || property.propertyType || 'residential';
    const normalizedType = typeof rawType === 'string' ? rawType.toLowerCase() : 'residential';

    return {
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zip_code || property.zipCode || '',
      propertyType: normalizedType,
      valuation: toInputValue(property.valuation),
      rent: toInputValue(property.rent),
      taxes: toInputValue(property.taxes),
      insurance: toInputValue(property.insurance),
      hoa: toInputValue(property.hoa),
      maintenance: toInputValue(property.maintenance),
      vacancy: toInputValue(property.vacancy),
      loanRate: toInputValue(property.loan_rate),
      loanTerm: toInputValue(property.loan_term),
      ltv: toInputValue(property.ltv),
      loanAmount: toInputValue(property.loan_amount),
      loanNumber: toInputValue(property.loan_number),
      monthlyPayment: toInputValue(property.monthly_payment),
      borrowerName: toInputValue(property.borrower_name),
      lenderName: toInputValue(property.lender_name),
      closingDate: toInputValue(property.closing_date),
      notes: toInputValue(property.notes),
      insurancePolicyNumber: toInputValue(property.insurance_policy_number),
      insuranceEffectiveDate: toInputValue(property.insurance_effective_date),
      insuranceExpirationDate: toInputValue(property.insurance_expiration_date),
      insuranceCoverage: toInputValue(property.insurance_coverage),
      insuranceDeductible: toInputValue(property.insurance_deductible),
      downPayment: toInputValue(property.down_payment),
      propertyTaxCounty: toInputValue(property.property_tax_county),
      taxAuthority: toInputValue(property.tax_authority),
      taxAuthorityWebPage: toInputValue(property.tax_authority_web_page),
      accountNumber: toInputValue(property.account_number),
      assessedValue: toInputValue(property.assessed_value),
      taxesPaidLastYear: toInputValue(property.taxes_paid_last_year),
      propertyTaxPercentage: toInputValue(property.property_tax_percentage),
      insuranceInitialPremium: toInputValue(property.insurance_initial_premium),
      insuranceCompany: toInputValue(property.insurance_company),
      insuranceAgentName: toInputValue(property.insurance_agent_name),
      insuranceAgentContact: toInputValue(property.insurance_agent_contact),
      insuranceAgentPhoneNumber: toInputValue(property.insurance_agent_phone_number),
      insuranceAgentEmailAddress: toInputValue(property.insurance_agent_email_address),
      coverageADwelling: toInputValue(property.coverage_a_dwelling),
      coverageBOtherStructures: toInputValue(property.coverage_b_other_structures),
      coverageCPersonalProperty: toInputValue(property.coverage_c_personal_property),
      coverageDFairRentalValue: toInputValue(property.coverage_d_fair_rental_value),
      coverageEAdditionalLivingExpenses: toInputValue(property.coverage_e_additional_living_expenses),
      initialLeaseTenantName: toInputValue(property.initial_lease_tenant_name),
      leaseEffectiveDate: toInputValue(property.lease_effective_date),
      leaseTerminationDate: toInputValue(property.lease_termination_date),
      grossMonthlyIncomeRent: toInputValue(property.gross_monthly_income_rent),
      propertyManagementPercentage: toInputValue(property.property_management_percentage),
      propertyManagementAmount: toInputValue(property.property_management_amount),
      netMonthlyIncome: toInputValue(property.net_monthly_income)
    };
  };

  const formatPropertyTypeLabel = (value) => {
    if (!value) {
      return 'Residential';
    }
    const str = value.toString();
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const baseApiUrl = useMemo(() => {
    const url = (API_BASE_URL || '').replace(/\/$/, '');
    console.log('baseApiUrl configured as:', url, 'from API_BASE_URL:', API_BASE_URL);
    return url;
  }, []);

  const resolveAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken && !ENABLE_DEMO_MODE) {
      setErrorMessage('Your session has expired. Please sign in again to manage properties.');
      return null;
    }

    return accessToken || 'dummy-token';
  }, []);

  const fetchProperties = useCallback(async () => {
    if (!user) {
      return;
    }

    setErrorMessage('');
    try {
      const token = await resolveAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch(`${baseApiUrl}/api/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || errorData.details || `API error ${response.status}`);
      }

      const data = await response.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load properties', err);
      setErrorMessage(`Unable to load your properties: ${err.message}`);
    }
  }, [baseApiUrl, resolveAuthToken, setProperties, user]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditingProperty(null);
    setShowForm(false);
  };

  const handleCreateNewProperty = () => {
    setForm({ ...INITIAL_FORM });
    setEditingProperty(null);
    setDocumentProperty(null);
    setScorecardProperty(null);
    setShowWizard(false);
    setShowLookup(false);
    setShowForm(true);
  };

  const handleStartWizard = () => {
    setDocumentProperty(null);
    setScorecardProperty(null);
    setShowForm(false);
    setShowLookup(false);
    setShowWizard(true);
  };

  const handleStartBulkWizard = () => {
    // Open bulk upload wizard to create a NEW property from folder documents
    setShowBulkWizard(true);
  };

  const uploadBulkDocumentsToStorage = async (propertyId, files, results) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log(`📤 Uploading ${files.length} files for property ${propertyId}...`);

    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = results && results[index];
        const documentType = result?.document_type || 'unknown';
        const timestamp = Date.now();
        const fileName = `${propertyId}/${documentType}_${timestamp}_${file.name}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`❌ Failed to upload ${file.name}:`, uploadError);
          throw uploadError;
        }

        console.log(`✅ Uploaded ${file.name} to storage:`, uploadData.path);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('property-documents')
          .getPublicUrl(fileName);

        console.log(`✅ Document uploaded successfully: ${file.name}`);

        // Return document info (no database save needed - files are in storage)
        return {
          property_id: propertyId,
          user_id: userId,
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_url: publicUrl,
          file_size: file.size,
          metadata: result ? {
            document_id: result.document_id,
            classification_confidence: result.classification_confidence,
            extracted_data: result.extracted_data,
            validation: result.validation,
            processed_at: new Date().toISOString()
          } : null
        };

      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        throw error;
      }
    });

    const uploadedDocuments = await Promise.all(uploadPromises);
    console.log(`✅ Successfully uploaded ${uploadedDocuments.length} documents`);

    return uploadedDocuments;
  };

  const handleBulkUploadComplete = (consolidatedData) => {
    console.log('✅ Bulk upload completed:', consolidatedData);

    // Map consolidated data to form (SAME mapping as handleWizardComplete)
    const formMapping = consolidatedData.consolidated?.form_mapping || {};
    const mappedForm = { ...INITIAL_FORM };

    // COMPLETE field mapping - includes ALL fields from INITIAL_FORM
    const fieldMapping = {
      // Property Info
      'property_address': 'address',
      'street_address': 'address',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip_code': 'zipCode',
      'zip': 'zipCode',
      'zipcode': 'zipCode',
      'property_type': 'propertyType',
      'square_feet': 'propertySqf',
      'sqft': 'propertySqf',
      'property_sqf': 'propertySqf',
      'year_built': 'constructionYear',
      'construction_year': 'constructionYear',
      'legal_description': 'propertyAddressLegalDescription',

      // Financial - Purchase/Valuation
      'purchase_price': 'valuation',
      'valuation': 'valuation',
      'property_value': 'valuation',
      'down_payment': 'downPayment',
      'closing_date': 'closingDate',
      'purchase_date': 'closingDate',
      'purchase_refinance_closing_date': 'purchaseRefinanceClosingDate',

      // Loan Details
      'loan_number': 'loanNumber',
      'loan_amount': 'loanAmount',
      'interest_rate': 'loanRate',
      'loan_rate': 'loanRate',
      'rate': 'loanRate',
      'term_years': 'loanTerm',
      'loan_term': 'loanTerm',
      'term': 'loanTerm',
      'monthly_payment': 'monthlyPayment',
      'payment_amount': 'monthlyPayment',
      'monthly_payment_principal_interest': 'monthlyPaymentPrincipalInterest',
      'first_payment_date': 'firstPaymentDate',
      'prepayment_penalty': 'prePaymentPenalty',
      'ltv': 'ltv',
      'loan_to_value': 'ltv',

      // Borrower/Owner
      'borrower_name': 'borrowerName',
      'owner_name': 'ownerName',
      'owner_principal_address': 'ownerPrincipalAddress',
      'owner_phone_number': 'ownerPhoneNumber',
      'owner_email_address': 'ownerEmailAddress',
      'property_owner': 'propertyOwner',

      // Lender
      'lender_name': 'lenderName',
      'lender_mortgage_name': 'lenderMortgageName',
      'lender_mortgage_address': 'lenderMortgageAddress',
      'lender_mortgage_phone': 'lenderMortgagePhone',
      'lender_web_page': 'lenderWebPage',
      'lender_mortgage_web_page': 'lenderMortgageWebPage',
      'mortgage_servicer': 'mortgageServicingCompany',
      'mortgage_servicing_company': 'mortgageServicingCompany',
      'mortgage_servicing_company_address': 'mortgageServicingCompanyAddress',
      'mortgage_servicing_company_phone_number': 'mortgageServicingCompanyPhoneNumber',

      // Insurance - Basic
      'policy_number': 'insurancePolicyNumber',
      'annual_premium': 'insurance',
      'insurance_premium': 'insurance',
      'effective_date': 'insuranceEffectiveDate',
      'expiration_date': 'insuranceExpirationDate',
      'coverage_amount': 'insuranceCoverage',
      'deductible': 'insuranceDeductible',
      'insurance_initial_premium': 'insuranceInitialPremium',
      'insurance_company': 'insuranceCompany',
      'insurance_agent_name': 'insuranceAgentName',
      'insurance_agent_contact': 'insuranceAgentContact',
      'insurance_agent_phone_number': 'insuranceAgentPhoneNumber',
      'insurance_agent_email_address': 'insuranceAgentEmailAddress',

      // Insurance - Coverage Details
      'coverage_a_dwelling': 'coverageADwelling',
      'coverage_a': 'coverageADwelling',
      'dwelling_coverage': 'coverageADwelling',
      'coverage_b_other_structures': 'coverageBOtherStructures',
      'coverage_b': 'coverageBOtherStructures',
      'coverage_c_personal_property': 'coverageCPersonalProperty',
      'coverage_c': 'coverageCPersonalProperty',
      'coverage_d_fair_rental_value': 'coverageDFairRentalValue',
      'coverage_d': 'coverageDFairRentalValue',
      'coverage_e_additional_living_expenses': 'coverageEAdditionalLivingExpenses',
      'coverage_e': 'coverageEAdditionalLivingExpenses',
      'home_owner_insurance_initial_escrow': 'homeOwnerInsuranceInitialEscrow',
      'escrow_home_owner_insurance': 'escrowHomeOwnerInsurance',

      // Taxes
      'property_tax_county': 'propertyTaxCounty',
      'tax_county': 'propertyTaxCounty',
      'tax_authority': 'taxAuthority',
      'tax_authority_web_page': 'taxAuthorityWebPage',
      'account_number': 'accountNumber',
      'tax_account_number': 'accountNumber',
      'assessed_value': 'assessedValue',
      'taxes_paid_last_year': 'taxesPaidLastYear',
      'taxes': 'taxes',
      'annual_taxes': 'taxes',
      'property_tax': 'taxes',
      'property_tax_percentage': 'propertyTaxPercentage',
      'property_taxes_initial_escrow': 'propertyTaxesInitialEscrow',
      'escrow_property_tax': 'escrowPropertyTax',
      'total_monthly_payment_piti': 'totalMonthlyPaymentPiti',

      // Lease
      'initial_lease_tenant_name': 'initialLeaseTenantName',
      'tenant_name': 'initialLeaseTenantName',
      'lease_effective_date': 'leaseEffectiveDate',
      'lease_start_date': 'leaseEffectiveDate',
      'lease_termination_date': 'leaseTerminationDate',
      'lease_end_date': 'leaseTerminationDate',
      'monthly_rent': 'rent',
      'rent': 'rent',
      'gross_monthly_income_rent': 'grossMonthlyIncomeRent',
      'property_management_percentage': 'propertyManagementPercentage',
      'property_management_amount': 'propertyManagementAmount',
      'net_monthly_income': 'netMonthlyIncome',

      // Operating Expenses
      'hoa': 'hoa',
      'hoa_fee': 'hoa',
      'maintenance': 'maintenance',
      'maintenance_percentage': 'maintenance',
      'vacancy': 'vacancy',
      'vacancy_percentage': 'vacancy',

      // Title Company
      'title_company': 'titleCompany',
      'title_company_contact': 'titleCompanyContact',
      'title_company_phone_number': 'titleCompanyPhoneNumber',
      'title_company_email_address': 'titleCompanyEmailAddress',

      // Company Info (if LLC/Corp)
      'company_name': 'companyName',
      'company_address': 'companyAddress',
      'company_phone_number': 'companyPhoneNumber',
      'company_email_address': 'companyEmailAddress',
    };

    Object.entries(formMapping).forEach(([field, value]) => {
      const formField = fieldMapping[field] || field;
      if (formField in mappedForm) {
        mappedForm[formField] = value;
        // If we have loan amount but no valuation, use loan amount as basis
        if (field === 'loan_amount' && !mappedForm.valuation) {
          mappedForm.valuation = value;
        }
      }
    });

    // Parse address if needed
    if (mappedForm.address && mappedForm.address.includes(',')) {
      const parts = mappedForm.address.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        mappedForm.address = parts[0];
        mappedForm.city = parts[1];
        const stateZip = parts[2].split(' ');
        if (stateZip.length >= 2) {
          mappedForm.state = stateZip[0];
          mappedForm.zipCode = stateZip[1];
        }
      }
    }

    // Calculate LTV if we have loan amount and valuation
    if (mappedForm.loanAmount && mappedForm.valuation) {
      const loanAmountNum = Number(mappedForm.loanAmount);
      const valuationNum = Number(mappedForm.valuation);
      if (loanAmountNum > 0 && valuationNum > 0) {
        mappedForm.ltv = ((loanAmountNum / valuationNum) * 100).toFixed(2);
      }
    }

    // Calculate down payment if we have valuation and loan amount
    if (!mappedForm.downPayment && mappedForm.valuation && mappedForm.loanAmount) {
      const valuationNum = Number(mappedForm.valuation);
      const loanAmountNum = Number(mappedForm.loanAmount);
      if (valuationNum > 0 && loanAmountNum > 0) {
        mappedForm.downPayment = (valuationNum - loanAmountNum).toFixed(2);
      }
    }

    // Build comprehensive notes from ALL extracted data
    const consolidatedDataFields = consolidatedData.consolidated?.consolidated_data || {};
    const metadata = consolidatedData.consolidated?._metadata || {};
    const notes = [];

    notes.push('📋 BULK UPLOAD SUMMARY');
    notes.push('==================');

    // Property Info
    if (consolidatedDataFields.property_address) {
      notes.push(`🏠 Property: ${consolidatedDataFields.property_address.value}`);
    }
    if (consolidatedDataFields.square_feet || consolidatedDataFields.sqft) {
      const sqft = consolidatedDataFields.square_feet?.value || consolidatedDataFields.sqft?.value;
      notes.push(`📏 Square Feet: ${sqft.toLocaleString()} sqft`);
    }
    if (consolidatedDataFields.year_built || consolidatedDataFields.construction_year) {
      const year = consolidatedDataFields.year_built?.value || consolidatedDataFields.construction_year?.value;
      notes.push(`🏗️ Year Built: ${year}`);
    }

    // Financial
    if (consolidatedDataFields.purchase_price) {
      notes.push(`💰 Purchase Price: $${consolidatedDataFields.purchase_price.value.toLocaleString()}`);
    }
    if (consolidatedDataFields.loan_amount) {
      notes.push(`🏦 Loan Amount: $${consolidatedDataFields.loan_amount.value.toLocaleString()}`);
    }
    if (consolidatedDataFields.down_payment || mappedForm.downPayment) {
      const dp = consolidatedDataFields.down_payment?.value || mappedForm.downPayment;
      notes.push(`💵 Down Payment: $${Number(dp).toLocaleString()}`);
    }
    if (consolidatedDataFields.closing_date) {
      notes.push(`📅 Closing Date: ${new Date(consolidatedDataFields.closing_date.value).toLocaleDateString()}`);
    }

    // Parties
    if (consolidatedDataFields.borrower_name) {
      notes.push(`👤 Borrower: ${consolidatedDataFields.borrower_name.value}`);
    }
    if (consolidatedDataFields.lender_name) {
      notes.push(`🏢 Lender: ${consolidatedDataFields.lender_name.value}`);
    }

    // Loan Details
    if (consolidatedDataFields.interest_rate || consolidatedDataFields.loan_rate) {
      const rate = consolidatedDataFields.interest_rate?.value || consolidatedDataFields.loan_rate?.value;
      notes.push(`📊 Interest Rate: ${rate}%`);
    }
    if (consolidatedDataFields.term_years || consolidatedDataFields.loan_term) {
      const term = consolidatedDataFields.term_years?.value || consolidatedDataFields.loan_term?.value;
      notes.push(`⏱️ Loan Term: ${term} years`);
    }
    if (consolidatedDataFields.monthly_payment) {
      notes.push(`💳 Monthly Payment: $${consolidatedDataFields.monthly_payment.value.toLocaleString()}`);
    }

    // Insurance
    if (consolidatedDataFields.annual_premium) {
      notes.push(`🛡️ Annual Premium: $${consolidatedDataFields.annual_premium.value.toLocaleString()}`);
    }
    if (consolidatedDataFields.coverage_amount) {
      notes.push(`🛡️ Coverage: $${consolidatedDataFields.coverage_amount.value.toLocaleString()}`);
    }
    if (consolidatedDataFields.insurance_company) {
      notes.push(`🏢 Insurance Co: ${consolidatedDataFields.insurance_company.value}`);
    }
    if (consolidatedDataFields.effective_date && consolidatedDataFields.expiration_date) {
      notes.push(`🛡️ Insurance Period: ${new Date(consolidatedDataFields.effective_date.value).toLocaleDateString()} - ${new Date(consolidatedDataFields.expiration_date.value).toLocaleDateString()}`);
    }

    // Taxes
    if (consolidatedDataFields.taxes || consolidatedDataFields.annual_taxes) {
      const taxes = consolidatedDataFields.taxes?.value || consolidatedDataFields.annual_taxes?.value;
      notes.push(`🏛️ Annual Taxes: $${Number(taxes).toLocaleString()}`);
    }
    if (consolidatedDataFields.property_tax_county || consolidatedDataFields.tax_county) {
      const county = consolidatedDataFields.property_tax_county?.value || consolidatedDataFields.tax_county?.value;
      notes.push(`🏛️ Tax County: ${county}`);
    }

    // Lease
    if (consolidatedDataFields.monthly_rent || consolidatedDataFields.rent) {
      const rent = consolidatedDataFields.monthly_rent?.value || consolidatedDataFields.rent?.value;
      notes.push(`🏠 Monthly Rent: $${Number(rent).toLocaleString()}`);
    }
    if (consolidatedDataFields.initial_lease_tenant_name) {
      notes.push(`👤 Tenant: ${consolidatedDataFields.initial_lease_tenant_name.value}`);
    }

    // Documents
    if (metadata.documents_processed) {
      notes.push('');
      notes.push('📄 DOCUMENTS PROCESSED:');
      notes.push(`   ${metadata.documents_processed.join(', ')}`);
    }
    if (metadata.total_fields) {
      notes.push(`📊 Total Fields Extracted: ${metadata.total_fields}`);
    }

    mappedForm.notes = notes.join('\n');

    console.log('📝 Form mapped from bulk upload:', mappedForm);

    // Store the files and results for later upload after property is created
    const filesToStore = consolidatedData.files || [];
    const resultsToStore = consolidatedData.results || [];

    console.log('📦 Storing bulk upload data:', {
      filesCount: filesToStore.length,
      resultsCount: resultsToStore.length,
      files: filesToStore.map(f => f.name),
      results: resultsToStore.map(r => ({ filename: r.filename, document_type: r.document_type }))
    });

    setBulkUploadFiles(filesToStore);
    setBulkUploadResults(resultsToStore);

    setForm(mappedForm);
    setShowForm(true);
    setShowBulkWizard(false);
    setSuccessMessage(`Successfully processed ${metadata.documents_processed?.length || 0} documents! Review and save to upload documents.`);
    setTimeout(() => setSuccessMessage(''), 8000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    const payload = { ...form };
    NUMERIC_FIELDS.forEach((field) => {
      if (payload[field] !== '' && payload[field] !== null && payload[field] !== undefined) {
        const numberValue = Number(payload[field]);
        payload[field] = Number.isFinite(numberValue) ? numberValue : null;
      } else {
        payload[field] = null;
      }
    });

    ['address', 'city', 'state', 'zipCode', 'notes', 'loanNumber', 'borrowerName', 'lenderName', 'insurancePolicyNumber', 'propertyTaxCounty', 'taxAuthority', 'taxAuthorityWebPage', 'accountNumber', 'insuranceCompany', 'insuranceAgentName', 'insuranceAgentContact', 'insuranceAgentPhoneNumber', 'insuranceAgentEmailAddress', 'initialLeaseTenantName'].forEach((field) => {
      if (typeof payload[field] === 'string') {
        payload[field] = payload[field].trim();
      }
    });

    ['city', 'state', 'zipCode', 'notes', 'loanNumber', 'borrowerName', 'lenderName', 'insurancePolicyNumber', 'propertyTaxCounty', 'taxAuthority', 'taxAuthorityWebPage', 'accountNumber', 'insuranceCompany', 'insuranceAgentName', 'insuranceAgentContact', 'insuranceAgentPhoneNumber', 'insuranceAgentEmailAddress', 'initialLeaseTenantName'].forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    try {
      const token = await resolveAuthToken();
      if (!token) {
        return;
      }

      const endpoint = isEditing
        ? `${baseApiUrl}/api/properties/${editingProperty.property_id}`
        : `${baseApiUrl}/api/properties`;

      console.log('Sending request to:', endpoint, 'Method:', isEditing ? 'PUT' : 'POST');

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `API error ${response.status}`);
      }

      const property = await response.json();

      console.log('🎯 BREAKPOINT 1: Property saved to database');
      console.log('📊 Property data:', property);
      console.log('🔍 Current state:', {
        isEditing,
        isSubmitting,
        bulkUploadFiles: bulkUploadFiles ? bulkUploadFiles.length : null,
        bulkUploadResults: bulkUploadResults ? bulkUploadResults.length : null,
        propertyId: property.property_id,
        showForm
      });

      // If this was a bulk upload with files, upload them to storage and link to property
      if (!isEditing && bulkUploadFiles && bulkUploadFiles.length > 0) {
        console.log(`📤 Starting document upload for ${bulkUploadFiles.length} files...`);
        try {
          console.log(`📤 Calling uploadBulkDocumentsToStorage...`);
          await uploadBulkDocumentsToStorage(property.property_id, bulkUploadFiles, bulkUploadResults);
          console.log(`✅ uploadBulkDocumentsToStorage completed successfully!`);
          console.log(`✅ All ${bulkUploadFiles.length} documents uploaded successfully!`);
          setSuccessMessage(`Property saved successfully with ${bulkUploadFiles.length} documents uploaded!`);
        } catch (uploadErr) {
          console.error('❌ Error uploading documents:', uploadErr);
          setSuccessMessage('Property saved successfully, but some documents failed to upload. Check console for details.');
        } finally {
          // Clear bulk upload state
          console.log('🧹 Clearing bulk upload state...');
          setBulkUploadFiles(null);
          setBulkUploadResults(null);
          console.log('🧹 Bulk upload state cleared');
          console.log('🎯 BREAKPOINT 2: After bulk upload finally block');
        }
      } else {
        console.log('📝 No bulk upload, updating properties list...');
        if (isEditing) {
          setProperties((current) =>
            current.map((item) =>
              item.property_id === property.property_id ? property : item
            )
          );
          setSuccessMessage('Property updated successfully.');
        } else {
          setProperties((current) => [...current, property]);
          setSuccessMessage('Property saved successfully.');
        }
        console.log('📝 Properties list updated');
        console.log('🎯 BREAKPOINT 2: After no bulk upload block');
      }

      console.log('🎯 BREAKPOINT 3: Before duplicate property update');
      if (isEditing) {
        setProperties((current) =>
          current.map((item) =>
            item.property_id === property.property_id ? property : item
          )
        );
      } else {
        setProperties((current) => [...current, property]);
      }
      console.log('🎯 BREAKPOINT 4: After duplicate property update');

      // Reset submitting state after all operations are complete
      console.log('🎯 BREAKPOINT 5: About to set isSubmitting to false');
      console.log('📊 Current isSubmitting value:', isSubmitting);
      setIsSubmitting(false);
      console.log('✅ setIsSubmitting(false) called');

      // Close form and clear success message
      console.log('🎯 BREAKPOINT 6: About to reset form');
      console.log('📊 Current showForm value:', showForm);
      resetForm();
      console.log('✅ resetForm() called');

      console.log('🎯 BREAKPOINT 7: Setting success message timeout');
      setTimeout(() => setSuccessMessage(''), 5000);

      console.log('🎉 FINAL BREAKPOINT: All operations completed!');
    } catch (err) {
      console.error('Failed to submit property', err);
      const defaultErrorMessage = isEditing
        ? 'An error occurred while updating the property.'
        : 'An error occurred while saving the property.';
      setErrorMessage(err.message || defaultErrorMessage);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Delete this property? This action cannot be undone. All associated documents will also be deleted.')) {
      return;
    }

    try {
      const token = await resolveAuthToken();
      if (!token) {
        return;
      }

      console.log(`🗑️ Deleting property ${propertyId} and all associated documents...`);

      // First, delete all documents from storage
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('property-documents')
          .list(propertyId);

        if (listError) {
          console.error('Error listing documents:', listError);
        } else if (files && files.length > 0) {
          console.log(`📄 Found ${files.length} documents to delete`);

          // Delete all files in the property folder
          const filePaths = files.map(file => `${propertyId}/${file.name}`);
          const { error: deleteError } = await supabase.storage
            .from('property-documents')
            .remove(filePaths);

          if (deleteError) {
            console.error('Error deleting documents from storage:', deleteError);
          } else {
            console.log(`✅ Deleted ${files.length} documents from storage`);
          }
        } else {
          console.log('📄 No documents found for this property');
        }
      } catch (storageErr) {
        console.error('Error cleaning up storage:', storageErr);
        // Continue with property deletion even if storage cleanup fails
      }

      // Then delete the property from the database (this will cascade delete records)
      const response = await fetch(`${baseApiUrl}/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `API error ${response.status}`);
      }

      console.log('✅ Property and all associated data deleted successfully');
      setProperties((current) => current.filter((property) => property.property_id !== propertyId));
      if (editingProperty && editingProperty.property_id === propertyId) {
        resetForm();
      }
      setSuccessMessage('Property and all associated documents deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('❌ Failed to delete property', err);
      setErrorMessage(err.message || 'Unable to delete the property.');
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === 'state') {
      const sanitized = value.slice(0, 2).toUpperCase();
      setForm((current) => ({ ...current, [name]: sanitized }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleEdit = (property) => {
    setErrorMessage('');
    setSuccessMessage('');
    setForm(mapPropertyToForm(property));
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleSubmitClick = () => {
    const event = { preventDefault: () => { } };
    handleSubmit(event);
  };

  const renderForm = () => (
    <EnhancedPropertyEditor
      property={editingProperty}
      isEditing={isEditing}
      form={form}
      onInputChange={handleInputChange}
      onSubmit={handleSubmitClick}
      onCancel={resetForm}
      isSubmitting={isSubmitting}
    />
  );

  const renderFormOld = () => (
    <div style={{
      background: 'var(--panel-primary)',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid var(--border)',
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <div
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {isEditing ? 'Edit Property' : 'Add New Property'}
        </h3>
        <button
          type="button"
          onClick={resetForm}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {/* Owner Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }} open>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            👤 Owner Information
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Owner Name</span>
              <input
                name="ownerName"
                value={form.ownerName}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Owner Principal Address</span>
              <input
                name="ownerPrincipalAddress"
                value={form.ownerPrincipalAddress}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Owner Phone Number</span>
              <input
                name="ownerPhoneNumber"
                value={form.ownerPhoneNumber}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Owner Email Address</span>
              <input
                name="ownerEmailAddress"
                value={form.ownerEmailAddress}
                onChange={handleInputChange}
                type="email"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        {/* Company Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            🏢 Company Information
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Company Name</span>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Company Address</span>
              <input
                name="companyAddress"
                value={form.companyAddress}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Company Phone Number</span>
              <input
                name="companyPhoneNumber"
                value={form.companyPhoneNumber}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Company Email Address</span>
              <input
                name="companyEmailAddress"
                value={form.companyEmailAddress}
                onChange={handleInputChange}
                type="email"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        {/* Property Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }} open>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            🏠 Property Information
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <span>Property Address *</span>
              <input
                name="address"
                value={form.address}
                onChange={handleInputChange}
                required
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>City</span>
              <input
                name="city"
                value={form.city}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>State</span>
              <input
                name="state"
                value={form.state}
                onChange={handleInputChange}
                maxLength={2}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', textTransform: 'uppercase' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>ZIP Code</span>
              <input
                name="zipCode"
                value={form.zipCode}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <span>Property Address Legal Description (Parcel/Account)</span>
              <input
                name="propertyAddressLegalDescription"
                value={form.propertyAddressLegalDescription}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Property Type</span>
              <select
                name="propertyType"
                value={form.propertyType}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="land">Land</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Property SQF</span>
              <input
                name="propertySqf"
                value={form.propertySqf}
                onChange={handleInputChange}
                type="number"
                min="0"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Construction Year</span>
              <input
                name="constructionYear"
                value={form.constructionYear}
                onChange={handleInputChange}
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Property Owner</span>
              <input
                name="propertyOwner"
                value={form.propertyOwner}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Property Type 2 (Investment / Rental)</span>
              <select
                name="propertyType2"
                value={form.propertyType2}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <option value="">Select Type</option>
                <option value="investment">Investment</option>
                <option value="rental">Rental</option>
                <option value="primary_residence">Primary Residence</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Valuation / Property Value (USD)</span>
              <input
                name="valuation"
                value={form.valuation}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Monthly Rent (USD)</span>
              <input
                name="rent"
                value={form.rent}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Annual Taxes (USD)</span>
              <input
                name="taxes"
                value={form.taxes}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Annual Insurance (USD)</span>
              <input
                name="insurance"
                value={form.insurance}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Monthly HOA (USD)</span>
              <input
                name="hoa"
                value={form.hoa}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Maintenance %</span>
              <input
                name="maintenance"
                value={form.maintenance}
                onChange={handleInputChange}
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Vacancy %</span>
              <input
                name="vacancy"
                value={form.vacancy}
                onChange={handleInputChange}
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Loan Rate %</span>
              <input
                name="loanRate"
                value={form.loanRate}
                onChange={handleInputChange}
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Loan Term (years)</span>
              <input
                name="loanTerm"
                value={form.loanTerm}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="1"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>LTV %</span>
              <input
                name="ltv"
                value={form.ltv}
                onChange={handleInputChange}
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Loan Amount (USD)</span>
              <input
                name="loanAmount"
                value={form.loanAmount}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Loan Number</span>
              <input
                name="loanNumber"
                value={form.loanNumber}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Monthly Payment (USD)</span>
              <input
                name="monthlyPayment"
                value={form.monthlyPayment}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Down Payment (USD)</span>
              <input
                name="downPayment"
                value={form.downPayment}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        {/* Title Company Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            📋 Title Company
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Title Company</span>
              <input
                name="titleCompany"
                value={form.titleCompany}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Title Company Contact</span>
              <input
                name="titleCompanyContact"
                value={form.titleCompanyContact}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Title Company Phone Number</span>
              <input
                name="titleCompanyPhoneNumber"
                value={form.titleCompanyPhoneNumber}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Title Company Email Address</span>
              <input
                name="titleCompanyEmailAddress"
                value={form.titleCompanyEmailAddress}
                onChange={handleInputChange}
                type="email"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        {/* Purchase/Refinance Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            💰 Purchase / Refinance
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Purchase Price / Refinance Price (USD)</span>
              <input
                name="purchasePrice"
                value={form.purchasePrice}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Purchase/Refinance Closing Date</span>
              <input
                name="purchaseRefinanceClosingDate"
                value={form.purchaseRefinanceClosingDate}
                onChange={handleInputChange}
                type="date"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        {/* Lender (Originator) Section */}
        <details style={{
          marginBottom: '16px',
          background: 'var(--panel-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <summary style={{
            background: '#4F46E5',
            color: 'white',
            padding: '12px 16px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600'
          }}>
            🏦 Lender (Originator)
          </summary>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Lender Mortgage Name</span>
              <input
                name="lenderMortgageName"
                value={form.lenderMortgageName}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Lender Mortgage Address</span>
              <input
                name="lenderMortgageAddress"
                value={form.lenderMortgageAddress}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Lender Mortgage Phone</span>
              <input
                name="lenderMortgagePhone"
                value={form.lenderMortgagePhone}
                onChange={handleInputChange}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>Lender Mortgage Web Page</span>
              <input
                name="lenderMortgageWebPage"
                value={form.lenderMortgageWebPage}
                onChange={handleInputChange}
                type="url"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        </details>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>Notes</span>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleInputChange}
            rows={3}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={resetForm}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {isSubmitting
              ? (isEditing ? 'Updating...' : 'Saving...')
              : (isEditing ? 'Update Property' : 'Submit Property')}
          </button>
        </div>
      </form>
    </div>
  );

  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.address || '').toLowerCase().includes(search) ||
        (p.city || '').toLowerCase().includes(search) ||
        (p.state || '').toLowerCase().includes(search)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.property_type === filterType);
    }

    // Purpose filter (Primary Residence vs Investment)
    if (filterPurpose !== 'all') {
      if (filterPurpose === 'primary') {
        filtered = filtered.filter(p => p.is_primary_residence === true);
      } else if (filterPurpose === 'investment') {
        filtered = filtered.filter(p => p.is_primary_residence === false || p.is_primary_residence === null);
      }
    }

    // Sorting
    switch (sortBy) {
      case 'value-high':
        filtered.sort((a, b) => (b.valuation || 0) - (a.valuation || 0));
        break;
      case 'value-low':
        filtered.sort((a, b) => (a.valuation || 0) - (b.valuation || 0));
        break;
      case 'rent-high':
        filtered.sort((a, b) => (b.rent || 0) - (a.rent || 0));
        break;
      case 'rent-low':
        filtered.sort((a, b) => (a.rent || 0) - (b.rent || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
    }

    return filtered;
  }, [properties, searchTerm, filterType, filterPurpose, sortBy]);

  return (
    <div style={{ padding: '0 20px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '32px'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>Properties</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '15px' }}>
            Manage your real estate portfolio
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCreateNewProperty}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 24px rgba(102, 126, 234, 0.35)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 30px rgba(102, 126, 234, 0.45)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(102, 126, 234, 0.35)';
            }}
          >
            <i className="fas fa-plus-circle"></i>
            Add Property
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div
        style={{
          background: 'var(--panel-primary)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}></i>
            <input
              type="text"
              placeholder="Search by address, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--panel-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Property Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--panel-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="land">Land</option>
            </select>
          </div>

          {/* Purpose Filter (Primary vs Investment) */}
          <div>
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--panel-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">🏘️ All Properties</option>
              <option value="primary">🏠 Primary Residence</option>
              <option value="investment">💼 Investment</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--panel-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="value-high">Highest Value</option>
              <option value="value-low">Lowest Value</option>
              <option value="rent-high">Highest Rent</option>
              <option value="rent-low">Lowest Rent</option>
            </select>
          </div>
        </div>

        {/* Additional Tools */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)'
          }}
        >
          <AIPDFUploader
            onDataExtracted={handleDataExtracted}
            propertyId={editingProperty?.property_id}
          />
          <button
            type="button"
            onClick={handleStartBulkWizard}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-folder-plus"></i> Create from Folder
          </button>
          <button
            type="button"
            onClick={() => setShowLookup((current) => !current)}
            style={{
              padding: '10px 18px',
              background: showLookup ? 'var(--accent-primary)' : 'transparent',
              color: showLookup ? 'white' : 'var(--text-primary)',
              border: showLookup ? 'none' : '1px solid var(--border)',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            <i className={`fas ${showLookup ? 'fa-eye-slash' : 'fa-search'}`}></i>
            {showLookup ? 'Hide Search' : 'Search MLS'}
          </button>
          {(searchTerm || filterType !== 'all' || filterPurpose !== 'all' || sortBy !== 'recent') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterPurpose('all');
                setSortBy('recent');
              }}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-times-circle"></i>
              Clear Filters
            </button>
          )}
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>
            {filteredProperties.length} of {properties.length} properties
          </div>
        </div>
      </div>

      {showLookup && (
        <div
          style={{
            marginBottom: '24px'
          }}
        >
          <PropertyLookup
            embedded={true}
            onDataImport={handleLookupImport}
          />
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: '#10B981',
          color: 'white',
          borderRadius: '8px'
        }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: '#EF4444',
          color: 'white',
          borderRadius: '8px'
        }}>
          {errorMessage}
        </div>
      )}

      {showForm && renderForm()}

      {/* Properties Grid */}
      <div style={{ marginTop: '24px' }}>
        {properties.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--panel-primary)',
            borderRadius: '16px',
            border: '2px dashed var(--border)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>🏠</div>
            <h3 style={{ margin: '0 0 12px', fontSize: '24px' }}>No properties yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Start by adding your first property to begin managing your portfolio
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleCreateNewProperty}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 10px 24px rgba(102, 126, 234, 0.35)'
                }}
              >
                <i className="fas fa-plus-circle"></i> Add First Property
              </button>
            </div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--panel-primary)',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>No properties found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Try adjusting your filters or search criteria
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterPurpose('all');
                setSortBy('recent');
              }}
              style={{
                padding: '10px 20px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))',
            gap: '24px'
          }}>
            {filteredProperties.map((property) => (
              <EnhancedPropertyCard
                key={property.property_id}
                property={property}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDocuments={setDocumentProperty}
                onViewScorecard={setScorecardProperty}
                onViewHeloc={setHelocProperty}
              />
            ))}
          </div>
        )}
      </div>

      {documentProperty && (
        <div style={MODAL_OVERLAY_STYLE}>
          <div style={{ ...MODAL_CARD_STYLE, maxWidth: '950px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                  Documents for {documentProperty.address || 'property'}
                </h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Manage and upload files related to this property.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentProperty(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '26px',
                  cursor: 'pointer',
                  padding: '0 6px'
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <PropertyDocuments
                propertyId={documentProperty.property_id}
                userId={user?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* REMOVED PropertyScorecard - Now showing only MortgageCalculator */}
      {/* {scorecardProperty && (
        <PropertyScorecard
          property={scorecardProperty}
          onClose={() => setScorecardProperty(null)}
        />
      )} */}

      {/* Mortgage Calculator - Replaces scorecard */}
      {scorecardProperty && (
        <>
          {console.log('🎯 Rendering MortgageCalculator with property:', scorecardProperty)}
          <MortgageCalculator
            propertyId={scorecardProperty.property_id}
            property={scorecardProperty}
            onClose={() => setScorecardProperty(null)}
          />
        </>
      )}

      {/* HELOC Dashboard */}
      {helocProperty && (
        <>
          {console.log('💰 Rendering HelocDashboard with property:', helocProperty)}
          <HelocDashboard
            property={helocProperty}
            onClose={() => setHelocProperty(null)}
          />
        </>
      )}

      {showWizard && (
        <PropertyDocumentWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {showBulkWizard && (
        <BulkPropertyWizard
          onComplete={handleBulkUploadComplete}
          onCancel={() => setShowBulkWizard(false)}
        />
      )}
    </div>
  );
}

export default PropertiesView;


