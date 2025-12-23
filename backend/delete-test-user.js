#!/usr/bin/env node
/**
 * Script para ELIMINAR COMPLETAMENTE un usuario de prueba
 * 
 * ⚠️ ADVERTENCIA: Esto BORRA PERMANENTEMENTE:
 * - Usuario de auth.users
 * - Profile de profiles
 * - Event logs
 * - Document uploads
 * - Import batches
 * - Todos los datos relacionados
 * 
 * Uso:
 *   node delete-test-user.js --email=test@example.com
 *   node delete-test-user.js --email=test@example.com --yes (sin confirmación)
 *   node delete-test-user.js --email=test@example.com --dry-run (preview)
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
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes')
};

async function getUserByEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error fetching users:', error.message);
        return null;
    }

    const user = data.users.find(u => u.email === email);
    return user || null;
}

async function countUserData(userId) {
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

    // Check profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('owner_name, onboarding_status')
        .eq('user_id', userId)
        .single();
    counts.hasProfile = !!profile;
    counts.profileData = profile;

    return counts;
}

async function deleteUserCompletely(user, dryRun = false) {
    const userId = user.id;
    const email = user.email;

    console.log(`\n🔍 Analizando usuario: ${email}\n`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
    console.log('');

    const counts = await countUserData(userId);

    console.log('📊 Datos del usuario:');
    console.log(`   Profile: ${counts.hasProfile ? '✅ Existe' : '❌ No existe'}`);
    if (counts.profileData) {
        console.log(`     - Name: ${counts.profileData.owner_name || 'N/A'}`);
        console.log(`     - Onboarding: ${counts.profileData.onboarding_status || 'N/A'}`);
    }
    console.log(`   Event Logs: ${counts.events}`);
    console.log(`   Document Uploads: ${counts.uploads}`);
    console.log(`   Import Batches: ${counts.batches}`);
    console.log('');

    if (dryRun) {
        console.log('🧪 DRY RUN: No se eliminará nada (usa sin --dry-run para eliminar)\n');
        console.log('📝 Se eliminaría:');
        console.log('   ❌ Usuario de auth.users');
        console.log('   ❌ Profile de profiles');
        console.log(`   ❌ ${counts.events} event logs`);
        console.log(`   ❌ ${counts.uploads} document uploads`);
        console.log(`   ❌ ${counts.batches} import batches`);
        console.log('   ⚠️ Archivos en Storage (manual)');
        return;
    }

    try {
        // Get batches for cascade delete
        const { data: batches } = await supabase
            .from('import_batches')
            .select('batch_id')
            .eq('user_id', userId);

        const batchIds = batches?.map(b => b.batch_id) || [];

        console.log('🗑️ Eliminando datos del usuario...\n');

        // 1. Delete event logs
        if (counts.events > 0) {
            const { error: eventError } = await supabase
                .from('onboarding_event_log')
                .delete()
                .eq('user_id', userId);

            if (eventError) throw new Error(`Event logs: ${eventError.message}`);
            console.log(`✅ ${counts.events} event logs eliminados`);
        }

        // 2. Delete document uploads
        if (batchIds.length > 0 && counts.uploads > 0) {
            const { error: uploadError } = await supabase
                .from('document_uploads')
                .delete()
                .in('batch_id', batchIds);

            if (uploadError) throw new Error(`Document uploads: ${uploadError.message}`);
            console.log(`✅ ${counts.uploads} document uploads eliminados`);
        }

        // 3. Delete batches
        if (counts.batches > 0) {
            const { error: batchError } = await supabase
                .from('import_batches')
                .delete()
                .eq('user_id', userId);

            if (batchError) throw new Error(`Import batches: ${batchError.message}`);
            console.log(`✅ ${counts.batches} import batches eliminados`);
        }

        // 4. Delete profile
        if (counts.hasProfile) {
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', userId);

            if (profileError) throw new Error(`Profile: ${profileError.message}`);
            console.log('✅ Profile eliminado');
        }

        // 5. Delete user from auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) throw new Error(`Auth user: ${authError.message}`);
        console.log('✅ Usuario eliminado de auth.users');

        console.log('\n🎉 Usuario completamente eliminado!\n');
        console.log('⚠️ RECORDATORIOS:');
        console.log(`   1. Archivos en Storage: Supabase Dashboard > Storage > property-documents/${userId.substring(0, 8)}...`);
        console.log('   2. Esta acción NO se puede deshacer');
        console.log('');

    } catch (error) {
        console.error('\n❌ Error durante la eliminación:', error.message);
        console.error('⚠️ Algunos datos pueden haber sido eliminados parcialmente');
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
    console.log('\n💀 Script de Eliminación COMPLETA de Usuario\n');

    if (!flags.email) {
        console.log('❌ Debes especificar --email\n');
        console.log('Ejemplos:');
        console.log('  node delete-test-user.js --email=test@example.com');
        console.log('  node delete-test-user.js --email=test@example.com --dry-run');
        console.log('  node delete-test-user.js --email=test@example.com --yes');
        console.log('');
        process.exit(1);
    }

    console.log(`🔍 Buscando usuario: ${flags.email}\n`);

    const user = await getUserByEmail(flags.email);

    if (!user) {
        console.error(`❌ No se encontró usuario con email: ${flags.email}`);
        process.exit(1);
    }

    if (!flags.dryRun) {
        console.log('⚠️⚠️⚠️ ADVERTENCIA ⚠️⚠️⚠️\n');
        console.log('Esta operación es PERMANENTE e IRREVERSIBLE.');
        console.log('Se eliminará:');
        console.log('  • Usuario de auth.users');
        console.log('  • Profile de profiles');
        console.log('  • TODOS los datos relacionados (logs, uploads, batches)');
        console.log('');

        const confirmed = await confirm(
            `¿Estás 100% SEGURO de eliminar COMPLETAMENTE a ${flags.email}?`
        );

        if (!confirmed) {
            console.log('\n❌ Operación cancelada\n');
            process.exit(0);
        }

        // Double check for safety
        const doubleCheck = await confirm(
            '⚠️ ÚLTIMA CONFIRMACIÓN: ¿Realmente quieres BORRAR este usuario PARA SIEMPRE?'
        );

        if (!doubleCheck) {
            console.log('\n❌ Operación cancelada\n');
            process.exit(0);
        }
    }

    await deleteUserCompletely(user, flags.dryRun);
}

main().catch(console.error);
