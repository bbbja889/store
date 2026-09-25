import * as THREE from 'three';

/** 4×4 atlas of white glyphs drawn procedurally (no image assets). Index 15 is the "mask". */
export const GLYPH_COUNT = 16;
export const MASK_GLYPH = 15;

type Draw = (c: CanvasRenderingContext2D) => void;

const glyphs: Draw[] = [
  // 0 camera
  (c) => {
    rr(c, -0.36, -0.22, 0.72, 0.5, 0.1);
    c.stroke();
    c.beginPath();
    c.arc(0, 0.03, 0.14, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.14, -0.22);
    c.lineTo(-0.08, -0.32);
    c.lineTo(0.08, -0.32);
    c.lineTo(0.14, -0.22);
    c.stroke();
  },
  // 1 chat
  (c) => {
    rr(c, -0.36, -0.3, 0.72, 0.46, 0.14);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.16, 0.16);
    c.lineTo(-0.24, 0.34);
    c.lineTo(0.02, 0.16);
    c.stroke();
  },
  // 2 music
  (c) => {
    c.beginPath();
    c.moveTo(-0.1, 0.22);
    c.lineTo(-0.1, -0.3);
    c.lineTo(0.28, -0.36);
    c.lineTo(0.28, 0.14);
    c.stroke();
    fillCircle(c, -0.2, 0.24, 0.1);
    fillCircle(c, 0.18, 0.16, 0.1);
  },
  // 3 pin
  (c) => {
    c.beginPath();
    c.moveTo(0, 0.36);
    c.bezierCurveTo(-0.34, 0.02, -0.26, -0.34, 0, -0.34);
    c.bezierCurveTo(0.26, -0.34, 0.34, 0.02, 0, 0.36);
    c.stroke();
    c.beginPath();
    c.arc(0, -0.08, 0.09, 0, Math.PI * 2);
    c.stroke();
  },
  // 4 play
  (c) => {
    c.beginPath();
    c.moveTo(-0.16, -0.28);
    c.lineTo(0.3, 0);
    c.lineTo(-0.16, 0.28);
    c.closePath();
    c.fill();
  },
  // 5 gear
  (c) => {
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i / 8) * Math.PI * 2);
      c.fillRect(-0.06, -0.36, 0.12, 0.14);
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 0.24, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 0.08, 0, Math.PI * 2);
    c.stroke();
  },
  // 6 globe
  (c) => {
    c.beginPath();
    c.arc(0, 0, 0.32, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, 0.13, 0.32, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.32, 0);
    c.lineTo(0.32, 0);
    c.stroke();
  },
  // 7 cart
  (c) => {
    c.beginPath();
    c.moveTo(-0.38, -0.28);
    c.lineTo(-0.26, -0.28);
    c.lineTo(-0.16, 0.12);
    c.lineTo(0.26, 0.12);
    c.lineTo(0.34, -0.16);
    c.lineTo(-0.22, -0.16);
    c.stroke();
    fillCircle(c, -0.1, 0.27, 0.06);
    fillCircle(c, 0.2, 0.27, 0.06);
  },
  // 8 book
  (c) => {
    c.beginPath();
    c.moveTo(0, -0.22);
    c.quadraticCurveTo(-0.2, -0.32, -0.38, -0.26);
    c.lineTo(-0.38, 0.26);
    c.quadraticCurveTo(-0.2, 0.2, 0, 0.3);
    c.quadraticCurveTo(0.2, 0.2, 0.38, 0.26);
    c.lineTo(0.38, -0.26);
    c.quadraticCurveTo(0.2, -0.32, 0, -0.22);
    c.lineTo(0, 0.3);
    c.stroke();
  },
  // 9 heart
  (c) => {
    c.beginPath();
    c.moveTo(0, 0.32);
    c.bezierCurveTo(-0.46, 0.02, -0.28, -0.4, 0, -0.16);
    c.bezierCurveTo(0.28, -0.4, 0.46, 0.02, 0, 0.32);
    c.fill();
  },
  // 10 bolt
  (c) => {
    c.beginPath();
    c.moveTo(0.06, -0.38);
    c.lineTo(-0.22, 0.04);
    c.lineTo(0.0, 0.04);
    c.lineTo(-0.06, 0.38);
    c.lineTo(0.24, -0.06);
    c.lineTo(0.02, -0.06);
    c.closePath();
    c.fill();
  },
  // 11 code
  (c) => {
    c.beginPath();
    c.moveTo(-0.14, -0.22);
    c.lineTo(-0.34, 0);
    c.lineTo(-0.14, 0.22);
    c.moveTo(0.14, -0.22);
    c.lineTo(0.34, 0);
    c.lineTo(0.14, 0.22);
    c.moveTo(0.06, -0.3);
    c.lineTo(-0.06, 0.3);
    c.stroke();
  },
  // 12 cloud
  (c) => {
    c.beginPath();
    c.moveTo(-0.26, 0.18);
    c.arc(-0.22, 0.04, 0.14, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(-0.02, -0.08, 0.2, Math.PI * 1.1, Math.PI * 1.9);
    c.arc(0.22, 0.04, 0.14, Math.PI * 1.5, Math.PI * 0.5);
    c.closePath();
    c.stroke();
  },
  // 13 lock
  (c) => {
    rr(c, -0.26, -0.04, 0.52, 0.38, 0.06);
    c.stroke();
    c.beginPath();
    c.arc(0, -0.08, 0.16, Math.PI, 0);
    c.lineTo(0.16, -0.04);
    c.moveTo(-0.16, -0.04);
    c.lineTo(-0.16, -0.08);
    c.stroke();
    fillCircle(c, 0, 0.14, 0.05);
  },
  // 14 star
  (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.15 : 0.36;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  },
  // 15 mask (skull) — revealed when a corrupted tile glitches
  (c) => {
    c.beginPath();
    c.arc(0, -0.06, 0.3, Math.PI * 0.85, Math.PI * 2.15);
    c.lineTo(0.16, 0.34);
    c.lineTo(-0.16, 0.34);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    fillCircle(c, -0.12, -0.04, 0.085);
    fillCircle(c, 0.12, -0.04, 0.085);
    c.beginPath();
    c.moveTo(0, 0.06);
    c.lineTo(-0.05, 0.15);
    c.lineTo(0.05, 0.15);
    c.fill();
    for (const x of [-0.08, 0, 0.08]) c.fillRect(x - 0.012, 0.24, 0.024, 0.1);
    c.globalCompositeOperation = 'source-over';
  },
];

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fillCircle(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

let cached: THREE.CanvasTexture | null = null;

export function glyphAtlas(): THREE.CanvasTexture {
  if (cached) return cached;
  const cell = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cell * 4;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff';
  c.strokeStyle = '#fff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  glyphs.forEach((draw, i) => {
    c.save();
    c.translate((i % 4) * cell + cell / 2, Math.floor(i / 4) * cell + cell / 2);
    c.scale(cell, cell);
    c.lineWidth = 0.075;
    draw(c);
    c.restore();
  });
  cached = new THREE.CanvasTexture(canvas);
  cached.anisotropy = 4;
  cached.generateMipmaps = true;
  cached.minFilter = THREE.LinearMipmapLinearFilter;
  cached.flipY = false;
  cached.needsUpdate = true;
  return cached;
}
