// First-person movement maths. Pure: plain numbers in, plain numbers out.
export interface Vec2 { x: number; z: number }
export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }

export const WALK_SPEED = 3.4;
export const SPRINT_SPEED = 5.6;
export const PLAYER_RADIUS = 0.35;
export const EYE_HEIGHT = 1.62;

/**
 * Camera-relative move vector. yaw = camera.rotation.y (three.js, YXZ order).
 * At yaw 0 the camera looks down -Z. fwd: +1 = W, strafe: +1 = D.
 */
export function moveVector(yaw: number, fwd: number, strafe: number): Vec2 {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // forward
  const rx = Math.cos(yaw), rz = -Math.sin(yaw); // right
  let x = fx * fwd + rx * strafe;
  let z = fz * fwd + rz * strafe;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  return { x, z };
}

/** Keyboard codes → axes. W/↑ forward, S/↓ back, D/→ right, A/← left. */
export function keysToAxes(held: Set<string>): { fwd: number; strafe: number } {
  const f = (held.has("KeyW") || held.has("ArrowUp") ? 1 : 0) - (held.has("KeyS") || held.has("ArrowDown") ? 1 : 0);
  const r = (held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) - (held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0);
  return { fwd: f, strafe: r };
}

/** Push a circle out of every box and clamp it inside the room. */
export function collide(p: Vec2, radius: number, boxes: Box[], room: Box): Vec2 {
  let { x, z } = p;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      } else {
        // centre inside the box: leave by the nearest side
        const opts = [
          { v: x - b.minX, fx: b.minX - radius, fz: z },
          { v: b.maxX - x, fx: b.maxX + radius, fz: z },
          { v: z - b.minZ, fx: x, fz: b.minZ - radius },
          { v: b.maxZ - z, fx: x, fz: b.maxZ + radius },
        ].sort((a, c) => a.v - c.v)[0]!;
        x = opts.fx; z = opts.fz;
      }
    }
  }
  x = Math.max(room.minX + radius, Math.min(room.maxX - radius, x));
  z = Math.max(room.minZ + radius, Math.min(room.maxZ - radius, z));
  return { x, z };
}

/** Ray vs sphere; returns distance along the ray or null. dir must be normalised. */
export function raySphere(
  o: [number, number, number], d: [number, number, number], c: [number, number, number], r: number,
): number | null {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  return t >= 0 ? t : cc <= 0 ? 0 : null;
}
