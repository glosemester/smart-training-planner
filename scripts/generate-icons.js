/**
 * Generate PWA Icons Script
 * Creates 192x192 and 512x512 PNG icons for PWA
 *
 * Usage: node scripts/generate-icons.js
 *
 * Note: Requires canvas package. Install with: npm install canvas
 * OR use online tools like https://realfavicongenerator.net/
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is available
let Canvas;
try {
  Canvas = require('canvas');
} catch (err) {
  console.log('❌ Canvas package not installed.');
  console.log('');
  console.log('📋 To generate icons automatically, install canvas:');
  console.log('   npm install canvas');
  console.log('');
  console.log('🌐 Or use an online tool:');
  console.log('   1. Go to https://realfavicongenerator.net/');
  console.log('   2. Upload public/icon.svg');
  console.log('   3. Download and extract to public/ folder');
  console.log('');
  console.log('📁 Required files:');
  console.log('   - public/pwa-192x192.png');
  console.log('   - public/pwa-512x512.png');
  console.log('   - public/favicon.ico');
  console.log('   - public/masked-icon.svg');
  process.exit(1);
}

const { createCanvas } = Canvas;

// Icon configuration
const ICONS = [
  { size: 192, filename: 'pwa-192x192.png' },
  { size: 512, filename: 'pwa-512x512.png' }
];

const COLORS = {
  background: '#060606',
  primary: '#B9E43C',
  foreground: '#060606'
};

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);

  // Rounded rectangle for badge
  const badgeSize = size * 0.6;
  const badgeX = (size - badgeSize) / 2;
  const badgeY = (size - badgeSize) / 2;
  const radius = badgeSize * 0.2;

  ctx.fillStyle = COLORS.primary;
  ctx.beginPath();
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeSize - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeSize, badgeY, badgeX + badgeSize, badgeY + radius);
  ctx.lineTo(badgeX + badgeSize, badgeY + badgeSize - radius);
  ctx.quadraticCurveTo(badgeX + badgeSize, badgeY + badgeSize, badgeX + badgeSize - radius, badgeY + badgeSize);
  ctx.lineTo(badgeX + radius, badgeY + badgeSize);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeSize, badgeX, badgeY + badgeSize - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fill();

  // RC Text
  const fontSize = size * 0.3;
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RC', size / 2, size / 2);

  // Save
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Generated ${filename} (${size}x${size})`);
}

function generateFavicon() {
  // Generate 32x32 favicon
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, 32, 32);

  // Badge
  const badgeSize = 20;
  const badgeX = 6;
  const badgeY = 6;
  const radius = 4;

  ctx.fillStyle = COLORS.primary;
  ctx.beginPath();
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeSize - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeSize, badgeY, badgeX + badgeSize, badgeY + radius);
  ctx.lineTo(badgeX + badgeSize, badgeY + badgeSize - radius);
  ctx.quadraticCurveTo(badgeX + badgeSize, badgeY + badgeSize, badgeX + badgeSize - radius, badgeY + badgeSize);
  ctx.lineTo(badgeX + radius, badgeY + badgeSize);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeSize, badgeX, badgeY + badgeSize - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fill();

  // RC Text (smaller)
  ctx.fillStyle = COLORS.foreground;
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RC', 16, 16);

  // Save as PNG first (ICO generation requires additional library)
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Generated favicon-32x32.png');
  console.log('⚠️  Convert to .ico using: https://convertio.co/png-ico/');
}

// Generate all icons
console.log('🎨 Generating PWA icons...\n');

try {
  ICONS.forEach(({ size, filename }) => generateIcon(size, filename));
  generateFavicon();

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Convert favicon-32x32.png to favicon.ico');
  console.log('   2. Create masked-icon.svg for Safari (or use icon.svg)');
  console.log('   3. Test PWA install on mobile device');
} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  process.exit(1);
}
