const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3001;

const adDomains = [
  'googleadservices.com', 'doubleclick.net', 'adservice.google',
  'popads.net', 'propellerads.com',
];

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (response.headers['content-type']?.includes('text/html')) {
      const $ = cheerio.load(response.data);

      $('script[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && adDomains.some(domain => src.includes(domain))) {
          $(el).remove();
        }
      });

      $('div[class*="ad"], div[id*="ad"], iframe[src*="ad"], .advertisement, .popup-ad').remove();

      $('script').each((i, el) => {
        const scriptText = $(el).html();
        if (scriptText && (scriptText.includes('ad') || scriptText.includes('popup'))) {
          $(el).remove();
        }
      });

      $('img[src], link[href], script[src]').each((i, el) => {
        const attr = el.tagName === 'img' ? 'src' : el.tagName === 'link' ? 'href' : 'src';
        let val = $(el).attr(attr);
        if (val && !val.startsWith('http')) {
          val = new URL(val, targetUrl).href;
          $(el).attr(attr, val);
        }
      });

      res.set('Content-Type', 'text/html');
      res.send($.html());
    } else {
      res.set(response.headers);
      res.send(response.data);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
