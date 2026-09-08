import sharp from "sharp";

async function gen(size, out) {
  const svg = `<svg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'>
    <rect width='${size}' height='${size}' rx='${size * 0.22}' fill='#17654a'/>
    <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='${size * 0.55}' fill='white' font-weight='700'>م</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("made", out);
}

await gen(192, "public/icon-192.png");
await gen(512, "public/icon-512.png");
await gen(180, "public/apple-touch-icon.png");
await gen(32, "public/favicon-32.png");

const svgMask = `<svg width='512' height='512' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>
  <rect width='512' height='512' rx='112' fill='#17654a'/>
  <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='280' fill='white' font-weight='700'>م</text>
</svg>`;
await sharp(Buffer.from(svgMask)).png().toFile("public/icon-512-maskable.png");
console.log("done");
