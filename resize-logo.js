const fs = require('fs');
const path = require('path');

// Check if sharp is available, otherwise use simple copy
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not available, copying logo as-is for all sizes');
}

const logoPath = path.join(__dirname, 'frontend/public/logo.png');
const sizes = [
  { size: 192, output: 'logo192.png' },
  { size: 512, output: 'logo512.png' }
];

async function resizeLogos() {
  if (sharp) {
    console.log('Resizing logos with Sharp...');
    for (const { size, output } of sizes) {
      const outputPath = path.join(__dirname, 'frontend/public', output);
      await sharp(logoPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(outputPath);
      console.log(`✅ Created ${output} (${size}x${size})`);
    }
  } else {
    console.log('Copying logo to different sizes...');
    for (const { output } of sizes) {
      const outputPath = path.join(__dirname, 'frontend/public', output);
      fs.copyFileSync(logoPath, outputPath);
      console.log(`✅ Copied to ${output}`);
    }
  }
  console.log('Done!');
}

resizeLogos().catch(console.error);
