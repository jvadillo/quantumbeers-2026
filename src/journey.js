// Los puntos describen posiciones físicas. El scroll recorre la curva sin cortes de cámara.
export const cameraStops = [
  { p: [0, 2.5, 21], look: [1.4, 1.2, 0] },
  { p: [3, 1.5, 4], look: [3, 1.5, -12] },
  { p: [3, 1.5, -20], look: [9, 2, -38] },
  { p: [16, 5, -27], look: [12, 1, -40] },
  { p: [5, 3, -40], look: [10, 1, -48] },
  { p: [2, 1.5, -59], look: [-4, 1, -78] },
  { p: [-3, 3.5, -70], look: [-8, 1.5, -85] },
  { p: [-15, 3, -83], look: [-7, 1, -90] },
  { p: [-5, 2, -103], look: [5, 1, -123] },
  { p: [11, 4, -115], look: [8, 1, -132] },
  { p: [4, 0.5, -137], look: [-2, 1, -157] },
  { p: [-4, 2, -154], look: [-3, 1, -177] },
  { p: [0, 3, -166], look: [-3, 0.6, -182] },
  { p: [-8, 2.5, -182], look: [-1, 1, -191] },
  { p: [0, 2, -204], look: [0, 2, -225] },
  { p: [0, 3, -213], look: [0, 1, -229] },
];
export const CHAPTER_COUNT = 6;
export function chapterAt(progress) { return Math.min(5, Math.max(0, Math.floor(progress * 5 + 0.18))); }
export function chapterProgress(index) { return index / 5; }
export function damp(current, target, delta, speed = 5) { return current + (target - current) * (1 - Math.exp(-speed * delta)); }
export function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
