import * as THREE from "three";

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

/** Seeded RNG so textures look the same every load. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function floorTexture() {
  const r = rng(7);
  return canvasTex(1024, 1024, (g) => {
    const plank = 128;
    for (let row = 0; row < 1024 / plank; row++) {
      let x = -r() * 400;
      while (x < 1024) {
        const len = 260 + r() * 340;
        const l = 38 + r() * 12;
        g.fillStyle = `hsl(${26 + r() * 8}, ${42 + r() * 12}%, ${l}%)`;
        g.fillRect(x, row * plank, len, plank);
        g.globalAlpha = 0.12;
        for (let i = 0; i < 14; i++) {
          g.strokeStyle = r() > 0.5 ? "#2b1a0e" : "#e8c497";
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          const y = row * plank + r() * plank;
          g.moveTo(x, y);
          g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 18, x + len * 0.7, y + (r() - 0.5) * 18, x + len, y);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = "#24150b";
        g.fillRect(x, row * plank, 3, plank);
        x += len;
      }
      g.fillStyle = "#1d1108";
      g.fillRect(0, row * plank, 1024, 3);
    }
  }, [5, 4]);
}

export function wallTexture() {
  const r = rng(11);
  return canvasTex(512, 512, (g) => {
    g.fillStyle = "#e7d9bd";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(120,90,50,0.05)" : "rgba(255,255,255,0.08)";
      const s = 2 + r() * 10;
      g.fillRect(r() * 512, r() * 512, s, s);
    }
  }, [6, 1.5]);
}

export function wainscotTexture() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = "#2f4a43";
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 4; i++) {
      const x = i * 128;
      g.fillStyle = "#284039";
      g.fillRect(x + 14, 30, 100, 196);
      g.strokeStyle = "#3d5e55";
      g.lineWidth = 4;
      g.strokeRect(x + 14, 30, 100, 196);
    }
    g.fillStyle = "#b98a55";
    g.fillRect(0, 0, 512, 12);
  }, [10, 1]);
}

export function ceilingTexture() {
  const r = rng(3);
  return canvasTex(512, 512, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `hsl(28, 30%, ${22 + r() * 6}%)`;
      g.fillRect(0, i * 64, 512, 64);
      g.fillStyle = "#140c07";
      g.fillRect(0, i * 64, 512, 2);
    }
  }, [6, 6]);
}

export function posterTexture(title: string, sub: string, bg: string, fg: string) {
  return canvasTex(512, 720, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 720);
    g.strokeStyle = fg;
    g.lineWidth = 10;
    g.strokeRect(24, 24, 464, 672);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.font = "800 92px 'Bricolage Grotesque', sans-serif";
    title.split("\n").forEach((l, i) => g.fillText(l, 256, 250 + i * 96));
    g.font = "500 34px 'IBM Plex Mono', monospace";
    sub.split("\n").forEach((l, i) => g.fillText(l, 256, 520 + i * 46));
    // gear icon
    g.beginPath();
    g.arc(256, 110, 44, 0, Math.PI * 2);
    g.lineWidth = 16;
    g.stroke();
  });
}

export function signTexture() {
  return canvasTex(1024, 256, (g) => {
    g.fillStyle = "#1f2f2a";
    g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = "#c99a3e";
    g.lineWidth = 8;
    g.strokeRect(14, 14, 996, 228);
    g.fillStyle = "#f2e6cf";
    g.textAlign = "center";
    g.font = "800 120px 'Bricolage Grotesque', sans-serif";
    g.fillText("COUNTERFIX", 512, 140);
    g.fillStyle = "#e2683c";
    g.font = "600 36px 'IBM Plex Mono', monospace";
    g.fillText("REPAIRS · PARTS · HONEST ADVICE", 512, 205);
  });
}

export function labelTexture(text: string, color: string) {
  return canvasTex(256, 96, (g) => {
    g.fillStyle = "#f7f3ea";
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = color;
    g.fillRect(0, 0, 18, 96);
    g.fillStyle = "#2a2522";
    g.textAlign = "center";
    g.font = "700 34px 'IBM Plex Mono', monospace";
    g.fillText(text, 138, 60);
  });
}

export function crackTexture() {
  const r = rng(42);
  return canvasTex(256, 512, (g) => {
    g.fillStyle = "#0d1724";
    g.fillRect(0, 0, 256, 512);
    const cx = 90 + r() * 80, cy = 160 + r() * 120;
    g.strokeStyle = "rgba(220,235,255,0.75)";
    for (let i = 0; i < 16; i++) {
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      let x = cx, y = cy;
      g.moveTo(x, y);
      const a = r() * Math.PI * 2;
      for (let k = 0; k < 6; k++) {
        x += Math.cos(a + (r() - 0.5) * 0.8) * (20 + r() * 50);
        y += Math.sin(a + (r() - 0.5) * 0.8) * (20 + r() * 50);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let ring = 1; ring < 4; ring++) {
      g.beginPath();
      g.lineWidth = 1;
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const rr = ring * 26 + r() * 10;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
  });
}

export function screenOnTexture() {
  return canvasTex(256, 512, (g) => {
    const grd = g.createLinearGradient(0, 0, 256, 512);
    grd.addColorStop(0, "#2f6553");
    grd.addColorStop(1, "#e2683c");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 512);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.textAlign = "center";
    g.font = "600 64px 'IBM Plex Mono', monospace";
    g.fillText("12:00", 128, 160);
  });
}
