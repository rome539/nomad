// Frames + timestamps -> mp4. The concat demuxer honors per-frame durations,
// so the video's clock matches the page's clock exactly.
import ffmpegPath from "ffmpeg-static";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(readFileSync(join(here, "frames.json"), "utf8"));

const lines = ["ffconcat version 1.0"];
for (let i = 0; i < meta.length; i++) {
  const dur = i + 1 < meta.length ? meta[i + 1].ts - meta[i].ts : 1.5;
  lines.push(`file 'frames/${meta[i].file}'`);
  lines.push(`duration ${Math.max(dur, 0.001).toFixed(4)}`);
}
lines.push(`file 'frames/${meta.at(-1).file}'`); // concat quirk: repeat last
writeFileSync(join(here, "list.ffconcat"), lines.join("\n"));

const out = join(here, "nomad-promo.mp4");
execFileSync(
  ffmpegPath,
  [
    "-y", "-f", "concat", "-safe", "0", "-i", "list.ffconcat",
    "-i", "audio.wav",
    "-fps_mode", "vfr",
    "-c:v", "libx264", "-crf", "18", "-preset", "slow",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest", "-movflags", "+faststart",
    out,
  ],
  { cwd: here, stdio: ["ignore", "inherit", "inherit"] },
);
console.log("wrote", out);
