/**
 * Script para consolidar información de todos los documentos procesados
 */

const fs = require('fs');
const path = require('path');

function consolidatePropertyData() {
  const processedDir = path.join(__dirname, 'Documents', '11127-Kimberly-Ave', 'processed');
  const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.json'));

  console.log('📊 CONSOLIDACIÓN DETALLADA DE INFORMACIÓN DE PROPIEDAD');
  console.log('═'.repeat(80));
  console.log(`\n📍 Dirección: 11127 Kimberly Ave, Englewood, FL\n`);

  const propertyData = {
    address: {
      street: '11127 Kimberly Ave',
      city: 'Englewood',
      state: 'FL',
      zip: '34224'
    },
    owner: {},
    property_details: {},
    financial: {},
    insurance: {},
    tax: {},
    documents_processed: []
  };

  // Procesar cada documento
  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(processedDir, file), 'utf8'));
    const docType = data.document_type;
    const extracted = data.extracted_data;

    console.log(`\n📄 ${docType.toUpperCase().replace(/_/g, ' ')}`);
    console.log('─'.repeat(80));

    propertyData.documents_processed.push({
      type: docType,
      id: data.document_id,
      processed_at: data.processing.timestamp,
      confidence: data.classification_confidence
    });

    // Extraer campos según tipo de documento
    if (docType === 'home_owner_insurance') {
      console.log('🏠 SEGURO:');
      if (extracted.policy_number?.value) {
        console.log(`   Número de Póliza: ${extracted.policy_number.value}`);
        propertyData.insurance.policy_number = extracted.policy_number.value;
      }
      if (extracted.annual_premium?.value) {
        console.log(`   Prima Anual: $${parseFloat(extracted.annual_premium.value).toLocaleString()}`);
        propertyData.insurance.annual_premium = parseFloat(extracted.annual_premium.value);
      }
      if (extracted.coverage_amount?.value) {
        console.log(`   Cobertura: $${parseFloat(extracted.coverage_amount.value).toLocaleString()}`);
        propertyData.insurance.coverage_amount = parseFloat(extracted.coverage_amount.value);
      }
      if (extracted.deductible?.value) {
        console.log(`   Deducible: $${parseFloat(extracted.deductible.value).toLocaleString()}`);
        propertyData.insurance.deductible = parseFloat(extracted.deductible.value);
      }
      if (extracted.effective_date?.value) {
        console.log(`   Vigencia: ${extracted.effective_date.value} a ${extracted.expiration_date?.value || 'N/A'}`);
        propertyData.insurance.effective_date = extracted.effective_date.value;
        propertyData.insurance.expiration_date = extracted.expiration_date?.value;
      }
    }

    if (docType === 'tax_bill') {
      console.log('💰 IMPUESTOS:');
      if (extracted.parcel_number?.value) {
        console.log(`   Número de Parcela: ${extracted.parcel_number.value}`);
        propertyData.tax.parcel_number = extracted.parcel_number.value;
      }
      if (extracted.assessed_value?.value) {
        console.log(`   Valor Avalúo: $${parseFloat(extracted.assessed_value.value).toLocaleString()}`);
        propertyData.tax.assessed_value = parseFloat(extracted.assessed_value.value);
      }
      if (extracted.tax_amount?.value) {
        console.log(`   Impuesto Anual: $${parseFloat(extracted.tax_amount.value).toLocaleString()}`);
        propertyData.tax.annual_amount = parseFloat(extracted.tax_amount.value);
      }
      if (extracted.due_date?.value) {
        console.log(`   Fecha de Vencimiento: ${extracted.due_date.value}`);
        propertyData.tax.due_date = extracted.due_date.value;
      }
    }

    if (docType === 'unknown') {
      // Este es el Certificate of Occupancy
      console.log('🏗️  CERTIFICADO DE OCUPACIÓN:');
      if (extracted.permit_number?.value) {
        console.log(`   Número de Permiso: ${extracted.permit_number.value}`);
        propertyData.property_details.permit_number = extracted.permit_number.value;
      }
      if (extracted.owner?.value) {
        console.log(`   Propietario: ${extracted.owner.value}`);
        propertyData.owner.name = extracted.owner.value;
      }
      if (extracted.owner_address?.value) {
        console.log(`   Dirección del Propietario: ${extracted.owner_address.value}`);
        propertyData.owner.address = extracted.owner_address.value;
      }
      if (extracted.issued_for?.value) {
        console.log(`   Tipo de Propiedad: ${extracted.issued_for.value}`);
        propertyData.property_details.type = extracted.issued_for.value;
      }
      if (extracted.square_footage?.value) {
        console.log(`   Área: ${extracted.square_footage.value} sqft`);
        propertyData.property_details.square_footage = parseFloat(extracted.square_footage.value);
      }
      if (extracted.use_and_occupancy?.value) {
        console.log(`   Uso y Ocupación: ${extracted.use_and_occupancy.value}`);
        propertyData.property_details.use_and_occupancy = extracted.use_and_occupancy.value;
      }
      if (extracted.flood_zone?.value) {
        console.log(`   Zona de Inundación: ${extracted.flood_zone.value}`);
        propertyData.property_details.flood_zone = extracted.flood_zone.value;
      }
      if (extracted.parcel_id?.value) {
        console.log(`   Parcel ID: ${extracted.parcel_id.value}`);
        propertyData.property_details.parcel_id = extracted.parcel_id.value;
      }
      if (extracted.issue_date?.value) {
        console.log(`   Fecha de Emisión: ${extracted.issue_date.value}`);
        propertyData.property_details.co_issue_date = extracted.issue_date.value;
      }
      if (extracted.contractor?.value) {
        console.log(`   Contratista: ${extracted.contractor.value}`);
        propertyData.property_details.contractor = extracted.contractor.value;
      }
      if (extracted.construction_type?.value) {
        console.log(`   Tipo de Construcción: ${extracted.construction_type.value}`);
        propertyData.property_details.construction_type = extracted.construction_type.value;
      }
    }

    if (docType === 'closing_alta') {
      console.log('📋 CIERRE (ALTA):');
      if (extracted.closing_date?.value) {
        console.log(`   Fecha de Cierre: ${extracted.closing_date.value}`);
        propertyData.financial.closing_date = extracted.closing_date.value;
      }
      // Intentar obtener otros campos aunque tengan confianza baja
      console.log('   (Nota: Este documento tiene campos con baja confianza de extracción)');
    }
  });

  // Calcular métricas
  console.log('\n\n📊 RESUMEN FINANCIERO');
  console.log('═'.repeat(80));

  if (propertyData.insurance.annual_premium) {
    const monthlyInsurance = propertyData.insurance.annual_premium / 12;
    console.log(`💵 Seguro Mensual: $${monthlyInsurance.toFixed(2)}`);
    propertyData.financial.monthly_insurance = monthlyInsurance;
  }

  if (propertyData.tax.annual_amount) {
    const monthlyTax = propertyData.tax.annual_amount / 12;
    console.log(`💵 Impuestos Mensuales: $${monthlyTax.toFixed(2)}`);
    propertyData.financial.monthly_tax = monthlyTax;
  }

  if (propertyData.insurance.annual_premium && propertyData.tax.annual_amount) {
    const monthlyOperating = (propertyData.insurance.annual_premium + propertyData.tax.annual_amount) / 12;
    console.log(`💵 Total Gastos Operativos Mensuales (Seguro + Impuestos): $${monthlyOperating.toFixed(2)}`);
    propertyData.financial.monthly_operating_expenses = monthlyOperating;
  }

  console.log('\n\n🏠 DETALLES DE LA PROPIEDAD');
  console.log('═'.repeat(80));
  console.log(`📍 Dirección: ${propertyData.address.street}, ${propertyData.address.city}, ${propertyData.address.state} ${propertyData.address.zip}`);
  console.log(`🏗️  Tipo: ${propertyData.property_details.type || 'N/A'}`);
  console.log(`📐 Área: ${propertyData.property_details.square_footage || 'N/A'} sqft`);
  console.log(`🏢 Propietario: ${propertyData.owner.name || 'N/A'}`);
  console.log(`🌊 Zona de Inundación: ${propertyData.property_details.flood_zone || 'N/A'}`);
  console.log(`🔢 Parcel ID: ${propertyData.property_details.parcel_id || 'N/A'}`);

  // Guardar consolidación final
  const outputPath = path.join(__dirname, 'Documents', '11127-Kimberly-Ave', 'property-complete-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(propertyData, null, 2));

  console.log('\n\n' + '═'.repeat(80));
  console.log(`✅ Información consolidada guardada en: ${outputPath}`);
  console.log('═'.repeat(80) + '\n');

  return propertyData;
}

// Ejecutar
if (require.main === module) {
  consolidatePropertyData();
}

module.exports = consolidatePropertyData;
