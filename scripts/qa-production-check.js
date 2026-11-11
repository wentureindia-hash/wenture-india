const https = require('https');

const BASE_URL = 'https://www.wentureindia.com';

const routes = [
  '/',
  '/discover',
  '/for-entrepreneurs',
  '/for-investors',
  '/how-it-works',
  '/about',
  '/contact',
  '/guides',
  '/guides/angel-investment',
  '/guides/business-franchise',
  '/guides/business-investment',
  '/guides/business-partnerships',
  '/guides/venture-capital',
  '/opportunities',
  '/investors',
  '/login',
  '/login/entrepreneur',
  '/login/investor',
  '/signup',
  '/signup/entrepreneur',
  '/signup/investor',
  '/profile',
  '/profile/investor',
  '/profile/listings',
  '/admin',
  '/admin/enquiries',
  '/admin/featured',
  '/admin/guides',
  '/admin/investors',
  '/admin/listings',
  '/admin/opportunities',
  '/admin/settings',
  '/admin/users',
  '/admin/verifications',
];

function checkRoute(path) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { if (data.length < 5000) data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          hasViewportMeta: data.includes('name="viewport"'),
          contentLength: res.headers['content-length'] || data.length,
          titleMatch: data.match(/<title>([^<]*)<\/title>/i)?.[1] || 'No title'
        });
      });
    }).on('error', (err) => {
      resolve({ path, status: 0, error: err.message });
    });
  });
}

async function run() {
  console.log(`Checking live production site: ${BASE_URL}\n`);
  const results = [];
  for (const r of routes) {
    const res = await checkRoute(r);
    results.push(res);
    console.log(`[${res.status}] ${res.path} -> ${res.titleMatch || res.error || ''}`);
  }

  const successCount = results.filter(r => r.status >= 200 && r.status < 400).length;
  console.log(`\nResults: ${successCount} / ${routes.length} routes returned 2xx/3xx on production.`);
}

run();

