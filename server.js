const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const cloudscraper = require('cloudscraper');

const app = express();
const PORT = process.env.PORT || 10000;

const adDomains = [
  'googleadservices.com', 'doubleclick.net', 'adservice.google',
  'popads.net', 'propellerads.com', 'adnxs.com', 'pubmatic.com',
  'adskeeper.com', 'vliplatform.com', 'adsterra.com'
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
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': targetUrl.includes('2embed') ? 'https://www.2embed.cc/' : targetUrl.includes('vidsrc.to') ? 'https://vidsrc.to/' : 'https://vidsrc.me/',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Cookie': 'PHPSESSID=27lfeaec1gfnv0b2gqn3vneh0v; SITE_TOTAL_ID=aOJ223HXtoblQvR2_l09VAAAAAE'
    };

    const response = await cloudscraper.get(targetUrl, { headers, timeout: 10000 });

    if (typeof response === 'string' && response.includes('text/html')) {
      const $ = cheerio.load(response);

      $('script[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && adDomains.some(domain => src.includes(domain))) {
          console.log(`Blocked ad script: ${src}`);
          $(el).remove();
        }
      });

      $('div[class*="ad"], div[id*="ad"], iframe[src*="ad"], .advertisement, .popup-ad, .adsbyvli, .ad-container, .vli-ad, .ad-overlay').remove();

      $('script').each((i, el) => {
        const scriptText = $(el).html();
        if (scriptText && (scriptText.includes('ad') || scriptText.includes('popup'))) {
          console.log(`Blocked inline ad script: ${scriptText.substring(0, 50)}...`);
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
      res.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      res.send(response);
    }
  } catch (error) {
    console.error(`Proxy error for ${targetUrl}:`, error.message, error.response?.status);
    res.status(500).json({ error: 'Proxy failed', details: error.message, status: error.response?.status });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
