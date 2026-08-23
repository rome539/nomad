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

const out = join(here, process.argv[2] || "nomad-promo.mp4");

// EVERY FRAME IS FORCED BACK TO 1920x1080, and this is not belt-and-braces:
// the CDP screencast intermittently emits a single odd-sized frame (a 1741x1080
// turned up in a 622-frame take), the concat demuxer takes its geometry from
// the first frame, and libx264 then dies with "Error initializing output
// stream" partway through an encode that has already cost a real-time playback
// to capture. It looked random -- two of four renders -- until the frames were
// measured. Scale-to-fit, pad the remainder, pin the aspect: a stray frame gets
// letterboxed for one 30th of a second instead of killing the take.
const CANVAS = "scale=1920:1080:force_original_aspect_ratio=decrease,"
             + "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1";

execFileSync(
  ffmpegPath,
  [
    "-y", "-f", "concat", "-safe", "0", "-i", "list.ffconcat",
    "-i", "audio.wav",
    "-fps_mode", "vfr",
    "-vf", CANVAS,
    "-c:v", "libx264", "-crf", "18", "-preset", "slow",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest", "-movflags", "+faststart",
    out,
  ],
  { cwd: here, stdio: ["ignore", "inherit", "inherit"] },
);
console.log("wrote", out);
