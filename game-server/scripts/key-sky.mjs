// THE SKY CUT ITSELF, on raw RGBA, apart from the tool so a test can run it.
//
// ABOVE THE LAND everything magenta goes, however faint, and the pink comes off
// what is left: the small sky gaps in a tree's leaves come out blurred, and left
// in they read as pink specks. BELOW THE LAND nothing goes but true sky and the
// fringe touching it (a window, a gap under an arch), and purple flowers out on
// the ground keep their shape and their colour.
//
// The land starts under the lowest row that is still a real run of sky.
const SKY = 150;       // near-pure magenta: real skies read 197+, flowers under 60
const FRINGE = 30;     // compression fringe
const RIM = 3;         // how far below the land a skyline's pink is taken off
const SKY_ROW = 0.05;  // the share of a row that makes it still sky, not a window

export function keySky(data, w, h) {
  const n = w * h;
  const spill = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    spill[i] = Math.min(data[p] - data[p + 1], data[p + 2] - data[p + 1]);
  }
  let land = 0;
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) if (spill[y * w + x] > SKY) c++;
    if (c >= w * SKY_ROW) land = y + 1;
  }
  const gone = new Uint8Array(n);
  const stack = [];
  for (let i = 0; i < n; i++) {
    if (spill[i] > SKY || (i < land * w && spill[i] > FRINGE)) { gone[i] = 1; stack.push(i); }
  }
  while (stack.length) {
    const i = stack.pop(), x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < n && !gone[j] && spill[j] > FRINGE) { gone[j] = 1; stack.push(j); }
    }
  }
  let cut = 0;
  const near = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!gone[i]) continue;
    cut++;
    const x = i % w, y = (i - x) / w;
    for (let dy = Math.max(0, y - RIM); dy <= Math.min(h - 1, y + RIM); dy++)
      for (let dx = Math.max(0, x - RIM); dx <= Math.min(w - 1, x + RIM); dx++) near[dy * w + dx] = 1;
  }
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (gone[i]) { data[p] = data[p + 1] = data[p + 2] = data[p + 3] = 0; continue; }
    if ((near[i] || i < land * w) && spill[i] > 0) {
      data[p] = Math.max(0, data[p] - spill[i]);
      data[p + 2] = Math.max(0, data[p + 2] - spill[i]);
    }
  }
  return cut;
}
