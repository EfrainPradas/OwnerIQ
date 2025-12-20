#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing remaining Supabase v1.x compatibility issues...\n');

const filesToFix = [
  '/home/efraiprada/projects/OwnerIQ/frontend/src/components/Auth/ComprehensiveOnboarding.js',
  '/home/efraiprada/projects/OwnerIQ/frontend/src/components/Auth/Onboarding.js',
  '/home/efraiprada/projects/OwnerIQ/frontend/src/components/Auth/LoginScreen.js'
];

let totalFixes = 0;

filesToFix.forEach(filePath => {
  try {
    console.log(`\n📝 Processing: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Fix 1: signInWithPassword -> signIn
    const signInMatches = content.match(/signInWithPassword/g);
    if (signInMatches) {
      content = content.replace(/signInWithPassword/g, 'signIn');
      console.log(`✅ Fixed ${signInMatches.length} signInWithPassword -> signIn calls`);
      totalFixes += signInMatches.length;
    }

    // Fix 2: Fix subscription.unsubscribe() issues - check if subscription is valid first
    const unsubscribeMatches = content.match(/subscription\.unsubscribe\(\)/g);
    if (unsubscribeMatches) {
      // Add safety check before unsubscribe
      content = content.replace(
        /return \(\) => subscription\.unsubscribe\(\);/g,
        'return () => { if (subscription && subscription.unsubscribe) { subscription.unsubscribe(); } };'
      );
      console.log(`✅ Added safety checks to ${unsubscribeMatches.length} unsubscribe() calls`);
      totalFixes += unsubscribeMatches.length;
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`💾 Saved changes to ${path.basename(filePath)}`);
    } else {
      console.log(`ℹ️  No changes needed for ${path.basename(filePath)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Complete! Fixed ${totalFixes} Supabase v1.x compatibility issues.`);
console.log('\n📋 Summary:');
filesToFix.forEach(filePath => {
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${path.basename(filePath)}`);
});