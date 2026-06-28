import express from 'express';

const app  = express();
const KEY   = process.env.ELEVEN_KEY   || '';
const VOICE = process.env.ELEVEN_VOICE || 'ErXwobaYiN019PkySvjV';
const ORIGIN = process.env.ALLOW_ORIGIN || 'https://theo-games.chuve.co';

app.use(express.json());

app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', ORIGIN);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('/tts', (_req, res) => res.sendStatus(204));

app.post('/tts', async (req, res) => {
  const text = req.body?.text?.trim();
  if (!text)  return res.status(400).json({ error: 'missing text' });
  if (!KEY)   return res.status(503).json({ error: 'ELEVEN_KEY not configured' });

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).send(err);
    }

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`tts-proxy listening on :${port}`));
