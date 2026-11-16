import * as THREE from 'three';

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextures {
  grassTile: THREE.CanvasTexture;
  grassNormal: THREE.DataTexture;
  woodPlank: THREE.CanvasTexture;
  cabinLog: THREE.CanvasTexture;
  treeBark: THREE.CanvasTexture;
  leafCluster: THREE.CanvasTexture;
  blossomLeafCluster: THREE.CanvasTexture;
  autumnLeafCluster: THREE.CanvasTexture;
  pineNeedle: THREE.CanvasTexture;
  fernCluster: THREE.CanvasTexture;
  flowerCluster: THREE.CanvasTexture;
  flowerTextures: THREE.CanvasTexture[];
  reedCluster: THREE.CanvasTexture;
  roofShingle: THREE.CanvasTexture;
  stoneBlock: THREE.CanvasTexture;
  hoodieFabric: THREE.CanvasTexture;
  denimFabric: THREE.CanvasTexture;
  robloxFace: THREE.CanvasTexture;
  goblinFace: THREE.CanvasTexture;
  villagerFace: THREE.CanvasTexture;
  deerCoat: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  waterRippleNormal: THREE.DataTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Rich meadow soil, clover & dry grass blades tile (512x512)
  const [gCan, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#4c782d';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 1.2 + Math.random() * 3.8;
    const h = 2.0 + Math.random() * 5.8;
    const shade = Math.random();
    gCtx.fillStyle =
      shade < 0.28
        ? 'rgba(38, 66, 22, 0.48)'
        : shade < 0.62
          ? 'rgba(98, 144, 46, 0.4)'
          : shade < 0.9
            ? 'rgba(146, 178, 66, 0.32)'
            : 'rgba(122, 98, 62, 0.24)';
    gCtx.fillRect(x, y, w, h);
  }
  const grassTile = finalizeColorTexture(gCan, maxAnisotropy, 44, 44);

  // Subtle terrain micro-bump normal map
  const nSize = 256;
  const nData = new Uint8Array(nSize * nSize * 4);
  for (let i = 0; i < nSize * nSize; i++) {
    const idx = i * 4;
    nData[idx] = 114 + Math.floor(Math.random() * 28);
    nData[idx + 1] = 114 + Math.floor(Math.random() * 28);
    nData[idx + 2] = 246;
    nData[idx + 3] = 255;
  }
  const grassNormal = new THREE.DataTexture(nData, nSize, nSize, THREE.RGBAFormat);
  grassNormal.wrapS = THREE.RepeatWrapping;
  grassNormal.wrapT = THREE.RepeatWrapping;
  grassNormal.repeat.set(44, 44);
  grassNormal.needsUpdate = true;

  // 2. Detailed Wood Plank texture with knots, bevels & iron nails (512x512)
  const [wCan, wCtx] = makeCanvas(512, 512);
  wCtx.fillStyle = '#5c3c22';
  wCtx.fillRect(0, 0, 512, 512);
  const plankCount = 8;
  const plankH = 512 / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const shift = ((p % 3) - 1) * 10;
    const grad = wCtx.createLinearGradient(0, y0, 0, y0 + plankH);
    grad.addColorStop(0, `rgb(${112 + shift}, ${76 + shift / 2}, ${48 + shift / 3})`);
    grad.addColorStop(0.5, `rgb(${96 + shift}, ${64 + shift / 2}, ${38 + shift / 3})`);
    grad.addColorStop(1, `rgb(${78 + shift}, ${50 + shift / 2}, ${29 + shift / 3})`);
    wCtx.fillStyle = grad;
    wCtx.fillRect(0, y0 + 2, 512, plankH - 4);
    for (let g = 0; g < 55; g++) {
      wCtx.strokeStyle = g % 3 === 0 ? 'rgba(32, 18, 9, 0.28)' : 'rgba(148, 108, 70, 0.14)';
      wCtx.lineWidth = 1.3;
      wCtx.beginPath();
      const gy = y0 + 6 + Math.random() * (plankH - 12);
      wCtx.moveTo(0, gy);
      wCtx.bezierCurveTo(
        170,
        gy + (Math.random() - 0.5) * 7,
        340,
        gy + (Math.random() - 0.5) * 7,
        512,
        gy,
      );
      wCtx.stroke();
    }
    // Wood knot + iron nails
    const kx = 90 + ((p * 173) % 360);
    wCtx.fillStyle = 'rgba(42, 24, 12, 0.45)';
    wCtx.beginPath();
    wCtx.ellipse(kx, y0 + plankH * 0.5, 11, 5, 0.1, 0, Math.PI * 2);
    wCtx.fill();
    for (const nx of [22, 256, 488]) {
      wCtx.fillStyle = '#24272d';
      wCtx.beginPath();
      wCtx.arc(nx + (p % 2) * 18, y0 + 14, 3, 0, Math.PI * 2);
      wCtx.arc(nx + (p % 2) * 18, y0 + plankH - 14, 3, 0, Math.PI * 2);
      wCtx.fill();
    }
    wCtx.fillStyle = '#24160b';
    wCtx.fillRect(0, y0, 512, 3);
  }
  const woodPlank = finalizeColorTexture(wCan, maxAnisotropy, 3, 3);

  // 3. Detailed cabin timber logs with chinking mortar (512x512)
  const [lCan, lCtx] = makeCanvas(512, 512);
  lCtx.fillStyle = '#33251b';
  lCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10; i++) {
    const y = i * (512 / 10);
    const h = 512 / 10;
    const grad = lCtx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#1e140e');
    grad.addColorStop(0.22, '#4c3728');
    grad.addColorStop(0.55, '#594130');
    grad.addColorStop(0.88, '#281b13');
    grad.addColorStop(1, '#7c6e5c'); // light chinking seam
    lCtx.fillStyle = grad;
    lCtx.fillRect(0, y, 512, h);
    for (let k = 0; k < 28; k++) {
      lCtx.strokeStyle = 'rgba(18, 11, 7, 0.3)';
      lCtx.beginPath();
      const ly = y + 5 + Math.random() * (h - 14);
      lCtx.moveTo(0, ly);
      lCtx.lineTo(512, ly + (Math.random() - 0.5) * 4);
      lCtx.stroke();
    }
  }
  const cabinLog = finalizeColorTexture(lCan, maxAnisotropy, 2, 2);

  // 4. Realistic furrowed tree bark texture (512x512)
  const [bCan, bCtx] = makeCanvas(512, 512);
  bCtx.fillStyle = '#38281c';
  bCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 460; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 3 + Math.random() * 8;
    const h = 34 + Math.random() * 90;
    const r = Math.random();
    bCtx.fillStyle =
      r < 0.42
        ? 'rgba(24, 16, 10, 0.74)'
        : r < 0.8
          ? 'rgba(78, 57, 42, 0.62)'
          : 'rgba(108, 86, 66, 0.38)';
    bCtx.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 70; i++) {
    bCtx.fillStyle = 'rgba(74, 102, 42, 0.28)';
    bCtx.beginPath();
    bCtx.ellipse(Math.random() * 512, Math.random() * 512, 12 + Math.random() * 20, 6 + Math.random() * 12, 0, 0, Math.PI * 2);
    bCtx.fill();
  }
  const treeBark = finalizeColorTexture(bCan, maxAnisotropy, 2, 3);

  const makeFoliageTexture = (pal: [string, string, string, string, string, string, string]) => {
    const [lfCan, lfCtx] = makeCanvas(512, 512);
    lfCtx.clearRect(0, 0, 512, 512);
    lfCtx.strokeStyle = '#3f2e1e';
    lfCtx.lineCap = 'round';
    const drawTwig = (x1: number, y1: number, x2: number, y2: number, lw: number) => {
      lfCtx.lineWidth = lw;
      lfCtx.beginPath();
      lfCtx.moveTo(x1, y1);
      lfCtx.quadraticCurveTo((x1 + x2) * 0.5 + 14, (y1 + y2) * 0.5 - 10, x2, y2);
      lfCtx.stroke();
    };
    drawTwig(256, 460, 256, 110, 7);
    drawTwig(256, 360, 125, 195, 5);
    drawTwig(256, 340, 388, 185, 5);
    drawTwig(256, 240, 155, 115, 4);
    drawTwig(256, 230, 355, 105, 4);

    const drawLeaf = (cx: number, cy: number, ang: number, len: number, wid: number, tone: number) => {
      lfCtx.save();
      lfCtx.translate(cx, cy);
      lfCtx.rotate(ang);
      const grad = lfCtx.createLinearGradient(0, 0, 0, -len);
      if (tone < 0.34) {
        grad.addColorStop(0, pal[0]);
        grad.addColorStop(1, pal[1]);
      } else if (tone < 0.72) {
        grad.addColorStop(0, pal[2]);
        grad.addColorStop(1, pal[3]);
      } else {
        grad.addColorStop(0, pal[4]);
        grad.addColorStop(1, pal[5]);
      }
      lfCtx.fillStyle = grad;
      lfCtx.beginPath();
      lfCtx.moveTo(0, 4);
      lfCtx.bezierCurveTo(-wid, -len * 0.28, -wid * 0.88, -len * 0.78, 0, -len);
      lfCtx.bezierCurveTo(wid * 0.88, -len * 0.78, wid, -len * 0.28, 0, 4);
      lfCtx.closePath();
      lfCtx.fill();

      lfCtx.strokeStyle = pal[6];
      lfCtx.lineWidth = 1.6;
      lfCtx.beginPath();
      lfCtx.moveTo(0, 0);
      lfCtx.lineTo(0, -len * 0.86);
      lfCtx.stroke();
      lfCtx.restore();
    };

    for (let i = 0; i < 54; i++) {
      const t = i / 54;
      const radius = 36 + Math.pow((i * 0.6180339) % 1, 0.7) * 168;
      const theta = i * 2.39996;
      const lx = 256 + Math.cos(theta) * radius;
      const ly = 260 + Math.sin(theta) * radius * 0.92;
      const ang = theta + Math.PI * 0.5 + Math.sin(i * 3.1) * 0.45;
      const len = 46 + (i % 5) * 9;
      const wid = 17 + (i % 4) * 3.5;
      drawLeaf(lx, ly, ang, len, wid, (t + (i % 3) * 0.25) % 1);
    }
    const tex = new THREE.CanvasTexture(lfCan);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  };

  const leafCluster = makeFoliageTexture([
    '#2a4f1b', '#4b7d28', '#3a6621', '#70a533', '#508229', '#98c744', 'rgba(176, 214, 92, 0.42)',
  ]);
  const blossomLeafCluster = makeFoliageTexture([
    '#be185d', '#f472b6', '#db2777', '#fbcfe8', '#e11d48', '#fff1f2', 'rgba(255, 240, 245, 0.55)',
  ]);
  const autumnLeafCluster = makeFoliageTexture([
    '#b45309', '#f59e0b', '#c2410c', '#fb923c', '#dc2626', '#fde047', 'rgba(254, 240, 138, 0.48)',
  ]);

  // 4c. Conifer Pine Needle Bough Texture (512x512 RGBA)
  const [pnCan, pnCtx] = makeCanvas(512, 512);
  pnCtx.clearRect(0, 0, 512, 512);
  pnCtx.strokeStyle = '#3b2819';
  pnCtx.lineWidth = 8;
  pnCtx.beginPath();
  pnCtx.moveTo(256, 480);
  pnCtx.lineTo(256, 42);
  pnCtx.stroke();
  for (let i = 0; i < 150; i++) {
    const t = i / 150;
    const y = 450 - t * 395;
    const spread = (1 - t * 0.75) * 160 + 22;
    const side = i % 2 === 0 ? -1 : 1;
    pnCtx.strokeStyle = i % 3 === 0 ? '#1b3e1f' : i % 3 === 1 ? '#295628' : '#3a6d30';
    pnCtx.lineWidth = 4;
    pnCtx.beginPath();
    pnCtx.moveTo(256, y);
    pnCtx.lineTo(256 + side * spread * (0.65 + (i % 4) * 0.1), y - 28 - (i % 3) * 14);
    pnCtx.stroke();
    // Fine needles along sub-branch
    for (let n = 0; n < 7; n++) {
      const nt = 0.2 + (n / 7) * 0.8;
      const nx = 256 + side * spread * nt * 0.8;
      const ny = y - 24 * nt;
      pnCtx.lineWidth = 2.5;
      pnCtx.beginPath();
      pnCtx.moveTo(nx, ny);
      pnCtx.lineTo(nx + side * 16, ny - 22);
      pnCtx.stroke();
    }
  }
  const pineNeedle = new THREE.CanvasTexture(pnCan);
  pineNeedle.colorSpace = THREE.SRGBColorSpace;
  pineNeedle.anisotropy = maxAnisotropy;
  pineNeedle.needsUpdate = true;

  // 4d. Forest Fern & Undergrowth Frond Texture (256x256 RGBA)
  const [fnCan, fnCtx] = makeCanvas(256, 256);
  fnCtx.clearRect(0, 0, 256, 256);
  fnCtx.strokeStyle = '#33591b';
  fnCtx.lineWidth = 4;
  fnCtx.lineCap = 'round';
  fnCtx.beginPath();
  fnCtx.moveTo(128, 248);
  fnCtx.quadraticCurveTo(124, 130, 128, 16);
  fnCtx.stroke();
  for (let row = 0; row < 13; row++) {
    const y = 228 - row * 16;
    const span = (1 - row / 14) * 76 + 10;
    const tone = row / 13;
    fnCtx.fillStyle = tone < 0.45 ? '#355f1e' : tone < 0.8 ? '#4f8527' : '#73a935';
    for (const dir of [-1, 1]) {
      fnCtx.save();
      fnCtx.translate(128, y);
      fnCtx.rotate(dir * (0.95 + row * 0.02));
      fnCtx.beginPath();
      fnCtx.ellipse(0, -span * 0.5, 7.5 - row * 0.25, span * 0.52, 0, 0, Math.PI * 2);
      fnCtx.fill();
      fnCtx.restore();
    }
  }
  const fernCluster = new THREE.CanvasTexture(fnCan);
  fernCluster.colorSpace = THREE.SRGBColorSpace;
  fernCluster.anisotropy = maxAnisotropy;
  fernCluster.needsUpdate = true;

  // 4e. Wildflower Clumps in 4 Vivid Color Palettes
  const makeFlowerTexture = (petalColors: string[], centerColor: string) => {
    const [flCan, flCtx] = makeCanvas(256, 256);
    flCtx.clearRect(0, 0, 256, 256);
    for (let s = 0; s < 12; s++) {
      const bx = 36 + s * 17;
      const topX = bx + Math.sin(s * 1.9) * 18;
      const topY = 34 + (s % 4) * 26;
      flCtx.strokeStyle = s % 2 === 0 ? '#3f6e24' : '#4f852a';
      flCtx.lineWidth = 3.2;
      flCtx.beginPath();
      flCtx.moveTo(bx, 252);
      flCtx.quadraticCurveTo((bx + topX) * 0.5, 160, topX, topY);
      flCtx.stroke();

      flCtx.fillStyle = '#4e832c';
      flCtx.beginPath();
      flCtx.ellipse(bx - 7, 210 - (s % 3) * 14, 5.5, 17, -0.45, 0, Math.PI * 2);
      flCtx.fill();

      flCtx.fillStyle = petalColors[s % petalColors.length];
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        flCtx.beginPath();
        flCtx.arc(topX + Math.cos(pa) * 10, topY + Math.sin(pa) * 10, 6.8, 0, Math.PI * 2);
        flCtx.fill();
      }
      flCtx.fillStyle = centerColor;
      flCtx.beginPath();
      flCtx.arc(topX, topY, 5.2, 0, Math.PI * 2);
      flCtx.fill();
    }
    const tex = new THREE.CanvasTexture(flCan);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  };

  const flowerTextures = [
    makeFlowerTexture(['#fef08a', '#facc15', '#fb923c', '#ffffff'], '#b45309'), // Sun gold & daisy
    makeFlowerTexture(['#f472b6', '#fb7185', '#f43f5e', '#fecdd3'], '#fde047'), // Wild rose & crimson
    makeFlowerTexture(['#60a5fa', '#38bdf8', '#93c5fd', '#e0f2fe'], '#facc15'), // Cornflower & sky blue
    makeFlowerTexture(['#c084fc', '#a855f7', '#e9d5ff', '#f8fafc'], '#f59e0b'), // Lavender & violet
  ];
  const flowerCluster = flowerTextures[0];

  // 4f. Riverbank Reeds & Cattails Texture (256x256 RGBA)
  const [rdCan, rdCtx] = makeCanvas(256, 256);
  rdCtx.clearRect(0, 0, 256, 256);
  for (let r = 0; r < 9; r++) {
    const rx = 38 + r * 22;
    const tipX = rx + (r - 4) * 6;
    const tipY = 20 + (r % 3) * 24;
    rdCtx.strokeStyle = r % 2 === 0 ? '#3f6a25' : '#58882f';
    rdCtx.lineWidth = 4.5;
    rdCtx.beginPath();
    rdCtx.moveTo(rx, 254);
    rdCtx.quadraticCurveTo(rx, 130, tipX, tipY);
    rdCtx.stroke();
    if (r % 2 === 1) {
      rdCtx.fillStyle = '#5c3317';
      rdCtx.beginPath();
      rdCtx.roundRect(tipX - 5, tipY + 14, 10, 38, 4);
      rdCtx.fill();
    }
  }
  const reedCluster = new THREE.CanvasTexture(rdCan);
  reedCluster.colorSpace = THREE.SRGBColorSpace;
  reedCluster.anisotropy = maxAnisotropy;
  reedCluster.needsUpdate = true;

  // 5. Roof shingles (512x512)
  const [rCan, rCtx] = makeCanvas(512, 512);
  rCtx.fillStyle = '#222831';
  rCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++) {
    const y = row * (512 / 12);
    const h = 512 / 12;
    const offset = (row % 2) * 24;
    for (let col = -1; col < 12; col++) {
      const x = col * 48 + offset;
      const v = 30 + Math.floor(Math.random() * 18);
      rCtx.fillStyle = `rgb(${v}, ${v + 6}, ${v + 14})`;
      rCtx.fillRect(x + 2, y + 2, 44, h - 4);
      rCtx.fillStyle = 'rgba(255,255,255,0.04)';
      rCtx.fillRect(x + 2, y + 2, 44, 4);
    }
  }
  const roofShingle = finalizeColorTexture(rCan, maxAnisotropy, 4, 4);

  // 6. Mossy chamfered cobblestone block embankment / ruins / hearth (512x512)
  const [sCan, sCtx] = makeCanvas(512, 512);
  sCtx.fillStyle = '#484b47';
  sCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    const off = (row % 2) * 44;
    for (let col = -1; col < 7; col++) {
      const x = col * 96 + off;
      const tone = 110 + Math.floor(Math.random() * 36);
      sCtx.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 9})`;
      sCtx.fillRect(x + 4, y + 4, 88, 56);
      sCtx.fillStyle = 'rgba(255,255,255,0.09)';
      sCtx.fillRect(x + 4, y + 4, 88, 5);
      sCtx.fillStyle = 'rgba(0,0,0,0.16)';
      sCtx.fillRect(x + 4, y + 55, 88, 5);
    }
  }
  for (let i = 0; i < 2600; i++) {
    const mossy = Math.random() < 0.16;
    sCtx.fillStyle = mossy
      ? 'rgba(88, 124, 46, 0.38)'
      : Math.random() > 0.5
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(0,0,0,0.09)';
    sCtx.fillRect(Math.random() * 512, Math.random() * 512, 5, 5);
  }
  const stoneBlock = finalizeColorTexture(sCan, maxAnisotropy, 4, 2);

  // 7. Detailed charcoal hoodie weave with ribbing & zipper (256x256)
  const [hCan, hCtx] = makeCanvas(256, 256);
  hCtx.fillStyle = '#2d313a';
  hCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    hCtx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.1)';
    hCtx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 6) {
    hCtx.fillStyle = 'rgba(0,0,0,0.05)';
    hCtx.fillRect(x, 0, 2, 256);
  }
  hCtx.fillStyle = '#17191f';
  hCtx.fillRect(123, 0, 10, 256);
  hCtx.fillStyle = '#94a3b8';
  for (let y = 8; y < 250; y += 8) {
    hCtx.fillRect(126, y, 4, 3);
  }
  const hoodieFabric = finalizeColorTexture(hCan, maxAnisotropy, 1, 1);

  // 8. Detailed blue denim jeans with stitching (256x256)
  const [dCan, dCtx] = makeCanvas(256, 256);
  dCtx.fillStyle = '#537798';
  dCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    dCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(18,32,52,0.16)';
    dCtx.fillRect(Math.random() * 256, Math.random() * 256, 6, 1.5);
  }
  dCtx.strokeStyle = '#d97706';
  dCtx.lineWidth = 2.5;
  dCtx.setLineDash([6, 4]);
  dCtx.strokeRect(10, 10, 236, 236);
  const denimFabric = finalizeColorTexture(dCan, maxAnisotropy, 1, 1);

  // 9. Expressive Roblox-inspired face with irises & warm cheeks
  const [fCan, fCtx] = makeCanvas(256, 256);
  fCtx.fillStyle = '#f2c197';
  fCtx.fillRect(0, 0, 256, 256);
  fCtx.fillStyle = 'rgba(239, 128, 108, 0.22)';
  fCtx.beginPath();
  fCtx.ellipse(62, 134, 18, 10, 0, 0, Math.PI * 2);
  fCtx.ellipse(194, 134, 18, 10, 0, 0, Math.PI * 2);
  fCtx.fill();
  for (const ex of [86, 170]) {
    fCtx.fillStyle = '#18181b';
    fCtx.beginPath();
    fCtx.ellipse(ex, 108, 14, 19, 0, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#3b2416';
    fCtx.beginPath();
    fCtx.arc(ex, 112, 8, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#ffffff';
    fCtx.beginPath();
    fCtx.arc(ex - 4, 100, 5, 0, Math.PI * 2);
    fCtx.arc(ex + 4, 115, 2.2, 0, Math.PI * 2);
    fCtx.fill();
  }
  fCtx.strokeStyle = '#6f3219';
  fCtx.lineWidth = 7;
  fCtx.lineCap = 'round';
  fCtx.beginPath();
  fCtx.moveTo(62, 80);
  fCtx.quadraticCurveTo(86, 70, 106, 81);
  fCtx.moveTo(150, 81);
  fCtx.quadraticCurveTo(170, 70, 194, 80);
  fCtx.stroke();
  fCtx.strokeStyle = '#1f1612';
  fCtx.lineWidth = 6.5;
  fCtx.beginPath();
  fCtx.arc(128, 144, 34, 0.18 * Math.PI, 0.82 * Math.PI);
  fCtx.stroke();
  const robloxFace = finalizeColorTexture(fCan, maxAnisotropy, 1, 1);

  // 10. Goblin detailed scarred fierce face
  const [gfCan, gfCtx] = makeCanvas(256, 256);
  gfCtx.fillStyle = '#5c8f3d';
  gfCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    gfCtx.fillStyle = i % 2 === 0 ? 'rgba(35, 64, 20, 0.25)' : 'rgba(134, 182, 82, 0.2)';
    gfCtx.fillRect(Math.random() * 256, Math.random() * 256, 8, 8);
  }
  gfCtx.fillStyle = '#fde047';
  gfCtx.fillRect(54, 88, 46, 26);
  gfCtx.fillRect(156, 88, 46, 26);
  gfCtx.fillStyle = '#991b1b';
  gfCtx.fillRect(72, 93, 14, 16);
  gfCtx.fillRect(170, 93, 14, 16);
  gfCtx.strokeStyle = '#254218';
  gfCtx.lineWidth = 10;
  gfCtx.beginPath();
  gfCtx.moveTo(44, 68);
  gfCtx.lineTo(108, 92);
  gfCtx.moveTo(212, 68);
  gfCtx.lineTo(148, 92);
  gfCtx.stroke();
  gfCtx.fillStyle = '#1e293b';
  gfCtx.fillRect(72, 164, 112, 32);
  gfCtx.fillStyle = '#f8fafc';
  gfCtx.beginPath();
  gfCtx.moveTo(82, 196);
  gfCtx.lineTo(96, 165);
  gfCtx.lineTo(110, 196);
  gfCtx.moveTo(146, 196);
  gfCtx.lineTo(160, 165);
  gfCtx.lineTo(174, 196);
  gfCtx.fill();
  const goblinFace = finalizeColorTexture(gfCan, maxAnisotropy, 1, 1);

  // 10b. Friendly Villager Ranger face with warm beard
  const [vfCan, vfCtx] = makeCanvas(256, 256);
  vfCtx.fillStyle = '#efc098';
  vfCtx.fillRect(0, 0, 256, 256);
  vfCtx.fillStyle = '#5a3a22';
  vfCtx.fillRect(18, 168, 220, 88);
  vfCtx.fillStyle = '#1f2937';
  vfCtx.beginPath();
  vfCtx.arc(88, 104, 12, 0, Math.PI * 2);
  vfCtx.arc(168, 104, 12, 0, Math.PI * 2);
  vfCtx.fill();
  vfCtx.fillStyle = '#ffffff';
  vfCtx.beginPath();
  vfCtx.arc(84, 100, 4, 0, Math.PI * 2);
  vfCtx.arc(164, 100, 4, 0, Math.PI * 2);
  vfCtx.fill();
  vfCtx.strokeStyle = '#3f2818';
  vfCtx.lineWidth = 8;
  vfCtx.beginPath();
  vfCtx.moveTo(64, 80);
  vfCtx.lineTo(108, 82);
  vfCtx.moveTo(148, 82);
  vfCtx.lineTo(192, 80);
  vfCtx.stroke();
  vfCtx.strokeStyle = '#f8fafc';
  vfCtx.lineWidth = 6;
  vfCtx.beginPath();
  vfCtx.arc(128, 154, 24, 0.15 * Math.PI, 0.85 * Math.PI);
  vfCtx.stroke();
  const villagerFace = finalizeColorTexture(vfCan, maxAnisotropy, 1, 1);

  // 10c. Spotted woodland deer fur coat
  const [dcCan, dcCtx] = makeCanvas(256, 256);
  dcCtx.fillStyle = '#9b643b';
  dcCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    dcCtx.fillStyle = 'rgba(248, 232, 206, 0.65)';
    dcCtx.beginPath();
    dcCtx.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 6, 0, Math.PI * 2);
    dcCtx.fill();
  }
  const deerCoat = finalizeColorTexture(dcCan, maxAnisotropy, 1, 1);

  // 11. Soft radial contact shadow
  const [csCan, csCtx] = makeCanvas(128, 128);
  const rad = csCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  rad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  rad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  csCtx.fillStyle = rad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(csCan);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  // 12. High-detail Water ripple normal map (512x512, linear space)
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const dx =
        Math.cos(u * 4 + v * 3) * 0.36 +
        Math.cos(u * 7 - v * 5) * 0.24 +
        Math.sin(u * 3 + v * 9) * 0.16 +
        Math.cos(u * 13 + v * 11) * 0.08;
      const dy =
        Math.sin(u * 3 + v * 4) * 0.36 +
        Math.cos(u * 5 + v * 7) * 0.24 -
        Math.sin(u * 9 - v * 3) * 0.16 +
        Math.sin(u * 11 - v * 13) * 0.08;
      const nx = Math.max(0, Math.min(255, Math.floor((dx * 0.48 + 0.5) * 255)));
      const ny = Math.max(0, Math.min(255, Math.floor((dy * 0.48 + 0.5) * 255)));
      const idx = (y * size + x) * 4;
      data[idx] = nx;
      data[idx + 1] = ny;
      data[idx + 2] = 242;
      data[idx + 3] = 255;
    }
  }
  const waterRippleNormal = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  waterRippleNormal.wrapS = THREE.RepeatWrapping;
  waterRippleNormal.wrapT = THREE.RepeatWrapping;
  waterRippleNormal.repeat.set(9, 24);
  waterRippleNormal.needsUpdate = true;

  return {
    grassTile,
    grassNormal,
    woodPlank,
    cabinLog,
    treeBark,
    leafCluster,
    blossomLeafCluster,
    autumnLeafCluster,
    pineNeedle,
    fernCluster,
    flowerCluster,
    flowerTextures,
    reedCluster,
    roofShingle,
    stoneBlock,
    hoodieFabric,
    denimFabric,
    robloxFace,
    goblinFace,
    villagerFace,
    deerCoat,
    contactShadow,
    waterRippleNormal,
    dispose: () => {
      grassTile.dispose();
      grassNormal.dispose();
      woodPlank.dispose();
      cabinLog.dispose();
      treeBark.dispose();
      leafCluster.dispose();
      blossomLeafCluster.dispose();
      autumnLeafCluster.dispose();
      pineNeedle.dispose();
      fernCluster.dispose();
      flowerTextures.forEach((t) => t.dispose());
      reedCluster.dispose();
      roofShingle.dispose();
      stoneBlock.dispose();
      hoodieFabric.dispose();
      denimFabric.dispose();
      robloxFace.dispose();
      goblinFace.dispose();
      villagerFace.dispose();
      deerCoat.dispose();
      contactShadow.dispose();
      waterRippleNormal.dispose();
    },
  };
}
