// Renders the duck game music to music.wav using the same oscillator logic
const fs = require('fs');

const SR   = 44100;
const BPM  = 160;
const BEAT = 60 / BPM;

const C3=130.81,D3=146.83,E3=164.81,F3=174.61,G3=196.00,A3=220.00;
const C4=261.63,D4=293.66,E4=329.63,F4=349.23,G4=392.00,A4=440.00;
const C5=523.25,D5=587.33,E5=659.26,F5=698.46,G5=783.99,A5=880.00;
const R = 0;

const MELODY = [
  [E5,0.5],[D5,0.5],[C5,1],  [G5,0.5],[E5,0.5],[C5,1],
  [D5,0.5],[E5,0.5],[F5,0.5],[E5,0.5],[D5,1],  [R,0.5],
  [G5,0.5],[F5,0.5],[E5,1],  [C5,0.5],[E5,0.5],[G5,1],
  [A5,0.5],[G5,0.5],[E5,0.5],[D5,0.5],[C5,2],
  [E5,0.5],[G5,0.5],[A5,1],  [G5,0.5],[E5,0.5],[D5,1],
  [C5,0.5],[D5,0.5],[E5,0.5],[D5,0.5],[C5,1],  [R,0.5],
  [C5,0.5],[E5,0.5],[G5,0.5],[A5,0.5],[G5,1],  [E5,1],
  [D5,0.5],[C5,0.5],[D5,0.5],[E5,0.5],[C5,2],  [R,0.5],
];

const BASS = [
  [C3,1],[C3,1],[G3,1],[G3,1],
  [A3,1],[A3,1],[F3,1],[G3,1],
  [C3,1],[C3,1],[G3,1],[E3,1],
  [F3,1],[G3,1],[C3,1],[R,1],
];

const PULSE = [
  [R,1],[C5,0.25],[R,0.75],[R,1],[G4,0.25],[R,0.75],
  [R,1],[A4,0.25],[R,0.75],[R,1],[E4,0.25],[R,0.75],
];

// Compute loop length (LCM of all track durations)
const dur = arr => arr.reduce((s,[,b]) => s + b * BEAT, 0);
const melDur  = dur(MELODY);
const bassDur = dur(BASS);
const pulDur  = dur(PULSE);
const loopSec = Math.max(melDur, bassDur, pulDur);
const LOOPS   = 1;
const totalSec = loopSec * LOOPS + 0.3; // small tail for last note decay
const N = Math.ceil(totalSec * SR);
const buf = new Float32Array(N);

function square(phase)   { return Math.sign(Math.sin(phase)); }
function triangle(phase) { return (2 / Math.PI) * Math.asin(Math.sin(phase)); }

// Render a sequence of [freq, beats] notes with given wave and volume
function renderTrack(seq, wave, vol) {
  let t = 0;
  let loop = 0;
  while (t < totalSec) {
    for (const [freq, beats] of seq) {
      const dur = beats * BEAT;
      const attack = 0.01;
      const release = Math.min(0.06, dur * 0.3);
      const sustain = dur - attack - release;
      if (freq === 0) { t += dur; continue; }
      const startSample = Math.round(t * SR);
      const totalSamples = Math.round(dur * SR);
      for (let i = 0; i < totalSamples; i++) {
        const si = startSample + i;
        if (si >= N) break;
        const localT = i / SR;
        // Envelope
        let env;
        if      (localT < attack)            env = localT / attack;
        else if (localT < attack + sustain)  env = 1.0;
        else                                 env = 1 - (localT - attack - sustain) / release;
        env = Math.max(0, env);
        const phase = 2 * Math.PI * freq * localT;
        const sample = wave === 'square' ? square(phase) : triangle(phase);
        buf[si] += sample * env * vol;
      }
      t += dur;
      if (t >= totalSec) break;
    }
  }
}

renderTrack(MELODY, 'square',   0.10);
renderTrack(BASS,   'triangle', 0.07);
renderTrack(PULSE,  'square',   0.05);

// Normalize
const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
if (peak > 0) for (let i = 0; i < N; i++) buf[i] /= peak * 1.1;

// Write WAV
function writeWav(filename, samples, sr) {
  const dataLen = samples.length * 2;
  const header  = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLen, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1,  20); // PCM
  header.writeUInt16LE(1,  22); // mono
  header.writeUInt32LE(sr, 24);
  header.writeUInt32LE(sr * 2, 28);
  header.writeUInt16LE(2,  32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLen, 40);
  const data = Buffer.alloc(dataLen);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  fs.writeFileSync(filename, Buffer.concat([header, data]));
}

writeWav('music.wav', buf, SR);
console.log(`Wrote music.wav — ${(N / SR).toFixed(2)}s`);
