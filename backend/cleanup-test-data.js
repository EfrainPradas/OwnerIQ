#!/usr/bin/env node
/**
 * Script de limpieza de datos de prueba
 * 
 * Uso:
 *   node cleanup-test-data.js --email test@example.com
 *   node cleanup-test-data.js --user-id abc123...
 *   node cleanup-test-data.js --all-old (borra datos >7 días)
 *   node cleanup-test-data.js --errors-only --email test@example.com
 * 
 * Flags:
 *   --dry-run: Muestra qué se borraría sin borrar nada
 *   --yes: Salta confirmación
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    email: args.find(a => a.startsWith('--email='))?.split('=')[1],
    userId: args.find(a => a.startsWith('--user-id='))?.split('=')[1],
    allOld: args.includes('--all-old'),
    errorsOnly: args.includes('--errors-only'),
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes')
};

async function getUserIdFromEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error fetching users:', error.message);
        return null;
    }

    const user = data.users.find(u => u.email === email);
    return user?.id || null;
}

async function countRecords(userId) {
    const counts = {};

    // Count event logs
    const { count: eventCount } = await supabase
        .from('onboarding_event_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    counts.events = eventCount || 0;

    // Count batches
    const { data: batches } = await supabase
        .from('import_batches')
        .select('batch_id')
        .eq('user_id', userId);
    counts.batches = batches?.length || 0;

    const batchIds = batches?.map(b => b.batch_id) || [];

    // Count uploads
    let uploadCount = 0;
    if (batchIds.length > 0) {
        const { count } = await supabase
            .from('document_uploads')
            .select('*', { count: 'exact', head: true })
            .in('batch_id', batchIds);
        uploadCount = count || 0;
    }
    counts.uploads = uploadCount;

    return counts;
}

async function cleanupByUser(userId, options = {}) {
    const { dryRun = false, errorsOnly = false } = options;

    console.log(`\n🔍 Analizando datos para user_id: ${userId.substring(0, 8)}...\n`);

    const counts = await countRecords(userId);

    console.log('📊 Registros encontrados:');
    console.log(`   Event Logs: ${counts.events}`);
    console.log(`   Document Uploads: ${counts.uploads}`);
    console.log(`   Import Batches: ${counts.batches}`);
    console.log('');

    if (counts.events === 0 && counts.uploads === 0 && counts.batches === 0) {
        console.log('✅ No hay datos para limpiar');
        return;
    }

    if (dryRun) {
        console.log('🧪 DRY RUN: No se borrará nada (usa sin --dry-run para borrar)');
        return;
    }

    // Get batches for this user
    const { data: batches } = await supabase
        .from('import_batches')
        .select('batch_id')
        .eq('user_id', userId);

    const batchIds = batches?.map(b => b.batch_id) || [];

    let deletedEvents = 0;
    let deletedUploads = 0;
    let deletedBatches = 0;

    try {
        // Delete event logs
        if (errorsOnly) {
            const { error: eventError } = await supabase
                .from('onboarding_event_log')
                .delete()
                .eq('user_id', userId)
                .eq('event_category', 'error');

            if (eventError) throw eventError;
            console.log('✅ Error logs borrados');
        } else {
            const { error: eventError } = await supabase
                .from('onboarding_event_log')
                .delete()
                .eq('user_id', userId);

            if (eventError) throw eventError;
            deletedEvents = counts.events;
            console.log(`✅ ${deletedEvents} event logs borrados`);
        }

        if (!errorsOnly) {
            // Delete document uploads
            if (batchIds.length > 0) {
                const { error: uploadError } = await supabase
                    .from('document_uploads')
                    .delete()
                    .in('batch_id', batchIds);

                if (uploadError) throw uploadError;
                deletedUploads = counts.uploads;
                console.log(`✅ ${deletedUploads} document uploads borrados`);
            }

            // Delete batches
            const { error: batchError } = await supabase
                .from('import_batches')
                .delete()
                .eq('user_id', userId);

            if (batchError) throw batchError;
            deletedBatches = counts.batches;
            console.log(`✅ ${deletedBatches} import batches borrados`);

            // Reset profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    onboarding_status: 'NOT_STARTED',
                    current_onboarding_step: 1,
                    onboarding_completed_at: null
                })
                .eq('user_id', userId);

            if (profileError) console.warn('⚠️ No se pudo resetear el profile:', profileError.message);
            else console.log('✅ Profile reseteado');
        }

        console.log('\n🎉 Limpieza completada exitosamente!');
        console.log('\n⚠️ RECORDATORIO: Los archivos en Storage NO se borran automáticamente.');
        console.log(`   Ve a Supabase Dashboard > Storage > property-documents/${userId.substring(0, 8)}...`);

    } catch (error) {
        console.error('\n❌ Error durante la limpieza:', error.message);
        process.exit(1);
    }
}

async function cleanupOldData(days = 7) {
    console.log(`\n🔍 Buscando datos antiguos (>${days} días)...\n`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffISO = cutoffDate.toISOString();

    const { count: eventCount } = await supabase
        .from('onboarding_event_log')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);

    const { count: uploadCount } = await supabase
        .from('document_uploads')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);

    const { count: batchCount } = await supabase
        .from('import_batches')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);

    console.log('📊 Registros antiguos encontrados:');
    console.log(`   Event Logs: ${eventCount || 0}`);
    console.log(`   Document Uploads: ${uploadCount || 0}`);
    console.log(`   Import Batches: ${batchCount || 0}`);
    console.log('');

    if (!eventCount && !uploadCount && !batchCount) {
        console.log('✅ No hay datos antiguos para limpiar');
        return;
    }

    if (flags.dryRun) {
        console.log('🧪 DRY RUN: No se borrará nada');
        return;
    }

    try {
        await supabase.from('onboarding_event_log').delete().lt('created_at', cutoffISO);
        await supabase.from('document_uploads').delete().lt('created_at', cutoffISO);
        await supabase.from('import_batches').delete().lt('created_at', cutoffISO);

        console.log('✅ Datos antiguos borrados exitosamente');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function confirm(question) {
    if (flags.yes) return true;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`${question} (yes/no): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

async function main() {
    console.log('\n🧹 Script de Limpieza de Datos de Prueba\n');

    if (!flags.email && !flags.userId && !flags.allOld) {
        console.log('❌ Debes especificar --email, --user-id, o --all-old\n');
        console.log('Ejemplos:');
        console.log('  node cleanup-test-data.js --email=test@example.com');
        console.log('  node cleanup-test-data.js --user-id=abc123...');
        console.log('  node cleanup-test-data.js --all-old');
        console.log('  node cleanup-test-data.js --email=test@example.com --errors-only');
        console.log('  node cleanup-test-data.js --email=test@example.com --dry-run');
        console.log('');
        process.exit(1);
    }

    let userId;

    if (flags.email) {
        console.log(`🔍 Buscando usuario con email: ${flags.email}\n`);
        userId = await getUserIdFromEmail(flags.email);

        if (!userId) {
            console.error(`❌ No se encontró usuario con email: ${flags.email}`);
            process.exit(1);
        }

        console.log(`✅ Usuario encontrado: ${userId.substring(0, 8)}...\n`);
    } else if (flags.userId) {
        userId = flags.userId;
    }

    if (userId) {
        const confirmed = await confirm(
            `⚠️ ¿Estás seguro de que quieres ${flags.errorsOnly ? 'borrar los errores' : 'BORRAR TODOS LOS DATOS'} de este usuario?`
        );

        if (!confirmed) {
            console.log('❌ Operación cancelada');
            process.exit(0);
        }

        await cleanupByUser(userId, {
            dryRun: flags.dryRun,
            errorsOnly: flags.errorsOnly
        });
    } else if (flags.allOld) {
        const confirmed = await confirm(
            '⚠️ ¿Estás seguro de que quieres borrar TODOS los datos antiguos (>7 días)?'
        );

        if (!confirmed) {
            console.log('❌ Operación cancelada');
            process.exit(0);
        }

        await cleanupOldData(7);
    }
}

main().catch(console.error);
