import React, { useState } from 'react';

const EnhancedPropertyEditor = ({
  property,
  isEditing,
  form,
  onInputChange,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [activeSection, setActiveSection] = useState('property');

  // Section navigation items
  const sections = [
    { id: 'property', label: 'Property Info', icon: '🏠' },
    { id: 'owner', label: 'Owner', icon: '👤' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'loan', label: 'Loan Details', icon: '🏦' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️' },
    { id: 'taxes', label: 'Taxes', icon: '📊' },
    { id: 'lease', label: 'Lease', icon: '📋' },
    { id: 'contacts', label: 'Contacts', icon: '📞' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '24px',
        maxWidth: '1400px',
        width: '100%',
        maxHeight: '95vh',
        display: 'flex',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1) inset',
        border: '1px solid rgba(79, 70, 229, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Left Sidebar Navigation */}
        <div style={{
          width: '280px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRight: '1px solid rgba(79, 70, 229, 0.2)',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(79, 70, 229, 0.2)' }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#f1f5f9',
              marginBottom: '8px'
            }}>
              {isEditing ? 'Edit Property' : 'New Property'}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#94a3b8'
            }}>
              {isEditing ? property?.address || 'Untitled' : 'Create a new property'}
            </p>
          </div>

          {/* Navigation Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: activeSection === section.id
                    ? 'rgba(79, 70, 229, 0.15)'
                    : 'transparent',
                  border: 'none',
                  borderLeft: activeSection === section.id
                    ? '3px solid #4F46E5'
                    : '3px solid transparent',
                  color: activeSection === section.id ? '#818cf8' : '#94a3b8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeSection === section.id ? 600 : 500,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseOver={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.background = 'rgba(79, 70, 229, 0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(79, 70, 229, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              style={{
                padding: '14px',
                background: isSubmitting
                  ? '#475569'
                  : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(79, 70, 229, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting
                ? (isEditing ? 'Updating...' : 'Saving...')
                : (isEditing ? 'Update Property' : 'Save Property')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '10px',
                color: '#94a3b8',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px'
        }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}>
            {activeSection === 'property' && (
              <PropertyInfoSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'owner' && (
              <OwnerSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'financial' && (
              <FinancialSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'loan' && (
              <LoanSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'insurance' && (
              <InsuranceSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'taxes' && (
              <TaxesSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'lease' && (
              <LeaseSection form={form} onChange={onInputChange} />
            )}
            {activeSection === 'contacts' && (
              <ContactsSection form={form} onChange={onInputChange} />
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// Reusable Card Container Component
const EditableCard = ({ title, icon, children, columns = 2 }) => (
  <div style={{
    background: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid rgba(79, 70, 229, 0.15)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid rgba(79, 70, 229, 0.2)'
    }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <h4 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: 700,
        color: '#f1f5f9'
      }}>
        {title}
      </h4>
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '20px'
    }}>
      {children}
    </div>
  </div>
);

// Reusable Input Field Component
const InputField = ({ label, name, value, onChange, type = 'text', required = false, style, ...props }) => (
  <label style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    ...style
  }}>
    <span style={{
      fontSize: '13px',
      fontWeight: 600,
      color: '#cbd5e1',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </span>
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      style={{
        padding: '14px 16px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(79, 70, 229, 0.3)',
        borderRadius: '10px',
        color: '#f1f5f9',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        minHeight: '48px'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#4F46E5';
        e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
        e.target.style.boxShadow = 'none';
      }}
      {...props}
    />
  </label>
);

// Section Components
const PropertyInfoSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Basic Information" icon="🏠" columns={2}>
      <InputField
        label="Property Address"
        name="address"
        value={form.address}
        onChange={onChange}
        required
        style={{ gridColumn: '1 / -1' }}
      />
      <InputField
        label="City"
        name="city"
        value={form.city}
        onChange={onChange}
      />
      <InputField
        label="State"
        name="state"
        value={form.state}
        onChange={onChange}
        maxLength={2}
      />
      <InputField
        label="ZIP Code"
        name="zipCode"
        value={form.zipCode}
        onChange={onChange}
      />
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Property Type
        </span>
        <select
          name="propertyType"
          value={form.propertyType}
          onChange={onChange}
          style={{
            padding: '14px 16px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(79, 70, 229, 0.3)',
            borderRadius: '10px',
            color: '#f1f5f9',
            fontSize: '15px',
            outline: 'none',
            cursor: 'pointer',
            minHeight: '48px'
          }}
        >
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="land">Land</option>
        </select>
      </label>
    </EditableCard>

    <EditableCard title="Property Details" icon="📐" columns={3}>
      <InputField
        label="Square Feet"
        name="propertySqf"
        value={form.propertySqf}
        onChange={onChange}
        type="number"
        min="0"
      />
      <InputField
        label="Construction Year"
        name="constructionYear"
        value={form.constructionYear}
        onChange={onChange}
        type="number"
        min="1800"
        max={new Date().getFullYear()}
      />
      <InputField
        label="Property Owner"
        name="propertyOwner"
        value={form.propertyOwner}
        onChange={onChange}
      />
      <InputField
        label="Legal Description"
        name="propertyAddressLegalDescription"
        value={form.propertyAddressLegalDescription}
        onChange={onChange}
        style={{ gridColumn: '1 / -1' }}
      />
    </EditableCard>

    <EditableCard title="Valuation & Income" icon="💵" columns={2}>
      <InputField
        label="Property Valuation"
        name="valuation"
        value={form.valuation}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Monthly Rent"
        name="rent"
        value={form.rent}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Gross Monthly Income"
        name="grossMonthlyIncomeRent"
        value={form.grossMonthlyIncomeRent}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Net Monthly Income"
        name="netMonthlyIncome"
        value={form.netMonthlyIncome}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
    </EditableCard>

    <EditableCard title="Operating Expenses" icon="💸" columns={3}>
      <InputField
        label="Annual Taxes"
        name="taxes"
        value={form.taxes}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Annual Insurance"
        name="insurance"
        value={form.insurance}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Monthly HOA"
        name="hoa"
        value={form.hoa}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Maintenance %"
        name="maintenance"
        value={form.maintenance}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
      <InputField
        label="Vacancy %"
        name="vacancy"
        value={form.vacancy}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
      <InputField
        label="Prop. Mgmt %"
        name="propertyManagementPercentage"
        value={form.propertyManagementPercentage}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
    </EditableCard>
  </>
);

const OwnerSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Owner Information" icon="👤" columns={2}>
      <InputField
        label="Owner Name"
        name="ownerName"
        value={form.ownerName}
        onChange={onChange}
      />
      <InputField
        label="Owner Email"
        name="ownerEmailAddress"
        value={form.ownerEmailAddress}
        onChange={onChange}
        type="email"
      />
      <InputField
        label="Owner Phone"
        name="ownerPhoneNumber"
        value={form.ownerPhoneNumber}
        onChange={onChange}
      />
      <InputField
        label="Owner Address"
        name="ownerPrincipalAddress"
        value={form.ownerPrincipalAddress}
        onChange={onChange}
      />
    </EditableCard>

    <EditableCard title="Company Information" icon="🏢" columns={2}>
      <InputField
        label="Company Name"
        name="companyName"
        value={form.companyName}
        onChange={onChange}
      />
      <InputField
        label="Company Email"
        name="companyEmailAddress"
        value={form.companyEmailAddress}
        onChange={onChange}
        type="email"
      />
      <InputField
        label="Company Phone"
        name="companyPhoneNumber"
        value={form.companyPhoneNumber}
        onChange={onChange}
      />
      <InputField
        label="Company Address"
        name="companyAddress"
        value={form.companyAddress}
        onChange={onChange}
      />
    </EditableCard>
  </>
);

const FinancialSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Purchase Information" icon="💰" columns={2}>
      <InputField
        label="Purchase Price"
        name="purchasePrice"
        value={form.purchasePrice}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Purchase/Closing Date"
        name="purchaseRefinanceClosingDate"
        value={form.purchaseRefinanceClosingDate}
        onChange={onChange}
        type="date"
      />
      <InputField
        label="Down Payment"
        name="downPayment"
        value={form.downPayment}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Closing Date"
        name="closingDate"
        value={form.closingDate}
        onChange={onChange}
        type="date"
      />
    </EditableCard>
  </>
);

const LoanSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Loan Details" icon="🏦" columns={2}>
      <InputField
        label="Loan Number"
        name="loanNumber"
        value={form.loanNumber}
        onChange={onChange}
      />
      <InputField
        label="Loan Amount"
        name="loanAmount"
        value={form.loanAmount}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Interest Rate %"
        name="loanRate"
        value={form.loanRate}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
      <InputField
        label="Loan Term (years)"
        name="loanTerm"
        value={form.loanTerm}
        onChange={onChange}
        type="number"
        min="0"
        step="1"
      />
      <InputField
        label="Monthly Payment"
        name="monthlyPayment"
        value={form.monthlyPayment}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="LTV %"
        name="ltv"
        value={form.ltv}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
      <InputField
        label="First Payment Date"
        name="firstPaymentDate"
        value={form.firstPaymentDate}
        onChange={onChange}
        type="date"
      />
      <InputField
        label="Pre-Payment Penalty"
        name="prePaymentPenalty"
        value={form.prePaymentPenalty}
        onChange={onChange}
      />
    </EditableCard>

    <EditableCard title="Lender Information" icon="🏛️" columns={2}>
      <InputField
        label="Lender Name"
        name="lenderMortgageName"
        value={form.lenderMortgageName}
        onChange={onChange}
      />
      <InputField
        label="Lender Phone"
        name="lenderMortgagePhone"
        value={form.lenderMortgagePhone}
        onChange={onChange}
      />
      <InputField
        label="Lender Address"
        name="lenderMortgageAddress"
        value={form.lenderMortgageAddress}
        onChange={onChange}
        style={{ gridColumn: '1 / -1' }}
      />
      <InputField
        label="Lender Website"
        name="lenderMortgageWebPage"
        value={form.lenderMortgageWebPage}
        onChange={onChange}
        type="url"
        style={{ gridColumn: '1 / -1' }}
      />
      <InputField
        label="Servicing Company"
        name="mortgageServicingCompany"
        value={form.mortgageServicingCompany}
        onChange={onChange}
      />
      <InputField
        label="Servicing Company Phone"
        name="mortgageServicingCompanyPhoneNumber"
        value={form.mortgageServicingCompanyPhoneNumber}
        onChange={onChange}
      />
      <InputField
        label="Servicing Company Address"
        name="mortgageServicingCompanyAddress"
        value={form.mortgageServicingCompanyAddress}
        onChange={onChange}
        style={{ gridColumn: '1 / -1' }}
      />
    </EditableCard>

    <EditableCard title="Escrow Information" icon="💼" columns={2}>
      <InputField
        label="Escrow Property Tax"
        name="escrowPropertyTax"
        value={form.escrowPropertyTax}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Escrow HOI"
        name="escrowHomeOwnerInsurance"
        value={form.escrowHomeOwnerInsurance}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="HOI Initial Escrow"
        name="homeOwnerInsuranceInitialEscrow"
        value={form.homeOwnerInsuranceInitialEscrow}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Property Tax Initial Escrow"
        name="propertyTaxesInitialEscrow"
        value={form.propertyTaxesInitialEscrow}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Total Monthly Payment (PITI)"
        name="totalMonthlyPaymentPiti"
        value={form.totalMonthlyPaymentPiti}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Monthly P&I"
        name="monthlyPaymentPrincipalInterest"
        value={form.monthlyPaymentPrincipalInterest}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
    </EditableCard>
  </>
);

const InsuranceSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Insurance Policy" icon="🛡️" columns={2}>
      <InputField
        label="Policy Number"
        name="insurancePolicyNumber"
        value={form.insurancePolicyNumber}
        onChange={onChange}
      />
      <InputField
        label="Insurance Company"
        name="insuranceCompany"
        value={form.insuranceCompany}
        onChange={onChange}
      />
      <InputField
        label="Initial Premium"
        name="insuranceInitialPremium"
        value={form.insuranceInitialPremium}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Total Coverage"
        name="insuranceCoverage"
        value={form.insuranceCoverage}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Deductible"
        name="insuranceDeductible"
        value={form.insuranceDeductible}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Effective Date"
        name="insuranceEffectiveDate"
        value={form.insuranceEffectiveDate}
        onChange={onChange}
        type="date"
      />
      <InputField
        label="Expiration Date"
        name="insuranceExpirationDate"
        value={form.insuranceExpirationDate}
        onChange={onChange}
        type="date"
      />
    </EditableCard>

    <EditableCard title="Coverage Details" icon="📋" columns={2}>
      <InputField
        label="Coverage A - Dwelling"
        name="coverageADwelling"
        value={form.coverageADwelling}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Coverage B - Other Structures"
        name="coverageBOtherStructures"
        value={form.coverageBOtherStructures}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Coverage C - Personal Property"
        name="coverageCPersonalProperty"
        value={form.coverageCPersonalProperty}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Coverage D - Fair Rental Value"
        name="coverageDFairRentalValue"
        value={form.coverageDFairRentalValue}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Coverage E - Additional Living"
        name="coverageEAdditionalLivingExpenses"
        value={form.coverageEAdditionalLivingExpenses}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
        style={{ gridColumn: '1 / -1' }}
      />
    </EditableCard>

    <EditableCard title="Agent Information" icon="👨‍💼" columns={2}>
      <InputField
        label="Agent Name"
        name="insuranceAgentName"
        value={form.insuranceAgentName}
        onChange={onChange}
      />
      <InputField
        label="Agent Contact"
        name="insuranceAgentContact"
        value={form.insuranceAgentContact}
        onChange={onChange}
      />
      <InputField
        label="Agent Phone"
        name="insuranceAgentPhoneNumber"
        value={form.insuranceAgentPhoneNumber}
        onChange={onChange}
      />
      <InputField
        label="Agent Email"
        name="insuranceAgentEmailAddress"
        value={form.insuranceAgentEmailAddress}
        onChange={onChange}
        type="email"
      />
    </EditableCard>
  </>
);

const TaxesSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Tax Information" icon="📊" columns={2}>
      <InputField
        label="Property Tax County"
        name="propertyTaxCounty"
        value={form.propertyTaxCounty}
        onChange={onChange}
      />
      <InputField
        label="Tax Authority"
        name="taxAuthority"
        value={form.taxAuthority}
        onChange={onChange}
      />
      <InputField
        label="Account Number"
        name="accountNumber"
        value={form.accountNumber}
        onChange={onChange}
      />
      <InputField
        label="Assessed Value"
        name="assessedValue"
        value={form.assessedValue}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Taxes Paid Last Year"
        name="taxesPaidLastYear"
        value={form.taxesPaidLastYear}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Property Tax %"
        name="propertyTaxPercentage"
        value={form.propertyTaxPercentage}
        onChange={onChange}
        type="number"
        min="0"
        max="100"
        step="0.01"
      />
      <InputField
        label="Tax Authority Website"
        name="taxAuthorityWebPage"
        value={form.taxAuthorityWebPage}
        onChange={onChange}
        type="url"
        style={{ gridColumn: '1 / -1' }}
      />
    </EditableCard>

    <EditableCard title="Tax History" icon="📈" columns={5}>
      <InputField
        label="Year 1"
        name="year1"
        value={form.year1}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Year 2"
        name="year2"
        value={form.year2}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Year 3"
        name="year3"
        value={form.year3}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Year 4"
        name="year4"
        value={form.year4}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
      <InputField
        label="Year 5"
        name="year5"
        value={form.year5}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
    </EditableCard>
  </>
);

const LeaseSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Lease Information" icon="📋" columns={2}>
      <InputField
        label="Initial Tenant Name"
        name="initialLeaseTenantName"
        value={form.initialLeaseTenantName}
        onChange={onChange}
      />
      <InputField
        label="Lease Effective Date"
        name="leaseEffectiveDate"
        value={form.leaseEffectiveDate}
        onChange={onChange}
        type="date"
      />
      <InputField
        label="Lease Termination Date"
        name="leaseTerminationDate"
        value={form.leaseTerminationDate}
        onChange={onChange}
        type="date"
      />
      <InputField
        label="Property Management Amount"
        name="propertyManagementAmount"
        value={form.propertyManagementAmount}
        onChange={onChange}
        type="number"
        min="0"
        step="0.01"
      />
    </EditableCard>

    <EditableCard title="Additional Notes" icon="📝" columns={1}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Notes
        </span>
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows={6}
          style={{
            padding: '14px 16px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(79, 70, 229, 0.3)',
            borderRadius: '10px',
            color: '#f1f5f9',
            fontSize: '15px',
            outline: 'none',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            resize: 'vertical',
            lineHeight: '1.6'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4F46E5';
            e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </label>
    </EditableCard>
  </>
);

const ContactsSection = ({ form, onChange }) => (
  <>
    <EditableCard title="Title Company" icon="📋" columns={2}>
      <InputField
        label="Title Company"
        name="titleCompany"
        value={form.titleCompany}
        onChange={onChange}
      />
      <InputField
        label="Title Company Contact"
        name="titleCompanyContact"
        value={form.titleCompanyContact}
        onChange={onChange}
      />
      <InputField
        label="Title Company Phone"
        name="titleCompanyPhoneNumber"
        value={form.titleCompanyPhoneNumber}
        onChange={onChange}
      />
      <InputField
        label="Title Company Email"
        name="titleCompanyEmailAddress"
        value={form.titleCompanyEmailAddress}
        onChange={onChange}
        type="email"
      />
    </EditableCard>

    <EditableCard title="Borrower Information" icon="👤" columns={2}>
      <InputField
        label="Borrower Name"
        name="borrowerName"
        value={form.borrowerName}
        onChange={onChange}
      />
      <InputField
        label="Lender Name"
        name="lenderName"
        value={form.lenderName}
        onChange={onChange}
      />
    </EditableCard>
  </>
);

export default EnhancedPropertyEditor;
