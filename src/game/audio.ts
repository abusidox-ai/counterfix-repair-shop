// Tiny synthesized sound set (no files). Created lazily on first user gesture.
let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slide = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(dur: number, gain: number, delay = 0, hp = 1500) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  bell: () => { tone(2093, 1.2, "sine", 0.18); tone(4186, 0.6, "sine", 0.05); },
  screw: () => { for (let i = 0; i < 5; i++) noise(0.05, 0.12, i * 0.07, 2500); tone(180, 0.08, "square", 0.03, 0.36); },
  ratchet: () => { for (let i = 0; i < 4; i++) { noise(0.03, 0.18, i * 0.09, 3500); tone(900, 0.03, "square", 0.03, i * 0.09); } },
  pop: () => tone(320, 0.12, "triangle", 0.12, 0, 0.5),
  click: () => tone(1200, 0.04, "square", 0.04),
  fit: () => { tone(440, 0.08, "triangle", 0.1); tone(660, 0.12, "triangle", 0.1, 0.08); },
  register: () => { noise(0.08, 0.15, 0, 800); tone(1568, 0.5, "sine", 0.12, 0.1); tone(2093, 0.6, "sine", 0.08, 0.18); },
  bad: () => tone(160, 0.18, "sawtooth", 0.05),
  door: () => { tone(1318, 0.4, "sine", 0.08); tone(1046, 0.6, "sine", 0.08, 0.15); },
};
