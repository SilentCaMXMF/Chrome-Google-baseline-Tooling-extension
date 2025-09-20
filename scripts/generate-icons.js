const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const sizes = [16, 48, 128];
const inputSvg = path.join(__dirname, '../icons/icon.svg');
const outputDir = path.join(__dirname, '../icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    // Convert SVG to PNGs of different sizes
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon${size}.png`);
      
      // Skip if file already exists
      if (fs.existsSync(outputFile)) {
        console.log(`Skipping ${outputFile} - already exists`);
        continue;
      }
      
      // Create canvas and load SVG
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Load and draw the SVG
      const img = await loadImage(inputSvg);
      ctx.drawImage(img, 0, 0, size, size);
      
      // Save as PNG
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputFile, buffer);
      console.log(`Generated ${outputFile}`);
    }
    
    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
