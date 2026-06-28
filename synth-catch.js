// Renders the catch "quack" blip to catch.wav
const fs = require('fs');
const SR = 44100;

function square(phase) { return Math.sign(Math.sin(phase)); }

const notes = [[440, 0.07], [660, 0.07], [880, 0.12]];
const totalSec = notes.reduce((s, [, d]) => s + d, 0) + 0.05;
const N   = Math.ceil(totalSec * SR);
const buf = new Float32Array(N);

let t = 0;
for (const [freq, dur] of notes) {
  const release = dur * 0.4;
  const sustain = dur - release;
  const start = Math.round(t * SR);
  const len   = Math.round(dur * SR);
  for (let i = 0; i < len; i++) {
    const si = start + i;
    if (si >= N) break;
    const lt  = i / SR;
    const env = lt < sustain ? 1 : 1 - (lt - sustain) / release;
    buf[si] += square(2 * Math.PI * freq * lt) * Math.max(0, env) * 0.28;
  }
  t += dur;
}

function writeWav(filename, samples, sr) {
  const dataLen = samples.length * 2;
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF',0); hdr.writeUInt32LE(36+dataLen,4); hdr.write('WAVE',8);
  hdr.write('fmt ',12); hdr.writeUInt32LE(16,16); hdr.writeUInt16LE(1,20);
  hdr.writeUInt16LE(1,22); hdr.writeUInt32LE(sr,24); hdr.writeUInt32LE(sr*2,28);
  hdr.writeUInt16LE(2,32); hdr.writeUInt16LE(16,34);
  hdr.write('data',36); hdr.writeUInt32LE(dataLen,40);
  const data = Buffer.alloc(dataLen);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i])) * 32767), i*2);
  }
  fs.writeFileSync(filename, Buffer.concat([hdr, data]));
}

writeWav('catch.wav', buf, SR);
console.log(`Wrote catch.wav — ${(N/SR*1000).toFixed(0)}ms`);
