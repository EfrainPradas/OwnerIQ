#!/usr/bin/env node
/**
 * Script para ELIMINAR COMPLETAMENTE un usuario por EMAIL
 * Incluye: auth.users + profiles + datos + STORAGE FILES
 * 
 * Uso:
 *   node delete-user-by-email.js efrain.pradas@gmail.com
 *   node delete-user-by-email.js test@example.com --dry-run
 *   node delete-user-by-email.js test@example.com --yes
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const targetEmail = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');
const skipConfirm = process.argv.includes('--yes');

if (!targetEmail || targetEmail.startsWith('--')) {
    console.log('\n💀 Delete User by Email\n');
    console.log('Usage:');
    console.log('  node delete-user-by-email.js EMAIL');
    console.log('  node delete-user-by-email.js EMAIL --dry-run');
    console.log('  node delete-user-by-email.js EMAIL --yes\n');
    console.log('Examples:');
    console.log('  node delete-user-by-email.js test@example.com');
    console.log('  node delete-user-by-email.js test@example.com --dry-run\n');
    process.exit(1);
}

async function deleteUserCompletely(email) {
    try {
        console.log(`\n🔍 Buscando usuario: ${email}\n`);

        // 1. Get user from auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const user = users.find(u => u.email === email);
        if (!user) {
            console.error(`❌ No se encontró usuario con email: ${email}`);
            process.exit(1);
        }

        const userId = user.id;
        console.log(`✅ Usuario encontrado: ${userId.substring(0, 8)}...`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');

        // 2. Count data
        console.log('📊 Contando datos...\n');

        const { count: eventCount } = await supabase
            .from('onboarding_event_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const { data: batches } = await supabase
            .from('import_batches')
            .select('batch_id')
            .eq('user_id', userId);

        const batchIds = batches?.map(b => b.batch_id) || [];

        let uploadCount = 0;
        if (batchIds.length > 0) {
            const { count } = await supabase
                .from('document_uploads')
                .select('*', { count: 'exact', head: true })
                .in('batch_id', batchIds);
            uploadCount = count || 0;
        }

        // Count files in Storage
        const { data: storageFiles, error: storageListError } = await supabase
            .storage
            .from('property-documents')
            .list(userId, {
                limit: 1000,
                offset: 0
            });

        const fileCount = storageFiles?.length || 0;

        console.log(`   Event Logs: ${eventCount || 0}`);
        console.log(`   Document Uploads: ${uploadCount}`);
        console.log(`   Import Batches: ${batchIds.length}`);
        console.log(`   Storage Files: ${fileCount}`);
        console.log('');

        if (isDryRun) {
            console.log('🧪 DRY RUN - No se eliminará nada\n');
            console.log('Se eliminaría:');
            console.log(`   ❌ ${eventCount || 0} event logs`);
            console.log(`   ❌ ${uploadCount} document uploads`);
            console.log(`   ❌ ${batchIds.length} import batches`);
            console.log(`   ❌ ${fileCount} archivos en Storage`);
            console.log('   ❌ Profile');
            console.log('   ❌ Usuario de auth.users\n');
            return;
        }

        // 3. Confirmation
        if (!skipConfirm) {
            console.log('⚠️⚠️⚠️ ADVERTENCIA ⚠️⚠️⚠️\n');
            console.log('Esta acción es IRREVERSIBLE y eliminará:');
            console.log(`  • Usuario: ${email}`);
            console.log(`  • Profile completo`);
            console.log(`  • ${eventCount || 0} event logs`);
            console.log(`  • ${uploadCount} document uploads`);
            console.log(`  • ${batchIds.length} import batches`);
            console.log(`  • ${fileCount} archivos en Storage`);
            console.log('');

            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                readline.question('¿Continuar? Escribe "DELETE" para confirmar: ', resolve);
            });
            readline.close();

            if (answer !== 'DELETE') {
                console.log('\n❌ Operación cancelada\n');
                process.exit(0);
            }
        }

        console.log('\n🗑️ Eliminando datos...\n');

        // 4. Delete event logs
        if (eventCount > 0) {
            await supabase
                .from('onboarding_event_log')
                .delete()
                .eq('user_id', userId);
            console.log(`✅ ${eventCount} event logs eliminados`);
        }

        // 5. Delete document uploads
        if (uploadCount > 0) {
            await supabase
                .from('document_uploads')
                .delete()
                .in('batch_id', batchIds);
            console.log(`✅ ${uploadCount} document uploads eliminados`);
        }

        // 6. Delete batches
        if (batchIds.length > 0) {
            await supabase
                .from('import_batches')
                .delete()
                .eq('user_id', userId);
            console.log(`✅ ${batchIds.length} import batches eliminados`);
        }

        // 7. Delete Storage files recursively
        if (fileCount > 0) {
            // List all folders and files for this user
            const { data: folders } = await supabase
                .storage
                .from('property-documents')
                .list(userId);

            if (folders && folders.length > 0) {
                for (const folder of folders) {
                    // List files in each folder
                    const { data: files } = await supabase
                        .storage
                        .from('property-documents')
                        .list(`${userId}/${folder.name}`);

                    if (files && files.length > 0) {
                        const filePaths = files.map(f => `${userId}/${folder.name}/${f.name}`);

                        const { error: deleteFilesError } = await supabase
                            .storage
                            .from('property-documents')
                            .remove(filePaths);

                        if (deleteFilesError) {
                            console.warn(`⚠️ Error eliminando archivos en ${folder.name}:`, deleteFilesError.message);
                        }
                    }
                }
            }

            // Remove empty folders
            const { error: removeFolderError } = await supabase
                .storage
                .from('property-documents')
                .remove([`${userId}/.emptyFolderPlaceholder`]);

            console.log(`✅ ${fileCount} archivos eliminados de Storage`);
        }

        // 8. Delete profile
        await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);
        console.log('✅ Profile eliminado');

        // 9. Delete user from auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
            console.warn('⚠️ Error eliminando de auth.users:', authError.message);
            console.log('   Intentando con SQL directo...');

            // Fallback: try direct SQL delete
            const { error: sqlError } = await supabase
                .from('auth.users')
                .delete()
                .eq('id', userId);

            if (sqlError) {
                throw new Error(`No se pudo eliminar usuario de auth: ${sqlError.message}`);
            }
        }
        console.log('✅ Usuario eliminado de auth.users');

        console.log('\n🎉 Usuario completamente eliminado!\n');
        console.log(`📧 Email eliminado: ${email}`);
        console.log(`🆔 User ID eliminado: ${userId.substring(0, 8)}...\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nDetalles:', error);
        process.exit(1);
    }
}

deleteUserCompletely(targetEmail);
