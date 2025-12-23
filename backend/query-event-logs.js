/**
 * Script de ejemplo para consultar y analizar los event logs
 * del proceso de onboarding
 * 
 * Uso: node query-event-logs.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserTimeline(userId) {
    console.log(`\n📊 Timeline for user: ${userId}\n`);

    const { data, error } = await supabase
        .from('onboarding_event_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(event => {
        const timestamp = new Date(event.created_at).toLocaleString();
        const status = event.status ? `[${event.status}]` : '';
        const doc = event.document_type ? `(${event.document_type})` : '';

        console.log(`${timestamp} | ${event.event_type} ${doc} ${status}`);

        if (event.error_message) {
            console.log(`  ❌ Error: ${event.error_message}`);
        }
    });
}

async function getBatchStatistics(batchId) {
    console.log(`\n📈 Statistics for batch: ${batchId}\n`);

    const { data, error } = await supabase
        .from('onboarding_event_log')
        .select('event_type, status, document_type, created_at')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const stats = {
        total_events: data.length,
        uploads: data.filter(e => e.event_type === 'document_uploaded').length,
        processed: data.filter(e => e.status === 'processed').length,
        failed: data.filter(e => e.status === 'failed').length,
        document_types: [...new Set(data.map(e => e.document_type).filter(Boolean))]
    };

    console.log('Summary:');
    console.log(`  Total Events: ${stats.total_events}`);
    console.log(`  Documents Uploaded: ${stats.uploads}`);
    console.log(`  Successfully Processed: ${stats.processed}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Document Types: ${stats.document_types.join(', ')}`);

    console.log('\nDetailed Timeline:');
    data.forEach(event => {
        console.log(`  ${new Date(event.created_at).toLocaleTimeString()} - ${event.event_type}`);
    });
}

async function getErrorReport() {
    console.log('\n⚠️  Error Report (Last 24 hours)\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
        .from('onboarding_event_log')
        .select('user_id, event_type, error_message, error_code, created_at')
        .eq('event_category', 'error')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('  ✅ No errors in the last 24 hours!');
        return;
    }

    data.forEach(event => {
        console.log(`[${new Date(event.created_at).toLocaleString()}]`);
        console.log(`  User: ${event.user_id.substring(0, 8)}`);
        console.log(`  Type: ${event.event_type}`);
        console.log(`  Error: ${event.error_message}`);
        console.log(`  Code: ${event.error_code || 'N/A'}`);
        console.log('');
    });
}

async function getDocumentTypeStats() {
    console.log('\n📄 Document Type Statistics\n');

    const { data, error } = await supabase
        .from('onboarding_event_log')
        .select('document_type, status')
        .in('event_type', ['document_uploaded', 'document_processed', 'document_processing_failed'])
        .not('document_type', 'is', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const stats = {};

    data.forEach(event => {
        if (!stats[event.document_type]) {
            stats[event.document_type] = {
                uploaded: 0,
                processed: 0,
                failed: 0
            };
        }

        if (event.status === 'uploaded') stats[event.document_type].uploaded++;
        if (event.status === 'processed') stats[event.document_type].processed++;
        if (event.status === 'failed') stats[event.document_type].failed++;
    });

    console.log('Document Type | Uploaded | Processed | Failed | Success Rate');
    console.log('------------- | -------- | --------- | ------ | ------------');

    Object.entries(stats).forEach(([docType, counts]) => {
        const total = counts.processed + counts.failed;
        const successRate = total > 0
            ? ((counts.processed / total) * 100).toFixed(1)
            : 'N/A';

        console.log(
            `${docType.padEnd(13)} | ${String(counts.uploaded).padStart(8)} | ` +
            `${String(counts.processed).padStart(9)} | ${String(counts.failed).padStart(6)} | ` +
            `${String(successRate).padStart(11)}%`
        );
    });
}

// ========== EJECUTAR QUERIES ==========

async function main() {
    const command = process.argv[2];
    const param = process.argv[3];

    switch (command) {
        case 'user':
            if (!param) {
                console.error('Usage: node query-event-logs.js user <user_id>');
                return;
            }
            await getUserTimeline(param);
            break;

        case 'batch':
            if (!param) {
                console.error('Usage: node query-event-logs.js batch <batch_id>');
                return;
            }
            await getBatchStatistics(param);
            break;

        case 'errors':
            await getErrorReport();
            break;

        case 'stats':
            await getDocumentTypeStats();
            break;

        default:
            console.log('📝 Event Log Query Tool\n');
            console.log('Available commands:');
            console.log('  node query-event-logs.js user <user_id>     - Show user timeline');
            console.log('  node query-event-logs.js batch <batch_id>   - Show batch statistics');
            console.log('  node query-event-logs.js errors             - Show recent errors');
            console.log('  node query-event-logs.js stats              - Show document type stats');
    }
}

main().catch(console.error);
