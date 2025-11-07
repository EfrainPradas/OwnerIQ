/**
 * Ejemplo de Uso del Pipeline de IA
 *
 * Este script demuestra cómo usar el pipeline completo
 * para procesar documentos inmobiliarios.
 */

// Cargar variables de entorno desde backend/.env
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const DocumentPipeline = require('./index');
const path = require('path');

async function main() {
  console.log('🚀 Iniciando Pipeline de IA para Documentos\n');

  // Crear instancia del pipeline
  const pipeline = new DocumentPipeline();

  // Ruta al documento de ejemplo
  const documentPath = path.join(__dirname, '..', '..', 'Documents',
    'Closing Docs - Kissimmee Luxury Vacations (131 Redwood Track - 10004353).pdf'
  );

  console.log('📄 Procesando documento:', documentPath);
  console.log('⏳ Esto puede tomar 30-60 segundos...\n');

  try {
    // Procesar documento
    const result = await pipeline.process(documentPath, {
      metadata: {
        uploaded_by: 'example_user',
        source: 'manual_upload',
      }
    });

    // Mostrar resultados
    console.log('✅ Procesamiento completado!\n');
    console.log('═'.repeat(80));
    console.log('📊 RESULTADOS DEL PIPELINE');
    console.log('═'.repeat(80));
    
    console.log('\n🏷️  CLASIFICACIÓN:');
    console.log(`   Tipo: ${result.document_type}`);
    console.log(`   Confianza: ${(result.classification_confidence * 100).toFixed(1)}%`);
    console.log(`   Razonamiento: ${result.metadata.classification_reasoning}`);

    console.log('\n📋 EXTRACCIÓN:');
    console.log(`   Campos extraídos: ${Object.keys(result.extracted_data).length}`);
    console.log(`   Confianza promedio: ${(result.extraction_confidence * 100).toFixed(1)}%`);
    
    console.log('\n   Campos principales:');
    Object.entries(result.extracted_data).slice(0, 10).forEach(([field, data]) => {
      console.log(`   - ${field}: ${data.value} (${(data.confidence * 100).toFixed(0)}%)`);
    });

    console.log('\n📄 DOCUMENTO:');
    console.log(`   Páginas: ${result.pages.length}`);
    console.log(`   Tamaño: ${(result.source.file_size / 1024).toFixed(1)} KB`);
    console.log(`   Hash: ${result.source.file_hash.substring(0, 16)}...`);

    console.log('\n⚙️  PROCESAMIENTO:');
    console.log(`   Duración: ${(result.processing.duration_ms / 1000).toFixed(1)}s`);
    console.log(`   Tokens usados: ${result.processing.ai_tokens_used.toLocaleString()}`);
    console.log(`   Modelo: ${result.processing.ai_model}`);

    console.log('\n✓  VALIDACIÓN:');
    console.log(`   Estado: ${result.validation.is_valid ? '✅ Válido' : '❌ Inválido'}`);
    console.log(`   Errores: ${result.validation.errors.length}`);
    console.log(`   Advertencias: ${result.validation.warnings.length}`);

    if (result.validation.warnings.length > 0) {
      console.log('\n   Advertencias:');
      result.validation.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning.field}: ${warning.message}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💾 JSON completo guardado en: backend/ai-pipeline/cache/');
    console.log('═'.repeat(80) + '\n');

    // Guardar resultado completo
    const fs = require('fs');
    const outputPath = path.join(__dirname, 'cache', `${result.document_id}.json`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ Resultado guardado en: ${outputPath}\n`);

    // Mostrar ejemplo de cómo usar los datos
    console.log('💡 EJEMPLO DE USO DE LOS DATOS:\n');
    console.log('```javascript');
    console.log('// Acceder a campos específicos');
    console.log(`const loanNumber = result.extracted_data.loan_number?.value;`);
    console.log(`const loanAmount = result.extracted_data.loan_amount?.value;`);
    console.log(`const propertyAddress = result.extracted_data.property_address?.value;`);
    console.log('');
    console.log('// Verificar confianza');
    console.log(`if (result.extracted_data.loan_number?.confidence > 0.9) {`);
    console.log(`  console.log('Alta confianza en loan_number');`);
    console.log(`}`);
    console.log('');
    console.log('// Guardar en base de datos');
    console.log(`await saveToDatabase(result);`);
    console.log('```\n');

  } catch (error) {
    console.error('❌ Error procesando documento:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;