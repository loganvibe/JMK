const https = require('https');
const token = 'REDACTED_SUPABASE_TOKEN';
const ref = 'vkwpcxbizxwlcgjtxwxo';

function mgmtApi(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1' + path,
      method: method,
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
    };
    if (body) {
      const b = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(b);
    }
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('Check project...');
  const p = await mgmtApi('/projects/' + ref);
  console.log('Project status:', p.status);
  console.log('Project body:', p.body.substring(0, 500));

  console.log('\nCheck database...');
  const d = await mgmtApi('/projects/' + ref + '/database');
  console.log('Database status:', d.status);
  console.log('Database body:', d.body.substring(0, 500));

  console.log('\nCheck service_role via management API reveal...');
  const sr = await mgmtApi('/projects/' + ref + '/api-keys/reveal', 'POST', { type: 'service_role', name: 'service_role' });
  console.log('Reveal status:', sr.status);
  console.log('Reveal body:', sr.body.substring(0, 500));

  process.exit(0);
})();
