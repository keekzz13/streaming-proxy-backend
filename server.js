const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

const adDomains = [
  'googleadservices.com', 'doubleclick.net', 'adservice.google',
  'popads.net', 'propellerads.com', 'adnxs.com', 'pubmatic.com',
  'adskeeper.com', 'vliplatform.com', 'adsterra.com', 'propellerclick.com',
  'exoclick.com', 'adform.net'
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
    // Update with fresh cookies from Step 2
    const cookies = targetUrl.includes('2embed')
      ? 'PHPSESSID=<new_value>; SITE_TOTAL_ID=<new_value>; __cf_bm=<new_value>'
      : '__cf_bm=<new_value>';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': targetUrl.includes('2embed') ? 'https://www.2embed.cc/' : targetUrl.includes('vidsrc.to') ? 'https://vidsrc.to/' : 'https://vidsrc.me/',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Sec-CH-UA': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'CF-Connecting-IP': '192.0.2.1',
      'X-Forwarded-For': '192.0.2.1',
      'Cookie': cookies
    };

    const response = await axios.get(targetUrl, {
      headers,
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 500
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    if (contentType.includes('text/html')) {
      const $ = cheerio.load(response.data);

      $('script[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && adDomains.some(domain => src.includes(domain))) {
          console.log(`Blocked ad script: ${src}`);
          $(el).remove();
        }
      });

      $('div[class*="ad"], div[id*="ad"], iframe[src*="ad"], .advertisement, .popup-ad, .adsbyvli, .ad-container, .vli-ad, .ad-overlay, .ad-slot, .ad-banner, .ad-wrapper').remove();

      $('script').each((i, el) => {
        const scriptText = $(el).html();
        if (scriptText && (scriptText.includes('ad') || scriptText.includes('popup') || scriptText.includes('_cf_chl_opt'))) {
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
      res.set('Content-Type', contentType);
      res.send(response.data);
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data ? String(error.response.data).substring(0, 200) : 'No response data';
    console.error(`Proxy error for ${targetUrl}: ${error.message}, Status: ${status}, Response: ${responseData}`);
    res.status(500).json({
      error: 'Proxy failed',
      details: error.message,
      status,
      response: responseData
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
