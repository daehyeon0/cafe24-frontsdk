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

test('GET / returns 200 OK', async () => {
  const app = createApp();
  const baseUrl = await startServer(app);

  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'OK');
});

test('the default export handles requests as an Express application', async () => {
  const baseUrl = await startServer(app);

  const response = await fetch(baseUrl, {
    signal: AbortSignal.timeout(500),
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'OK');
});

test('GET /script-ignis.js serves the static JavaScript file', async () => {
  const app = createApp();
  const baseUrl = await startServer(app);

  const response = await fetch(`${baseUrl}/script-ignis.js`);

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type'),
    /^text\/javascript; charset=utf-8$/,
  );
  assert.equal(
    await response.text(),
    '// Ignis browser script entry point.\n',
  );
});

test('GET /oauth/authorize logs the raw query string', async () => {
  const logs = [];
  const app = createApp({
    logger: {
      info: (...args) => logs.push(args),
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(
    `${baseUrl}/oauth/authorize?client_id=my-client&scope=openid%20profile&scope=email`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: 'Authorization request received',
  });
  assert.deepEqual(logs, [
    [
      '[GET /oauth/authorize] querystring=%s',
      'client_id=my-client&scope=openid%20profile&scope=email',
    ],
  ]);
});

test('GET /oauth/authorize logs empty query strings', async () => {
  const logs = [];
  const app = createApp({
    logger: {
      info: (...args) => logs.push(args),
    },
  });
  const baseUrl = await startServer(app);

  const response = await fetch(`${baseUrl}/oauth/authorize`);

  assert.equal(response.status, 200);
  assert.deepEqual(logs, [
    ['[GET /oauth/authorize] querystring=%s', '(empty)'],
  ]);
});
