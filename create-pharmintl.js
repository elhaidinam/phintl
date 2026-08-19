import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Construct high quality vector SVG of Pharmintl cross with smiling face
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <style>
      .cross-fill { fill: #86ea38; stroke: #1b4814; stroke-width: 12; stroke-linejoin: round; stroke-linecap: round; }
      .face-line { fill: none; stroke: #1b4814; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
      .eye-white { fill: #fcfde8; stroke: #1b4814; stroke-width: 5; }
      .eye-pupil { fill: #22511a; }
      .mouth-fill { fill: #fcfde8; stroke: #1b4814; stroke-width: 6; stroke-linejoin: round; stroke-linecap: round; }
    </style>
  </defs>

  <!-- Pharmacy Cross Path -->
  <path class="cross-fill" d="
    M 160,10 
    L 340,10 
    L 340,160 
    L 490,160 
    L 490,340 
    L 340,340 
    L 340,490 
    L 160,490 
    L 160,340 
    L 10,340 
    L 10,160 
    L 160,160 
    Z
  " />

  <!-- Eyebrows / Lid lines -->
  <path class="face-line" d="M 190,218 C 182,190 215,182 226,202" />
  <path class="face-line" d="M 272,202 C 285,182 318,190 310,218" />

  <!-- Left Eye -->
  <ellipse class="eye-white" cx="210" cy="200" rx="16" ry="28" />
  <ellipse class="eye-pupil" cx="212" cy="208" rx="10" ry="16" />
  <ellipse fill="#ffffff" cx="208" cy="196" rx="3" ry="5" />

  <!-- Right Eye -->
  <ellipse class="eye-white" cx="288" cy="200" rx="16" ry="28" />
  <ellipse class="eye-pupil" cx="286" cy="208" rx="10" ry="16" />
  <ellipse fill="#ffffff" cx="284" cy="196" rx="3" ry="5" />

  <!-- Nose -->
  <path class="face-line" d="M 246,218 Q 230,250 238,268 Q 248,278 260,268" />

  <!-- Smiling Mouth -->
  <path class="mouth-fill" d="
    M 172,282 
    Q 250,305 328,282 
    Q 250,358 172,282 
    Z
  " />

  <!-- Smile corner accents -->
  <path class="face-line" d="M 170,270 Q 172,282 178,294" />
  <path class="face-line" d="M 330,270 Q 328,282 322,294" />

</svg>`;

async function generateLogo() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'Pharmintl.svg'), svgContent);

  // Convert SVG to PNG with transparent background
  const pngBuffer = await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'Pharmintl.png'), pngBuffer);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), pngBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngBuffer);

  console.log('Pharmintl.png and logo generated successfully with transparent background!');
}

generateLogo().catch(console.error);
