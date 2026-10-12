// Real official Moyasar.js, synthetic payment responses. External traffic is blocked.
// Uses the browser tools already provided by the development environment.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const scriptURL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.umd.js';
const cssURL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.css';
function asset(url, cached, integrity) {
  const data = fs.existsSync(cached) ? fs.readFileSync(cached) : execFileSync('curl', ['-fsSL', '--max-time', '20', url]);
  assert.equal('sha384-' + crypto.createHash('sha384').update(data).digest('base64'), integrity, 'official pinned artifact integrity');
  return data;
}
const script = asset(scriptURL, '/tmp/moyasar-230-jsdelivr.umd.js', 'sha384-zaoyfKoayFfcaZQLYxWEYqjG/of8gAw5lYVmKz68FG4j8tm27LqmqNFuIPlNtdLd');
const css = asset(cssURL, '/tmp/moyasar-230-jsdelivr.css', 'sha384-kXA6TcBKVzqpjpsbaJciletoxOQ3kNhUKCCMPpZaXA2MOhJMTaqVspZdFxXo5iTA');
const intentId = '00000000-0000-4000-8000-000000000020';
const orderId = '00000000-0000-4000-8000-000000000001';
const attemptId = '00000000-0000-4000-8000-000000000021';
const paymentId = '00000000-0000-4000-8000-000000000200';
async function fill(page) {
  await page.locator('#mysr-cc-name').pressSequentially('Synthetic User');
  await page.locator('#mysr-cc-number').pressSequentially('4111111111111111');
  const ids = await page.locator('input').evaluateAll(nodes => nodes.map(n => ({ id: n.id, placeholder: n.placeholder })));
  const expiry = ids.find(x => /expiry|expiration|date/i.test(x.id) || /MM/i.test(x.placeholder));
  const cvc = ids.find(x => /cvc|cvv/i.test(x.id) || /cvc|cvv/i.test(x.placeholder));
  assert.ok(expiry, JSON.stringify(ids)); assert.ok(cvc, JSON.stringify(ids));
  await page.locator('#' + expiry.id).pressSequentially('1235');
  await page.locator('#' + cvc.id).pressSequentially('123');
}

test('official 2.3.0 hooks post only to the single-use fulfill endpoint under two tabs', { timeout: 60000 }, async t => {
  let prepares = 0, verified = 0, charges = 0, fulfillRequests = 0, blockedExternal = 0;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="/sdk.css"></head>
    <body><div class="mysr-form"></div><script src="/sdk.js"></script><script>
    window.completed=0;window.hooks=0;
    Moyasar.init({element:'.mysr-form',amount:19900,currency:'SAR',description:'Synthetic',language:'ar',
      publishable_api_key:'pk_test_${'A'.repeat(40)}',callback_url:location.origin+'/never-charge',methods:['creditcard'],
      use_payment_intent:true,on_initiating:async()=>{window.hooks++;const response=await fetch('/intent',{method:'POST'});
        const decision=await response.json();return {payment_intent:decision.payment_intent,metadata:{order_id:'${orderId}',attempt_id:'${attemptId}'}}},
      on_completed:async p=>{window.completed++;await fetch('/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:'${orderId}',payment_id:p.id})})},
      on_redirect:async url=>{window.redirectURL=url}});
    </script></body></html>`;
  const server = http.createServer((request, response) => {
    if (request.url === '/sdk.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(script); }
    else if (request.url === '/sdk.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); }
    else if (request.url === '/intent') {
      prepares++; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ status: 'ready',
        payment_intent: { id: intentId, client_secret: 'pi_secret_synthetic_only' } }));
    } else if (request.url === '/verify') {
      let body = ''; request.on('data', x => { body += x; }); request.on('end', () => {
        const value = JSON.parse(body); assert.deepEqual(Object.keys(value).sort(), ['order_id', 'payment_id']);
        assert.equal(value.payment_id, paymentId); verified++; response.setHeader('Content-Type', 'application/json'); response.end('{}');
      });
    } else { response.setHeader('Content-Type', 'text/html'); response.end(html); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const address = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const context = await browser.newContext();
  await context.route('**/*', async route => {
    const request = route.request(), url = request.url();
    if (url.startsWith(address)) return route.continue();
    if (url === `https://api.moyasar.com/v1/payment_intents/${intentId}/fulfill`) {
      fulfillRequests++; const body = request.postDataJSON();
      assert.equal(body.client_secret, 'pi_secret_synthetic_only'); assert.equal(body.metadata.order_id, orderId); assert.equal(body.metadata.attempt_id, attemptId);
      assert.equal(body.amount, 19900); assert.equal(body.currency, 'SAR'); assert.equal(body.source.type, 'creditcard');
      if (charges > 0) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ type: 'intent_not_fulfillable', message: 'Already consumed', errors: null }) });
      charges++; return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        id: paymentId, status: 'paid', amount: 19900, currency: 'SAR', metadata: body.metadata, source: { type: 'creditcard', company: 'visa', message: 'synthetic approved' },
      }) });
    }
    blockedExternal++; await route.abort();
  });
  const a = await context.newPage(), b = await context.newPage();
  await Promise.all([a.goto(address), b.goto(address)]);
  assert.equal(prepares, 0, 'no intent API called just by opening page');
  await Promise.all([fill(a), fill(b)]);
  await Promise.all([a.locator('button[type=submit]').click(), b.locator('button[type=submit]').click()]);
  try { await Promise.all([a.waitForFunction(() => window.hooks === 1, null, { timeout: 5000 }), b.waitForFunction(() => window.hooks === 1, null, { timeout: 5000 })]); }
  catch (error) { console.log({ prepares, fulfillRequests, verified, body: await a.locator('body').innerText(), inputs:await a.locator('input').evaluateAll(nodes=>nodes.map(n=>({id:n.id,value:n.value}))) }); throw error; }
  for (let i = 0; i < 50 && (fulfillRequests < 2 || verified < 1); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(prepares, 2); assert.equal(fulfillRequests, 2); assert.equal(charges, 1); assert.equal(verified, 1);
  assert.equal((await a.evaluate(() => window.completed)) + (await b.evaluate(() => window.completed)), 1);
  assert.equal(blockedExternal, 0, 'no fallback to direct payment creation or telemetry');
});
