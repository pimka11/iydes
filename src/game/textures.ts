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
  sandBankTile: THREE.CanvasTexture;
  cliffRockTile: THREE.CanvasTexture;
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
  terracottaRoof: THREE.CanvasTexture;
  nordicSlate: THREE.CanvasTexture;
  plasterTimber: THREE.CanvasTexture;
  shopSign: THREE.CanvasTexture;
  caveRock: THREE.CanvasTexture;
  stoneBlock: THREE.CanvasTexture;
  hoodieFabric: THREE.CanvasTexture;
  denimFabric: THREE.CanvasTexture;
  robloxFace: THREE.CanvasTexture;
  slimeGel: THREE.CanvasTexture;
  goblinSkin: THREE.CanvasTexture;
  goblinFace: THREE.CanvasTexture;
  golemStone: THREE.CanvasTexture;
  bossArmor: THREE.CanvasTexture;
  wolfFur: THREE.CanvasTexture;
  skeletonBone: THREE.CanvasTexture;
  sheepWool: THREE.CanvasTexture;
  villagerFace: THREE.CanvasTexture;
  merchantFace: THREE.CanvasTexture;
  blacksmithFace: THREE.CanvasTexture;
  herbalistFace: THREE.CanvasTexture;
  explorerFace: THREE.CanvasTexture;
  deerCoat: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  waterRippleNormal: THREE.DataTexture;
  waterFoam: THREE.CanvasTexture;
  waterCaustics: THREE.CanvasTexture;
  shieldEmblem: THREE.CanvasTexture;
  doorWood: THREE.CanvasTexture;
  forgeSign: THREE.CanvasTexture;
  herbalSign: THREE.CanvasTexture;
  bakerySign: THREE.CanvasTexture;
  alchemySign: THREE.CanvasTexture;
  tavernSign: THREE.CanvasTexture;
  townhallSign: THREE.CanvasTexture;
  minecraftCobble: THREE.CanvasTexture;
  minecraftDeepslate: THREE.CanvasTexture;
  minecraftOre: THREE.CanvasTexture;
  plazaCobble: THREE.CanvasTexture;
  wornTrailDirt: THREE.CanvasTexture;
  mayorFace: THREE.CanvasTexture;
  bakerFace: THREE.CanvasTexture;
  alchemistFace: THREE.CanvasTexture;
  guardFace: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // Helper to stamp seamless wrapped shapes across 512x512 / 256x256 tile borders
  const wrapDraw = (ctx: CanvasRenderingContext2D, size: number, x: number, y: number, r: number, drawAt: (ox: number, oy: number) => void) => {
    for (let dx = -size; dx <= size; dx += size) {
      if (x + dx < -r || x + dx > size + r) continue;
      for (let dy = -size; dy <= size; dy += size) {
        if (y + dy < -r || y + dy > size + r) continue;
        drawAt(x + dx, y + dy);
      }
    }
  };

  // 1. Seamless Natural Meadow Turf, Clover & Organic Soil (512x512)
  const [gCan, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#5c8c38';
  gCtx.fillRect(0, 0, 512, 512);
  // Soft undulating turf patches
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const rad = 18 + Math.random() * 38;
    const warm = i % 3 === 0;
    const col = warm
      ? 'rgba(132, 168, 62, 0.16)'
      : i % 2 === 0
        ? 'rgba(54, 96, 30, 0.18)'
        : 'rgba(104, 86, 52, 0.11)';
    gCtx.fillStyle = col;
    wrapDraw(gCtx, 512, x, y, rad, (ox, oy) => {
      gCtx.beginPath();
      gCtx.arc(ox, oy, rad, 0, Math.PI * 2);
      gCtx.fill();
    });
  }
  // Fine meadow blades & clover tufts (wrapped cleanly)
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random();
    gCtx.strokeStyle =
      shade < 0.25
        ? 'rgba(42, 74, 24, 0.5)'
        : shade < 0.65
          ? 'rgba(116, 162, 56, 0.45)'
          : shade < 0.9
            ? 'rgba(154, 188, 78, 0.36)'
            : 'rgba(114, 92, 56, 0.28)';
    gCtx.lineWidth = 1.2 + Math.random() * 1.4;
    const len = 4 + Math.random() * 7;
    const tilt = (Math.random() - 0.5) * 4.5;
    wrapDraw(gCtx, 512, x, y, 10, (ox, oy) => {
      gCtx.beginPath();
      gCtx.moveTo(ox, oy);
      gCtx.lineTo(ox + tilt, oy - len);
      gCtx.stroke();
    });
  }
  const grassTile = finalizeColorTexture(gCan, maxAnisotropy, 1, 1);

  // Seamless periodic terrain micro-bump normal map (256x256, linear)
  const nSize = 256;
  const nData = new Uint8Array(nSize * nSize * 4);
  for (let y = 0; y < nSize; y++) {
    for (let x = 0; x < nSize; x++) {
      const u = (x / nSize) * Math.PI * 2;
      const v = (y / nSize) * Math.PI * 2;
      const hx =
        Math.cos(u * 6 + v * 3) * 0.22 +
        Math.sin(u * 11 - v * 7) * 0.16 +
        Math.cos(u * 17 + v * 13) * 0.1;
      const hy =
        Math.sin(u * 5 + v * 6) * 0.22 +
        Math.cos(u * 7 + v * 11) * 0.16 -
        Math.sin(u * 13 - v * 17) * 0.1;
      const idx = (y * nSize + x) * 4;
      nData[idx] = Math.max(0, Math.min(255, Math.floor((hx * 0.45 + 0.5) * 255)));
      nData[idx + 1] = Math.max(0, Math.min(255, Math.floor((hy * 0.45 + 0.5) * 255)));
      nData[idx + 2] = 248;
      nData[idx + 3] = 255;
    }
  }
  const grassNormal = new THREE.DataTexture(nData, nSize, nSize, THREE.RGBAFormat);
  grassNormal.wrapS = THREE.RepeatWrapping;
  grassNormal.wrapT = THREE.RepeatWrapping;
  grassNormal.needsUpdate = true;

  // 1b. Seamless Riverbank Sand & Smooth Pebbles Tile (256x256)
  const [bankCan, bankCtx] = makeCanvas(256, 256);
  bankCtx.fillStyle = '#b8a98a';
  bankCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 2.5;
    bankCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(154, 138, 108, 0.45)'
        : i % 2 === 0
          ? 'rgba(218, 206, 180, 0.35)'
          : 'rgba(120, 106, 82, 0.3)';
    wrapDraw(bankCtx, 256, x, y, r, (ox, oy) => {
      bankCtx.fillRect(ox, oy, r, r);
    });
  }
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const rx = 2.5 + Math.random() * 5.5;
    const ry = 2 + Math.random() * 4.2;
    const rot = Math.random() * Math.PI;
    const tone = 115 + Math.floor(Math.random() * 58);
    bankCtx.fillStyle = `rgb(${tone}, ${tone - 5}, ${tone - 14})`;
    wrapDraw(bankCtx, 256, x, y, rx + 2, (ox, oy) => {
      bankCtx.beginPath();
      bankCtx.ellipse(ox, oy, rx, ry, rot, 0, Math.PI * 2);
      bankCtx.fill();
    });
  }
  const sandBankTile = finalizeColorTexture(bankCan, maxAnisotropy, 1, 1);

  // 1c. Seamless Stratified Cliff Rock & Moss Crevices Tile (512x512)
  const [rkCan, rkCtx] = makeCanvas(512, 512);
  rkCtx.fillStyle = '#686e75';
  rkCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 22 + Math.random() * 68;
    const h = 10 + Math.random() * 26;
    const shade = 78 + Math.floor(Math.random() * 54);
    rkCtx.fillStyle = `rgba(${shade}, ${shade + 3}, ${shade + 7}, 0.48)`;
    wrapDraw(rkCtx, 512, x, y, Math.max(w, h), (ox, oy) => {
      rkCtx.fillRect(ox, oy, w, h);
    });
  }
  for (let i = 0; i < 55; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 30 + Math.random() * 90;
    rkCtx.strokeStyle = i % 5 === 0 ? 'rgba(72, 108, 44, 0.45)' : 'rgba(28, 32, 38, 0.55)';
    rkCtx.lineWidth = 1.6 + Math.random() * 2.2;
    wrapDraw(rkCtx, 512, x, y, len, (ox, oy) => {
      rkCtx.beginPath();
      rkCtx.moveTo(ox, oy);
      rkCtx.lineTo(ox + len, oy + (Math.random() - 0.5) * 18);
      rkCtx.stroke();
    });
  }
  const cliffRockTile = finalizeColorTexture(rkCan, maxAnisotropy, 1, 1);

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

  // 5b. Terracotta clay roof tiles (512x512)
  const [tcCan, tcCtx] = makeCanvas(512, 512);
  tcCtx.fillStyle = '#7c2d12';
  tcCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 10; row++) {
    const y = row * (512 / 10);
    const h = 512 / 10;
    const off = (row % 2) * 24;
    for (let col = -1; col < 12; col++) {
      const x = col * 48 + off;
      const r = 158 + Math.floor(Math.random() * 34);
      const g = 68 + Math.floor(Math.random() * 20);
      const b = 38 + Math.floor(Math.random() * 14);
      tcCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      tcCtx.fillRect(x + 2, y + 2, 44, h - 4);
      tcCtx.fillStyle = 'rgba(255, 220, 180, 0.14)';
      tcCtx.fillRect(x + 2, y + 2, 44, 5);
    }
  }
  const terracottaRoof = finalizeColorTexture(tcCan, maxAnisotropy, 4, 4);

  // 5c. Nordic blue-slate roof tiles (512x512)
  const [nsCan, nsCtx] = makeCanvas(512, 512);
  nsCtx.fillStyle = '#1e293b';
  nsCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++) {
    const y = row * (512 / 12);
    const h = 512 / 12;
    const off = (row % 2) * 22;
    for (let col = -1; col < 12; col++) {
      const x = col * 44 + off;
      const tone = 44 + Math.floor(Math.random() * 24);
      nsCtx.fillStyle = `rgb(${tone}, ${tone + 14}, ${tone + 32})`;
      nsCtx.fillRect(x + 2, y + 2, 40, h - 4);
      nsCtx.fillStyle = 'rgba(148, 197, 255, 0.08)';
      nsCtx.fillRect(x + 2, y + 2, 40, 4);
    }
  }
  const nordicSlate = finalizeColorTexture(nsCan, maxAnisotropy, 4, 4);

  // 5d. Tudor whitewashed plaster & dark oak timber framing (512x512)
  const [ptCan, ptCtx] = makeCanvas(512, 512);
  ptCtx.fillStyle = '#ece3d0';
  ptCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3200; i++) {
    ptCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(130, 110, 82, 0.14)';
    ptCtx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
  }
  ptCtx.fillStyle = '#472c18';
  ptCtx.fillRect(0, 0, 512, 26);
  ptCtx.fillRect(0, 240, 512, 28);
  ptCtx.fillRect(0, 486, 512, 26);
  ptCtx.fillRect(0, 0, 26, 512);
  ptCtx.fillRect(242, 0, 28, 512);
  ptCtx.fillRect(486, 0, 26, 512);
  ptCtx.strokeStyle = '#3b2312';
  ptCtx.lineWidth = 22;
  ptCtx.beginPath();
  ptCtx.moveTo(16, 252);
  ptCtx.lineTo(256, 16);
  ptCtx.lineTo(496, 252);
  ptCtx.stroke();
  const plasterTimber = finalizeColorTexture(ptCan, maxAnisotropy, 2, 1);

  // 5e. Hand-painted Wooden Shop Signboard ("МАГАЗИН" + Gold Coin)
  const [ssCan, ssCtx] = makeCanvas(512, 192);
  ssCtx.fillStyle = '#3e2412';
  ssCtx.fillRect(0, 0, 512, 192);
  ssCtx.strokeStyle = '#f59e0b';
  ssCtx.lineWidth = 8;
  ssCtx.strokeRect(10, 10, 492, 172);
  ssCtx.fillStyle = '#fbbf24';
  ssCtx.beginPath();
  ssCtx.arc(76, 96, 36, 0, Math.PI * 2);
  ssCtx.fill();
  ssCtx.strokeStyle = '#92400e';
  ssCtx.lineWidth = 5;
  ssCtx.stroke();
  ssCtx.fillStyle = '#fef3c7';
  ssCtx.font = 'bold 64px sans-serif';
  ssCtx.textAlign = 'center';
  ssCtx.textBaseline = 'middle';
  ssCtx.fillText('МАГАЗИН', 298, 98);
  const shopSign = finalizeColorTexture(ssCan, maxAnisotropy, 1, 1);

  // 5f. Deep Cavern Granite & Crystal-flecked Cave Rock (512x512)
  const [crCan, crCtx] = makeCanvas(512, 512);
  crCtx.fillStyle = '#2c3138';
  crCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    const shade = Math.random();
    crCtx.fillStyle =
      shade < 0.38
        ? 'rgba(18, 22, 27, 0.55)'
        : shade < 0.78
          ? 'rgba(72, 80, 90, 0.42)'
          : shade < 0.94
            ? 'rgba(110, 118, 128, 0.28)'
            : 'rgba(96, 165, 250, 0.26)';
    crCtx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 4 + Math.random() * 10);
  }
  for (let k = 0; k < 42; k++) {
    crCtx.strokeStyle = 'rgba(12, 14, 18, 0.65)';
    crCtx.lineWidth = 2.2;
    crCtx.beginPath();
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    crCtx.moveTo(cx, cy);
    crCtx.lineTo(cx + (Math.random() - 0.5) * 68, cy + (Math.random() - 0.5) * 68);
    crCtx.stroke();
  }
  const caveRock = finalizeColorTexture(crCan, maxAnisotropy, 3, 2);

  // 7. Detailed charcoal hoodie weave with ribbing, chest crest & zipper (256x256)
  const [hCan, hCtx] = makeCanvas(256, 256);
  const hGrad = hCtx.createLinearGradient(0, 0, 0, 256);
  hGrad.addColorStop(0, '#363c48');
  hGrad.addColorStop(0.5, '#2b303a');
  hGrad.addColorStop(1, '#1e222b');
  hCtx.fillStyle = hGrad;
  hCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    hCtx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    hCtx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 5) {
    hCtx.fillStyle = 'rgba(0,0,0,0.06)';
    hCtx.fillRect(x, 0, 2, 256);
  }
  // Zipper & chest ranger patch
  hCtx.fillStyle = '#14171d';
  hCtx.fillRect(122, 0, 12, 256);
  hCtx.fillStyle = '#cbd5e1';
  for (let y = 6; y < 250; y += 7) {
    hCtx.fillRect(126, y, 4, 3);
  }
  hCtx.fillStyle = '#0ea5e9';
  hCtx.beginPath();
  hCtx.arc(72, 74, 18, 0, Math.PI * 2);
  hCtx.fill();
  hCtx.strokeStyle = '#fbbf24';
  hCtx.lineWidth = 3;
  hCtx.stroke();
  const hoodieFabric = finalizeColorTexture(hCan, maxAnisotropy, 1, 1);

  // 8. Detailed blue denim jeans with twill texture & stitching (256x256)
  const [dCan, dCtx] = makeCanvas(256, 256);
  const dGrad = dCtx.createLinearGradient(0, 0, 0, 256);
  dGrad.addColorStop(0, '#466a8c');
  dGrad.addColorStop(0.5, '#5980a3');
  dGrad.addColorStop(1, '#3b5875');
  dCtx.fillStyle = dGrad;
  dCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    dCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(16,30,48,0.18)';
    dCtx.fillRect(Math.random() * 256, Math.random() * 256, 7, 1.4);
  }
  dCtx.strokeStyle = '#f59e0b';
  dCtx.lineWidth = 2.5;
  dCtx.setLineDash([6, 4]);
  dCtx.strokeRect(10, 10, 236, 236);
  const denimFabric = finalizeColorTexture(dCan, maxAnisotropy, 1, 1);

  // 9. Expressive Roblox-inspired face with irises, shading & warm cheeks
  const [fCan, fCtx] = makeCanvas(256, 256);
  const fGrad = fCtx.createRadialGradient(128, 118, 25, 128, 128, 160);
  fGrad.addColorStop(0, '#f7cca6');
  fGrad.addColorStop(1, '#e8b384');
  fCtx.fillStyle = fGrad;
  fCtx.fillRect(0, 0, 256, 256);
  fCtx.fillStyle = 'rgba(239, 116, 98, 0.25)';
  fCtx.beginPath();
  fCtx.ellipse(60, 136, 20, 11, 0, 0, Math.PI * 2);
  fCtx.ellipse(196, 136, 20, 11, 0, 0, Math.PI * 2);
  fCtx.fill();
  for (const ex of [86, 170]) {
    fCtx.fillStyle = '#ffffff';
    fCtx.beginPath();
    fCtx.ellipse(ex, 108, 17, 21, 0, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#0f172a';
    fCtx.beginPath();
    fCtx.ellipse(ex, 109, 12, 16, 0, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#0284c7';
    fCtx.beginPath();
    fCtx.arc(ex, 113, 7, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#ffffff';
    fCtx.beginPath();
    fCtx.arc(ex - 4, 100, 5, 0, Math.PI * 2);
    fCtx.arc(ex + 4, 116, 2.5, 0, Math.PI * 2);
    fCtx.fill();
  }
  fCtx.strokeStyle = '#6f3219';
  fCtx.lineWidth = 7;
  fCtx.lineCap = 'round';
  fCtx.beginPath();
  fCtx.moveTo(60, 78);
  fCtx.quadraticCurveTo(86, 68, 108, 80);
  fCtx.moveTo(148, 80);
  fCtx.quadraticCurveTo(170, 68, 196, 78);
  fCtx.stroke();
  fCtx.strokeStyle = '#1f1612';
  fCtx.lineWidth = 6.5;
  fCtx.beginPath();
  fCtx.arc(128, 144, 34, 0.18 * Math.PI, 0.82 * Math.PI);
  fCtx.stroke();
  const robloxFace = finalizeColorTexture(fCan, maxAnisotropy, 1, 1);

  // 9b. Slime iridescent gel bubbles texture (256x256)
  const [slCan, slCtx] = makeCanvas(256, 256);
  const slGrad = slCtx.createLinearGradient(0, 0, 256, 256);
  slGrad.addColorStop(0, '#34d399');
  slGrad.addColorStop(0.5, '#10b981');
  slGrad.addColorStop(1, '#059669');
  slCtx.fillStyle = slGrad;
  slCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 48; i++) {
    slCtx.fillStyle = i % 2 === 0 ? 'rgba(209, 250, 229, 0.42)' : 'rgba(6, 78, 59, 0.25)';
    slCtx.beginPath();
    slCtx.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 0, Math.PI * 2);
    slCtx.fill();
  }
  const slimeGel = finalizeColorTexture(slCan, maxAnisotropy, 1, 1);

  // 9c. Goblin mottled forest skin texture (256x256)
  const [gsCan, gsCtx] = makeCanvas(256, 256);
  gsCtx.fillStyle = '#5c8f3d';
  gsCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    gsCtx.fillStyle = i % 3 === 0 ? 'rgba(34, 60, 18, 0.35)' : i % 3 === 1 ? 'rgba(134, 182, 82, 0.28)' : 'rgba(71, 85, 42, 0.25)';
    gsCtx.beginPath();
    gsCtx.arc(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 0, Math.PI * 2);
    gsCtx.fill();
  }
  const goblinSkin = finalizeColorTexture(gsCan, maxAnisotropy, 1, 1);

  // 9d. Golem cracked granite + glowing orange rune seams (256x256)
  const [goCan, goCtx] = makeCanvas(256, 256);
  goCtx.fillStyle = '#64748b';
  goCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    goCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.22)';
    goCtx.fillRect(Math.random() * 256, Math.random() * 256, 8, 8);
  }
  goCtx.strokeStyle = '#f59e0b';
  goCtx.lineWidth = 4;
  goCtx.beginPath();
  goCtx.moveTo(28, 36);
  goCtx.lineTo(128, 88);
  goCtx.lineTo(222, 46);
  goCtx.moveTo(128, 88);
  goCtx.lineTo(128, 224);
  goCtx.moveTo(52, 168);
  goCtx.lineTo(204, 168);
  goCtx.stroke();
  const golemStone = finalizeColorTexture(goCan, maxAnisotropy, 1, 1);

  // 9e. Boss Shadow Knight Damascus dark armor + crimson trim (256x256)
  const [baCan, baCtx] = makeCanvas(256, 256);
  baCtx.fillStyle = '#181524';
  baCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    baCtx.strokeStyle = y % 32 === 0 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(148, 163, 184, 0.14)';
    baCtx.lineWidth = 3;
    baCtx.beginPath();
    baCtx.moveTo(0, y);
    baCtx.bezierCurveTo(85, y + 10, 170, y - 10, 256, y);
    baCtx.stroke();
  }
  const bossArmor = finalizeColorTexture(baCan, maxAnisotropy, 1, 1);

  // 9f. Shadow Wolf layered charcoal & silver fur texture (256x256)
  const [wfCan, wfCtx] = makeCanvas(256, 256);
  wfCtx.fillStyle = '#334155';
  wfCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const shade = Math.random();
    wfCtx.fillStyle =
      shade < 0.45
        ? 'rgba(15, 23, 42, 0.48)'
        : shade < 0.85
          ? 'rgba(100, 116, 139, 0.35)'
          : 'rgba(203, 213, 225, 0.25)';
    wfCtx.fillRect(Math.random() * 256, Math.random() * 256, 12, 3);
  }
  const wolfFur = finalizeColorTexture(wfCan, maxAnisotropy, 1, 1);

  // 9g. Cave Skeleton weathered bone texture (256x256)
  const [sbCan, sbCtx] = makeCanvas(256, 256);
  sbCtx.fillStyle = '#e5e0d0';
  sbCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) {
    sbCtx.fillStyle = Math.random() > 0.4 ? 'rgba(120, 113, 108, 0.24)' : 'rgba(255, 255, 255, 0.32)';
    sbCtx.fillRect(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 14, 3);
  }
  const skeletonBone = finalizeColorTexture(sbCan, maxAnisotropy, 1, 1);

  // 9h. Fluffy curls Sheep Wool texture (256x256)
  const [swCan, swCtx] = makeCanvas(256, 256);
  swCtx.fillStyle = '#f5f5f4';
  swCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) {
    swCtx.strokeStyle = 'rgba(214, 211, 209, 0.72)';
    swCtx.lineWidth = 3;
    swCtx.beginPath();
    swCtx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 10, 0, Math.PI * 1.6);
    swCtx.stroke();
  }
  const sheepWool = finalizeColorTexture(swCan, maxAnisotropy, 1, 1);

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

  // 10b2. Friendly Shopkeeper Марко face with mustache & monocle
  const [mfCan, mfCtx] = makeCanvas(256, 256);
  mfCtx.fillStyle = '#f2c69e';
  mfCtx.fillRect(0, 0, 256, 256);
  mfCtx.fillStyle = '#1f2937';
  mfCtx.beginPath();
  mfCtx.arc(88, 104, 11, 0, Math.PI * 2);
  mfCtx.arc(168, 104, 11, 0, Math.PI * 2);
  mfCtx.fill();
  mfCtx.fillStyle = '#ffffff';
  mfCtx.beginPath();
  mfCtx.arc(84, 100, 4, 0, Math.PI * 2);
  mfCtx.arc(164, 100, 4, 0, Math.PI * 2);
  mfCtx.fill();
  mfCtx.strokeStyle = '#f59e0b';
  mfCtx.lineWidth = 5;
  mfCtx.beginPath();
  mfCtx.arc(168, 104, 24, 0, Math.PI * 2);
  mfCtx.stroke();
  mfCtx.fillStyle = '#78350f';
  mfCtx.beginPath();
  mfCtx.ellipse(106, 152, 26, 10, -0.15, 0, Math.PI * 2);
  mfCtx.ellipse(150, 152, 26, 10, 0.15, 0, Math.PI * 2);
  mfCtx.fill();
  mfCtx.strokeStyle = '#7c2d12';
  mfCtx.lineWidth = 5;
  mfCtx.beginPath();
  mfCtx.arc(128, 162, 24, 0.15 * Math.PI, 0.85 * Math.PI);
  mfCtx.stroke();
  const merchantFace = finalizeColorTexture(mfCan, maxAnisotropy, 1, 1);

  // 10b3. Blacksmith Богдан face (soot cheek smudge + thick beard)
  const [bfCan, bfCtx] = makeCanvas(256, 256);
  bfCtx.fillStyle = '#e7b58b';
  bfCtx.fillRect(0, 0, 256, 256);
  bfCtx.fillStyle = 'rgba(40, 32, 28, 0.28)';
  bfCtx.beginPath();
  bfCtx.ellipse(62, 136, 20, 12, -0.3, 0, Math.PI * 2);
  bfCtx.fill();
  bfCtx.fillStyle = '#292524';
  bfCtx.fillRect(14, 160, 228, 96);
  for (const ex of [88, 168]) {
    bfCtx.fillStyle = '#1f2937';
    bfCtx.beginPath();
    bfCtx.arc(ex, 102, 12, 0, Math.PI * 2);
    bfCtx.fill();
    bfCtx.fillStyle = '#ffffff';
    bfCtx.beginPath();
    bfCtx.arc(ex - 4, 98, 4, 0, Math.PI * 2);
    bfCtx.fill();
  }
  bfCtx.strokeStyle = '#1c1917';
  bfCtx.lineWidth = 10;
  bfCtx.beginPath();
  bfCtx.moveTo(60, 74);
  bfCtx.lineTo(112, 86);
  bfCtx.moveTo(196, 74);
  bfCtx.lineTo(144, 86);
  bfCtx.stroke();
  const blacksmithFace = finalizeColorTexture(bfCan, maxAnisotropy, 1, 1);

  // 10b4. Herbalist Соломія warm smiling face
  const [hfCan, hfCtx] = makeCanvas(256, 256);
  hfCtx.fillStyle = '#f6cfa9';
  hfCtx.fillRect(0, 0, 256, 256);
  hfCtx.fillStyle = 'rgba(244, 114, 182, 0.25)';
  hfCtx.beginPath();
  hfCtx.ellipse(60, 138, 18, 10, 0, 0, Math.PI * 2);
  hfCtx.ellipse(196, 138, 18, 10, 0, 0, Math.PI * 2);
  hfCtx.fill();
  for (const ex of [88, 168]) {
    hfCtx.fillStyle = '#14532d';
    hfCtx.beginPath();
    hfCtx.arc(ex, 104, 12, 0, Math.PI * 2);
    hfCtx.fill();
    hfCtx.fillStyle = '#ffffff';
    hfCtx.beginPath();
    hfCtx.arc(ex - 4, 100, 4.5, 0, Math.PI * 2);
    hfCtx.fill();
  }
  hfCtx.strokeStyle = '#78350f';
  hfCtx.lineWidth = 5;
  hfCtx.beginPath();
  hfCtx.arc(128, 148, 28, 0.2 * Math.PI, 0.8 * Math.PI);
  hfCtx.stroke();
  const herbalistFace = finalizeColorTexture(hfCan, maxAnisotropy, 1, 1);

  // 10b5. Explorer Тарас face (trail scar + compass-keen eyes)
  const [efCan, efCtx] = makeCanvas(256, 256);
  efCtx.fillStyle = '#ecc094';
  efCtx.fillRect(0, 0, 256, 256);
  efCtx.strokeStyle = 'rgba(180, 83, 9, 0.45)';
  efCtx.lineWidth = 5;
  efCtx.beginPath();
  efCtx.moveTo(154, 72);
  efCtx.lineTo(188, 136);
  efCtx.stroke();
  for (const ex of [88, 168]) {
    efCtx.fillStyle = '#0f172a';
    efCtx.beginPath();
    efCtx.arc(ex, 104, 11, 0, Math.PI * 2);
    efCtx.fill();
    efCtx.fillStyle = '#38bdf8';
    efCtx.beginPath();
    efCtx.arc(ex, 105, 6, 0, Math.PI * 2);
    efCtx.fill();
    efCtx.fillStyle = '#ffffff';
    efCtx.beginPath();
    efCtx.arc(ex - 3, 100, 3.5, 0, Math.PI * 2);
    efCtx.fill();
  }
  efCtx.fillStyle = '#78350f';
  efCtx.fillRect(88, 152, 80, 11);
  const explorerFace = finalizeColorTexture(efCan, maxAnisotropy, 1, 1);

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

  // 12. Crisp Water ripple normal map (256x256, linear space, fast startup)
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const dx =
        Math.cos(u * 3 + v * 2) * 0.34 +
        Math.cos(u * 6 - v * 4) * 0.22 +
        Math.sin(u * 2 + v * 7) * 0.14;
      const dy =
        Math.sin(u * 2 + v * 3) * 0.34 +
        Math.cos(u * 4 + v * 6) * 0.22 -
        Math.sin(u * 7 - v * 2) * 0.14;
      const nx = Math.max(0, Math.min(255, Math.floor((dx * 0.48 + 0.5) * 255)));
      const ny = Math.max(0, Math.min(255, Math.floor((dy * 0.48 + 0.5) * 255)));
      const idx = (y * size + x) * 4;
      data[idx] = nx;
      data[idx + 1] = ny;
      data[idx + 2] = 244;
      data[idx + 3] = 255;
    }
  }
  const waterRippleNormal = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  waterRippleNormal.wrapS = THREE.RepeatWrapping;
  waterRippleNormal.wrapT = THREE.RepeatWrapping;
  waterRippleNormal.repeat.set(4, 14);
  waterRippleNormal.needsUpdate = true;

  // 12b. Seamless Organic Water Foam & River Streaking Texture (256x256)
  const [fmCan, fmCtx] = makeCanvas(256, 256);
  fmCtx.fillStyle = '#000000';
  fmCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    const fx = Math.random() * 256;
    const fy = Math.random() * 256;
    const rx = 3 + Math.random() * 11;
    const ry = 6 + Math.random() * 18;
    const alpha = 0.09 + Math.random() * 0.26;
    const rot = (Math.random() - 0.5) * 0.45;
    fmCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    fmCtx.lineWidth = 1.2 + Math.random() * 2.0;
    wrapDraw(fmCtx, 256, fx, fy, 24, (ox, oy) => {
      fmCtx.beginPath();
      fmCtx.ellipse(ox, oy, rx, ry, rot, 0, Math.PI * 2);
      fmCtx.stroke();
    });
  }
  const waterFoam = finalizeColorTexture(fmCan, maxAnisotropy, 1, 1);

  // 12c. Fast Seamless Analytical Underwater Caustics Web Texture (256x256, <4ms)
  const [caCan, caCtx] = makeCanvas(256, 256);
  const cImg = caCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    const v = (y / 256) * Math.PI * 2;
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2;
      const wA = Math.sin(u * 3 + Math.sin(v * 2) * 1.15);
      const wB = Math.sin(v * 3 + Math.cos(u * 2) * 1.15);
      const wC = Math.sin((u + v) * 2 + Math.cos((u - v) * 2) * 0.95);
      const web = Math.abs(wA + wB) * 0.5 + Math.abs(wC) * 0.35;
      const ridge = Math.max(0, 1 - web * 1.35);
      const val = Math.min(255, Math.floor(Math.pow(ridge, 1.7) * 255));
      const idx = (y * 256 + x) * 4;
      cImg.data[idx] = val;
      cImg.data[idx + 1] = val;
      cImg.data[idx + 2] = val;
      cImg.data[idx + 3] = 255;
    }
  }
  caCtx.putImageData(cImg, 0, 0);
  const waterCaustics = finalizeColorTexture(caCan, maxAnisotropy, 1, 1);

  // 13. Heraldic Shield Crest Texture (256x256)
  const [shCan, shCtx] = makeCanvas(256, 256);
  const shGrad = shCtx.createLinearGradient(0, 0, 256, 256);
  shGrad.addColorStop(0, '#1e3a8a');
  shGrad.addColorStop(1, '#0f172a');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 256, 256);
  shCtx.strokeStyle = '#f59e0b';
  shCtx.lineWidth = 14;
  shCtx.strokeRect(10, 10, 236, 236);
  shCtx.fillStyle = '#38bdf8';
  shCtx.beginPath();
  shCtx.moveTo(128, 42);
  shCtx.lineTo(186, 128);
  shCtx.lineTo(128, 214);
  shCtx.lineTo(70, 128);
  shCtx.closePath();
  shCtx.fill();
  shCtx.strokeStyle = '#fde047';
  shCtx.lineWidth = 6;
  shCtx.stroke();
  const shieldEmblem = finalizeColorTexture(shCan, maxAnisotropy, 1, 1);

  // 14. Hinged Wooden Cabin Door Texture (256x512)
  const [drCan, drCtx] = makeCanvas(256, 512);
  drCtx.fillStyle = '#4e2f19';
  drCtx.fillRect(0, 0, 256, 512);
  for (let p = 0; p < 4; p++) {
    drCtx.fillStyle = p % 2 === 0 ? '#5b371e' : '#4a2b17';
    drCtx.fillRect(p * 64 + 3, 4, 58, 504);
  }
  drCtx.fillStyle = '#1f2937';
  drCtx.fillRect(0, 96, 256, 26);
  drCtx.fillRect(0, 386, 256, 26);
  drCtx.fillStyle = '#fbbf24';
  drCtx.beginPath();
  drCtx.arc(214, 266, 14, 0, Math.PI * 2);
  drCtx.fill();
  const doorWood = finalizeColorTexture(drCan, maxAnisotropy, 1, 1);

  // 15. Forge & Herbalist Wooden Signboards
  const makeBannerSign = (text: string, bg: string, border: string, textCol: string) => {
    const [c, cx] = makeCanvas(512, 192);
    cx.fillStyle = bg;
    cx.fillRect(0, 0, 512, 192);
    cx.strokeStyle = border;
    cx.lineWidth = 10;
    cx.strokeRect(10, 10, 492, 172);
    cx.fillStyle = textCol;
    cx.font = 'bold 74px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, 256, 98);
    return finalizeColorTexture(c, maxAnisotropy, 1, 1);
  };
  const forgeSign = makeBannerSign('КУЗНЯ', '#1e293b', '#f97316', '#fed7aa');
  const herbalSign = makeBannerSign('ТРАВИ', '#14331d', '#4ade80', '#dcfce7');
  const bakerySign = makeBannerSign('ПЕКАРНЯ', '#451a03', '#fbbf24', '#fef3c7');
  const alchemySign = makeBannerSign('АЛХІМІЯ', '#2e1065', '#c084fc', '#f3e8ff');
  const tavernSign = makeBannerSign('КОРЧМА', '#3f1d0b', '#f59e0b', '#fde68a');
  const townhallSign = makeBannerSign('РАТУША', '#172554', '#facc15', '#fef9c3');

  // 16. Pixel-crisp Minecraft-style Cobblestone, Deepslate & Ore Block Textures (16x16 voxel grid upscaled)
  const makePixelBlock = (drawPixels: (px: (x: number, y: number, col: string) => void) => void) => {
    const [c, cx] = makeCanvas(256, 256);
    const cell = 16; // 16x16 grid
    const px = (gx: number, gy: number, col: string) => {
      cx.fillStyle = col;
      cx.fillRect(gx * cell, gy * cell, cell, cell);
    };
    drawPixels(px);
    const tex = finalizeColorTexture(c, maxAnisotropy, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  };

  const minecraftCobble = makePixelBlock((px) => {
    const tones = ['#68635e', '#78716c', '#857d77', '#5a5652', '#948b83', '#605c58'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4);
        const shift = (row % 2) * 3;
        const seamH = y % 4 === 0;
        const seamV = (x + shift) % 5 === 0;
        const topEdge = y % 4 === 1 && !seamV;
        const idx = (x * 7 + y * 13 + row * 3) % tones.length;
        px(x, y, seamH || seamV ? '#292524' : topEdge ? '#a8a29e' : tones[idx]);
      }
    }
    // Crisp mossy tufts along stone joints
    for (const [mx, my, mc] of [
      [2, 3, '#4d7c0f'], [3, 3, '#65a30d'], [11, 8, '#3f6212'], [12, 9, '#65a30d'],
      [6, 14, '#4d7c0f'], [7, 13, '#65a30d'], [14, 2, '#4d7c0f'],
    ] as [number, number, string][]) {
      px(mx, my, mc);
    }
  });

  const minecraftDeepslate = makePixelBlock((px) => {
    const tones = ['#23262e', '#2d313c', '#3a3f4b', '#1c1f26', '#333844'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const seamH = y % 4 === 0;
        const seamV = (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0;
        const bevel = y % 4 === 1 && !seamV;
        const idx = (x * 5 + y * 11) % tones.length;
        px(x, y, seamH || seamV ? '#111318' : bevel ? '#4b5263' : tones[idx]);
      }
    }
  });

  const minecraftOre = makePixelBlock((px) => {
    const stoneTones = ['#434954', '#505763', '#363b45', '#4a4f5a'];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const seam = y % 5 === 0 || (x + y) % 9 === 0;
        px(x, y, seam ? '#262a33' : stoneTones[(x * 3 + y * 7) % stoneTones.length]);
      }
    }
    const orePixels: [number, number, string][] = [
      [2, 3, '#0284c7'], [3, 3, '#38bdf8'], [4, 3, '#bae6fd'], [3, 4, '#0369a1'],
      [10, 4, '#d97706'], [11, 4, '#facc15'], [11, 3, '#fef08a'], [12, 5, '#b45309'],
      [5, 10, '#059669'], [6, 10, '#34d399'], [6, 11, '#a7f3d0'], [5, 11, '#047857'],
      [11, 11, '#9333ea'], [12, 11, '#c084fc'], [13, 11, '#f3e8ff'], [12, 12, '#7e22ce'],
    ];
    for (const [ox, oy, col] of orePixels) px(ox, oy, col);
  });

  // 17. Warm Village Plaza Cobblestone Paving (512x512)
  const [pzCan, pzCtx] = makeCanvas(512, 512);
  pzCtx.fillStyle = '#575046';
  pzCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 10; row++) {
    const y = row * 51.2;
    const off = (row % 2) * 26;
    for (let col = -1; col < 10; col++) {
      const x = col * 58 + off;
      const base = 135 + Math.floor(Math.random() * 34);
      pzCtx.fillStyle = `rgb(${base + 10}, ${base + 2}, ${base - 10})`;
      pzCtx.beginPath();
      pzCtx.roundRect(x + 3, y + 3, 52, 45, 7);
      pzCtx.fill();
      pzCtx.fillStyle = 'rgba(255,245,220,0.14)';
      pzCtx.fillRect(x + 6, y + 5, 44, 5);
    }
  }
  const plazaCobble = finalizeColorTexture(pzCan, maxAnisotropy, 3, 3);

  // 18. Packed Trampled Dirt Trail Surface (256x256)
  const [trCan, trCtx] = makeCanvas(256, 256);
  trCtx.fillStyle = '#73583c';
  trCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const shade = Math.random();
    trCtx.fillStyle =
      shade < 0.35
        ? 'rgba(72, 50, 32, 0.45)'
        : shade < 0.72
          ? 'rgba(138, 108, 74, 0.35)'
          : 'rgba(168, 154, 134, 0.28)';
    trCtx.beginPath();
    trCtx.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 4.5, 0, Math.PI * 2);
    trCtx.fill();
  }
  const wornTrailDirt = finalizeColorTexture(trCan, maxAnisotropy, 1, 1);

  // 19. Four New Village NPC Faces
  // Mayor Староста Мирослав (wise gray beard, warm eyes, gold brow)
  const [myCan, myCtx] = makeCanvas(256, 256);
  myCtx.fillStyle = '#f0c095';
  myCtx.fillRect(0, 0, 256, 256);
  myCtx.fillStyle = '#cbd5e1';
  myCtx.fillRect(20, 166, 216, 90);
  myCtx.fillStyle = '#94a3b8';
  myCtx.fillRect(72, 146, 112, 24);
  for (const ex of [88, 168]) {
    myCtx.fillStyle = '#1e293b';
    myCtx.beginPath();
    myCtx.arc(ex, 104, 11, 0, Math.PI * 2);
    myCtx.fill();
    myCtx.fillStyle = '#ffffff';
    myCtx.beginPath();
    myCtx.arc(ex - 3, 100, 4, 0, Math.PI * 2);
    myCtx.fill();
  }
  myCtx.strokeStyle = '#94a3b8';
  myCtx.lineWidth = 8;
  myCtx.beginPath();
  myCtx.moveTo(64, 78);
  myCtx.lineTo(108, 84);
  myCtx.moveTo(192, 78);
  myCtx.lineTo(148, 84);
  myCtx.stroke();
  const mayorFace = finalizeColorTexture(myCan, maxAnisotropy, 1, 1);

  // Baker Пекарка Галина (rosy cheeks, cheerful smile)
  const [bkCan, bkCtx] = makeCanvas(256, 256);
  bkCtx.fillStyle = '#f8d2ae';
  bkCtx.fillRect(0, 0, 256, 256);
  bkCtx.fillStyle = 'rgba(244, 63, 94, 0.28)';
  bkCtx.beginPath();
  bkCtx.ellipse(60, 136, 20, 12, 0, 0, Math.PI * 2);
  bkCtx.ellipse(196, 136, 20, 12, 0, 0, Math.PI * 2);
  bkCtx.fill();
  for (const ex of [88, 168]) {
    bkCtx.fillStyle = '#451a03';
    bkCtx.beginPath();
    bkCtx.arc(ex, 104, 12, 0, Math.PI * 2);
    bkCtx.fill();
    bkCtx.fillStyle = '#ffffff';
    bkCtx.beginPath();
    bkCtx.arc(ex - 4, 100, 4.5, 0, Math.PI * 2);
    bkCtx.fill();
  }
  bkCtx.strokeStyle = '#9a3412';
  bkCtx.lineWidth = 6;
  bkCtx.beginPath();
  bkCtx.arc(128, 146, 30, 0.16 * Math.PI, 0.84 * Math.PI);
  bkCtx.stroke();
  const bakerFace = finalizeColorTexture(bkCan, maxAnisotropy, 1, 1);

  // Alchemist Алхімік Лев (glowing cyan-violet goggles + arcane grin)
  const [alCan, alCtx] = makeCanvas(256, 256);
  alCtx.fillStyle = '#e7bd94';
  alCtx.fillRect(0, 0, 256, 256);
  alCtx.fillStyle = '#334155';
  alCtx.fillRect(0, 82, 256, 48);
  for (const ex of [84, 172]) {
    alCtx.fillStyle = '#a855f7';
    alCtx.beginPath();
    alCtx.arc(ex, 106, 26, 0, Math.PI * 2);
    alCtx.fill();
    alCtx.strokeStyle = '#fbbf24';
    alCtx.lineWidth = 6;
    alCtx.stroke();
    alCtx.fillStyle = '#f3e8ff';
    alCtx.beginPath();
    alCtx.arc(ex - 8, 98, 7, 0, Math.PI * 2);
    alCtx.fill();
  }
  alCtx.fillStyle = '#581c87';
  alCtx.fillRect(102, 174, 52, 62);
  alCtx.strokeStyle = '#1e1b4b';
  alCtx.lineWidth = 5;
  alCtx.beginPath();
  alCtx.arc(128, 152, 24, 0.15 * Math.PI, 0.85 * Math.PI);
  alCtx.stroke();
  const alchemistFace = finalizeColorTexture(alCan, maxAnisotropy, 1, 1);

  // Guard Вартовий Северин (determined eyes + cheek scar)
  const [gdCan, gdCtx] = makeCanvas(256, 256);
  gdCtx.fillStyle = '#eab88d';
  gdCtx.fillRect(0, 0, 256, 256);
  gdCtx.strokeStyle = '#991b1b';
  gdCtx.lineWidth = 5;
  gdCtx.beginPath();
  gdCtx.moveTo(56, 118);
  gdCtx.lineTo(86, 154);
  gdCtx.stroke();
  for (const ex of [88, 168]) {
    gdCtx.fillStyle = '#0f172a';
    gdCtx.fillRect(ex - 13, 96, 26, 16);
    gdCtx.fillStyle = '#f8fafc';
    gdCtx.fillRect(ex - 9, 98, 7, 7);
  }
  gdCtx.strokeStyle = '#1c1917';
  gdCtx.lineWidth = 9;
  gdCtx.beginPath();
  gdCtx.moveTo(58, 74);
  gdCtx.lineTo(112, 88);
  gdCtx.moveTo(198, 74);
  gdCtx.lineTo(144, 88);
  gdCtx.stroke();
  gdCtx.fillStyle = '#334155';
  gdCtx.fillRect(92, 162, 72, 10);
  const guardFace = finalizeColorTexture(gdCan, maxAnisotropy, 1, 1);

  return {
    grassTile,
    grassNormal,
    sandBankTile,
    cliffRockTile,
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
    terracottaRoof,
    nordicSlate,
    plasterTimber,
    shopSign,
    caveRock,
    stoneBlock,
    hoodieFabric,
    denimFabric,
    robloxFace,
    slimeGel,
    goblinSkin,
    goblinFace,
    golemStone,
    bossArmor,
    wolfFur,
    skeletonBone,
    sheepWool,
    villagerFace,
    merchantFace,
    blacksmithFace,
    herbalistFace,
    explorerFace,
    deerCoat,
    contactShadow,
    waterRippleNormal,
    waterFoam,
    waterCaustics,
    shieldEmblem,
    doorWood,
    forgeSign,
    herbalSign,
    bakerySign,
    alchemySign,
    tavernSign,
    townhallSign,
    minecraftCobble,
    minecraftDeepslate,
    minecraftOre,
    plazaCobble,
    wornTrailDirt,
    mayorFace,
    bakerFace,
    alchemistFace,
    guardFace,
    dispose: () => {
      grassTile.dispose();
      grassNormal.dispose();
      sandBankTile.dispose();
      cliffRockTile.dispose();
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
      terracottaRoof.dispose();
      nordicSlate.dispose();
      plasterTimber.dispose();
      shopSign.dispose();
      caveRock.dispose();
      stoneBlock.dispose();
      hoodieFabric.dispose();
      denimFabric.dispose();
      robloxFace.dispose();
      slimeGel.dispose();
      goblinSkin.dispose();
      goblinFace.dispose();
      golemStone.dispose();
      bossArmor.dispose();
      wolfFur.dispose();
      skeletonBone.dispose();
      sheepWool.dispose();
      villagerFace.dispose();
      merchantFace.dispose();
      blacksmithFace.dispose();
      herbalistFace.dispose();
      explorerFace.dispose();
      deerCoat.dispose();
      contactShadow.dispose();
      waterRippleNormal.dispose();
      waterFoam.dispose();
      waterCaustics.dispose();
      shieldEmblem.dispose();
      doorWood.dispose();
      forgeSign.dispose();
      herbalSign.dispose();
      bakerySign.dispose();
      alchemySign.dispose();
      tavernSign.dispose();
      townhallSign.dispose();
      minecraftCobble.dispose();
      minecraftDeepslate.dispose();
      minecraftOre.dispose();
      plazaCobble.dispose();
      wornTrailDirt.dispose();
      mayorFace.dispose();
      bakerFace.dispose();
      alchemistFace.dispose();
      guardFace.dispose();
    },
  };
}
