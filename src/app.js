import express from 'express';
import { fileURLToPath } from 'node:url';

const publicPath = fileURLToPath(new URL('../public', import.meta.url));
const cafe24AuthorizationEndpoint =
  'https://df6d.cafe24api.com/api/v2/oauth/authorize';
const cafe24AuthorizationParams = {
  response_type: 'code',
  client_id: 'F79PeGqf20Le8Hvh63GfCA',
  state: '886321e3baf3',
  redirect_uri: 'https://cafe24-frontsdk.vercel.app/oauth/authorize',
  scope: 'mall.write_order,mall.read_application',
};

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character],
  );
}

function renderAuthorizationPage() {
  const hiddenInputs = Object.entries(cafe24AuthorizationParams)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
    )
    .join('\n        ');

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cafe24 OAuth</title>
  </head>
  <body>
    <form method="get" action="${cafe24AuthorizationEndpoint}">
      ${hiddenInputs}
      <button type="submit">Cafe24 OAuth 인증</button>
    </form>
  </body>
</html>`;
}

export function getRawQueryString(originalUrl) {
  const queryStartIndex = originalUrl.indexOf('?');

  return queryStartIndex === -1 ? '' : originalUrl.slice(queryStartIndex + 1);
}

export function createApp({ logger = console } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.static(publicPath));

  app.get('/', (_req, res) => {
    res.status(200).type('html').send(renderAuthorizationPage());
  });

  app.get('/oauth/authorize', (req, res) => {
    const queryString = getRawQueryString(req.originalUrl);

    logger.info(
      '[GET /oauth/authorize] querystring=%s',
      queryString || '(empty)',
    );

    res.status(200).json({
      message: 'Authorization request received',
    });
  });

  return app;
}

const app = createApp();

export default app;
