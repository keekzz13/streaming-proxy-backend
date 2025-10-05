const express = require('express');
const tmdbScrape = require('./vidsrc.ts').default;

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/stream', async (req, res) => {
  const { tmdbId, type, season, episode } = req.query;
  if (!tmdbId || !type) {
    return res.status(400).json({ error: 'Missing tmdbId or type' });
  }

  try {
    const streams = await tmdbScrape(tmdbId, type, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined);
    res.json(streams);
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Extractor server running on http://localhost:${PORT}`);
});
