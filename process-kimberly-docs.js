/**
 * Script para procesar documentos de la propiedad 11127 Kimberly Ave
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });

const DocumentPipeline = require('./backend/ai-pipeline/index');
const path = require('path');
const fs = require('fs');

async function processDocument(pipeline, documentPath, documentName) {
  console.log('\n' + '═'.repeat(80));
  console.log(`📄 Procesando: ${documentName}`);
  console.log('═'.repeat(80));
  console.log('⏳ Esto puede tomar 30-60 segundos...\n');

  try {
    const result = await pipeline.process(documentPath, {
      metadata: {
        uploaded_by: 'system',
        source: 'bulk_upload',
        property_address: '11127 Kimberly Ave'
      }
    });

    console.log('✅ Procesamiento completado!\n');
    console.log('🏷️  CLASIFICACIÓN:');
    console.log(`   Tipo: ${result.document_type}`);
    console.log(`   Confianza: ${(result.classification_confidence * 100).toFixed(1)}%`);

    console.log('\n📋 EXTRACCIÓN:');
    console.log(`   Campos extraídos: ${Object.keys(result.extracted_data).length}`);
    console.log(`   Confianza promedio: ${(result.extraction_confidence * 100).toFixed(1)}%`);

    console.log('\n   Campos principales:');
    Object.entries(result.extracted_data).slice(0, 15).forEach(([field, data]) => {
      console.log(`   - ${field}: ${data.value} (${(data.confidence * 100).toFixed(0)}%)`);
    });

    console.log('\n✓  VALIDACIÓN:');
    console.log(`   Estado: ${result.validation.is_valid ? '✅ Válido' : '❌ Inválido'}`);
    console.log(`   Errores: ${result.validation.errors.length}`);
    console.log(`   Advertencias: ${result.validation.warnings.length}`);

    if (result.validation.warnings.length > 0) {
      console.log('\n   Advertencias:');
      result.validation.warnings.slice(0, 5).forEach(warning => {
        console.log(`   ⚠️  ${warning.field}: ${warning.message}`);
      });
    }

    // Guardar resultado
    const outputDir = path.join(__dirname, 'Documents', '11127-Kimberly-Ave', 'processed');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${result.document_id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Resultado guardado en: ${outputPath}`);

    return result;

  } catch (error) {
    console.error(`❌ Error procesando ${documentName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando procesamiento de documentos - 11127 Kimberly Ave\n');

  const pipeline = new DocumentPipeline();
  const docsDir = path.join(__dirname, 'Documents', '11127-Kimberly-Ave');

  const documents = [
    {
      file: '03.31.25 Signed ALTA - 11127 Kimberly Ave.pdf',
      name: 'ALTA Closing Statement'
    },
    {
      file: '03.25.25 HOI Quote 11127 Kimberly-Florida Peninsula.pdf',
      name: 'Home Owner Insurance Quote'
    },
    {
      file: '12.05.24 AMEX CC 61008-Payment 2024 PT Charlotte-11127 Kimberly.pdf',
      name: 'Tax Payment'
    },
    {
      file: '07.23.25 11127 kimberly CO.pdf',
      name: 'Certificate of Occupancy'
    }
  ];

  const results = [];

  for (const doc of documents) {
    const docPath = path.join(docsDir, doc.file);
    const result = await processDocument(pipeline, docPath, doc.name);
    if (result) {
      results.push({ name: doc.name, result });
    }
    // Pausa entre documentos para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Consolidar información
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 CONSOLIDACIÓN DE INFORMACIÓN DE LA PROPIEDAD');
  console.log('═'.repeat(80));

  const propertyData = {
    address: '11127 Kimberly Ave',
    extracted_from: []
  };

  results.forEach(({ name, result }) => {
    console.log(`\n📄 ${name}:`);
    const data = result.extracted_data;

    if (data.property_address) {
      console.log(`   Dirección: ${data.property_address.value}`);
      propertyData.property_address = data.property_address.value;
    }
    if (data.purchase_price || data.sale_price) {
      const price = data.purchase_price || data.sale_price;
      console.log(`   Precio: $${parseFloat(price.value).toLocaleString()}`);
      propertyData.purchase_price = price.value;
    }
    if (data.loan_amount) {
      console.log(`   Préstamo: $${parseFloat(data.loan_amount.value).toLocaleString()}`);
      propertyData.loan_amount = data.loan_amount.value;
    }
    if (data.annual_premium || data.premium_amount) {
      const premium = data.annual_premium || data.premium_amount;
      console.log(`   Seguro anual: $${parseFloat(premium.value).toLocaleString()}`);
      propertyData.insurance_annual = premium.value;
    }
    if (data.property_taxes || data.tax_amount) {
      const taxes = data.property_taxes || data.tax_amount;
      console.log(`   Impuestos: $${parseFloat(taxes.value).toLocaleString()}`);
      propertyData.property_taxes = taxes.value;
    }
    if (data.closing_date || data.settlement_date) {
      const date = data.closing_date || data.settlement_date;
      console.log(`   Fecha: ${date.value}`);
      propertyData.closing_date = date.value;
    }

    propertyData.extracted_from.push({
      document_type: result.document_type,
      document_name: name,
      all_fields: Object.keys(data)
    });
  });

  // Guardar consolidación
  const consolidatedPath = path.join(__dirname, 'Documents', '11127-Kimberly-Ave', 'property-data-consolidated.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify(propertyData, null, 2));

  console.log('\n\n' + '═'.repeat(80));
  console.log('✅ PROCESAMIENTO COMPLETADO');
  console.log('═'.repeat(80));
  console.log(`📄 Documentos procesados: ${results.length}`);
  console.log(`💾 Datos consolidados: ${consolidatedPath}`);
  console.log('═'.repeat(80) + '\n');
}

// Ejecutar
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
