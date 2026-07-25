import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import app, { createApp } from '../src/app.js';

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function startServer(app) {
  const server = app.listen(0);
  servers.push(server);

  await new Promise((resolve) => server.once('listening', resolve));

  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('GET / renders a Cafe24 OAuth request button', async () => {
  const app = createApp();
  const baseUrl = await startServer(app);

  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html;/);
  assert.match(
    html,
    /<form method="get" action="https:\/\/df6d\.cafe24api\.com\/api\/v2\/oauth\/authorize">/,
  );
  assert.match(
    html,
    /<input type="hidden" name="response_type" value="code">/,
  );
  assert.match(
    html,
    /<input type="hidden" name="client_id" value="F79PeGqf20Le8Hvh63GfCA">/,
  );
  assert.match(
    html,
    /<input type="hidden" name="state" value="886321e3baf3">/,
  );
  assert.match(
    html,
    /<input type="hidden" name="redirect_uri" value="https:\/\/cafe24-frontsdk\.vercel\.app\/oauth\/authorize">/,
  );
  assert.match(
    html,
    /<input type="hidden" name="scope" value="mall\.write_order mall\.read_application mall\.write_application">/,
  );
  assert.match(html, /<button type="submit">Cafe24 OAuth 인증<\/button>/);
});

test('the default export handles requests as an Express application', async () => {
  const baseUrl = await startServer(app);

  const response = await fetch(`${baseUrl}/script-ignis.js`);

  assert.equal(response.status, 200);
});

test('GET /script-ignis.js serves the static JavaScript file', async () => {
  const app = createApp();
  const baseUrl = await startServer(app);

  const response = await fetch(`${baseUrl}/script-ignis.js`);
  const script = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type'),
    /^text\/javascript; charset=utf-8$/,
  );
  assert.match(script, /^\(function initIgnisQuantityPicker/);
  assert.match(script, /var QUANTITY_OPTIONS = Object\.freeze/);
});

test('GET /oauth/authorize exchanges the code and creates a script tag', async () => {
  const fetchCalls = [];
  const logs = [];
  const app = createApp({
    cafe24ClientSecret: 'client-secret',
    fetchImpl: async (url, options) => {
      fetchCalls.push([url, options]);

      if (url.endsWith('/oauth/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'access-token',
            mall_id: 'df6d',
            shop_no: '1',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          scripttag: {
            script_no: 123,
            src: 'https://cafe24-frontsdk.vercel.app/script-ignis.js',
          },
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    },
    logger: {
      info: (...args) => logs.push(args),
      error: (...args) => logs.push(args),
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(
    `${baseUrl}/oauth/authorize?code=authorization-code&state=886321e3baf3`,
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: 'Cafe24 script tag created',
    scriptTag: {
      scripttag: {
        script_no: 123,
        src: 'https://cafe24-frontsdk.vercel.app/script-ignis.js',
      },
    },
  });
  assert.equal(fetchCalls.length, 2);
  assert.equal(
    fetchCalls[0][0],
    'https://df6d.cafe24api.com/api/v2/oauth/token',
  );
  assert.equal(fetchCalls[0][1].method, 'POST');
  assert.equal(
    fetchCalls[0][1].headers.Authorization,
    `Basic ${Buffer.from('F79PeGqf20Le8Hvh63GfCA:client-secret').toString('base64')}`,
  );
  assert.equal(
    fetchCalls[0][1].body.toString(),
    'grant_type=authorization_code&code=authorization-code&redirect_uri=https%3A%2F%2Fcafe24-frontsdk.vercel.app%2Foauth%2Fauthorize',
  );
  assert.equal(
    fetchCalls[1][0],
    'https://df6d.cafe24api.com/api/v2/admin/scripttags',
  );
  assert.equal(fetchCalls[1][1].method, 'POST');
  assert.equal(
    fetchCalls[1][1].headers.Authorization,
    'Bearer access-token',
  );
  assert.deepEqual(JSON.parse(fetchCalls[1][1].body), {
    shop_no: 1,
    request: {
      src: 'https://cafe24-frontsdk.vercel.app/script-ignis.js',
      display_location: ['PRODUCT_DETAIL'],
    },
  });
  assert.deepEqual(logs, [
    [
      '[GET /oauth/authorize] querystring=%s',
      'code=authorization-code&state=886321e3baf3',
    ],
    [
      '[GET /oauth/authorize] Cafe24 script tag created=%o',
      {
        scripttag: {
          script_no: 123,
          src: 'https://cafe24-frontsdk.vercel.app/script-ignis.js',
        },
      },
    ],
  ]);
});

test('GET /oauth/authorize rejects requests without an authorization code', async () => {
  const logs = [];
  const app = createApp({
    logger: {
      info: (...args) => logs.push(args),
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(`${baseUrl}/oauth/authorize`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Missing authorization code',
  });
  assert.deepEqual(logs, [
    ['[GET /oauth/authorize] querystring=%s', '(empty)'],
  ]);
});

test('GET /oauth/authorize rejects invalid OAuth state values', async () => {
  const app = createApp({
    logger: {
      info: () => {},
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(
    `${baseUrl}/oauth/authorize?code=authorization-code&state=invalid`,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'Invalid OAuth state',
  });
});

test('GET /oauth/authorize requires CAFE24_CLIENT_SECRET', async () => {
  const logs = [];
  const app = createApp({
    cafe24ClientSecret: '',
    logger: {
      info: (...args) => logs.push(args),
      error: (...args) => logs.push(args),
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(
    `${baseUrl}/oauth/authorize?code=authorization-code&state=886321e3baf3`,
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: 'Cafe24 OAuth is not configured',
  });
  assert.deepEqual(logs.at(-1), [
    '[GET /oauth/authorize] CAFE24_CLIENT_SECRET is not configured',
  ]);
});
