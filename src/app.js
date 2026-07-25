import express from 'express';
import { fileURLToPath } from 'node:url';

const publicPath = fileURLToPath(new URL('../public', import.meta.url));
const cafe24MallId = 'df6d';
const cafe24ClientId = 'F79PeGqf20Le8Hvh63GfCA';
const cafe24OAuthState = '886321e3baf3';
const cafe24RedirectUri =
  'https://cafe24-frontsdk.vercel.app/oauth/authorize';
const cafe24ScriptUrl =
  'https://cafe24-frontsdk.vercel.app/script-ignis.js';
const cafe24AuthorizationEndpoint =
  `https://${cafe24MallId}.cafe24api.com/api/v2/oauth/authorize`;
const cafe24TokenEndpoint =
  `https://${cafe24MallId}.cafe24api.com/api/v2/oauth/token`;
const cafe24AuthorizationParams = {
  response_type: 'code',
  client_id: cafe24ClientId,
  state: cafe24OAuthState,
  redirect_uri: cafe24RedirectUri,
  scope:
    'mall.write_order mall.read_application mall.write_application',
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

async function parseCafe24Response(response, operation) {
  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const error = new Error(
      `${operation} failed with HTTP ${response.status}`,
    );
    error.status = response.status;
    error.response = responseBody;
    throw error;
  }

  return responseBody;
}

export function getRawQueryString(originalUrl) {
  const queryStartIndex = originalUrl.indexOf('?');

  return queryStartIndex === -1 ? '' : originalUrl.slice(queryStartIndex + 1);
}

export function createApp({
  logger = console,
  fetchImpl = fetch,
  cafe24ClientSecret = process.env.CAFE24_CLIENT_SECRET,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.static(publicPath));

  app.get('/', (_req, res) => {
    res.status(200).type('html').send(renderAuthorizationPage());
  });

  app.get('/oauth/authorize', async (req, res) => {
    const queryString = getRawQueryString(req.originalUrl);

    logger.info(
      '[GET /oauth/authorize] querystring=%s',
      queryString || '(empty)',
    );

    const { code, state } = req.query;

    if (typeof code !== 'string' || !code) {
      return res.status(400).json({
        error: 'Missing authorization code',
      });
    }

    if (state !== cafe24OAuthState) {
      return res.status(401).json({
        error: 'Invalid OAuth state',
      });
    }

    if (!cafe24ClientSecret) {
      logger.error(
        '[GET /oauth/authorize] CAFE24_CLIENT_SECRET is not configured',
      );

      return res.status(500).json({
        error: 'Cafe24 OAuth is not configured',
      });
    }

    try {
      const basicAuthorization = Buffer.from(
        `${cafe24ClientId}:${cafe24ClientSecret}`,
      ).toString('base64');
      const tokenResponse = await fetchImpl(cafe24TokenEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuthorization}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: cafe24RedirectUri,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const token = await parseCafe24Response(
        tokenResponse,
        'Cafe24 token exchange',
      );

      if (!token?.access_token) {
        throw new Error('Cafe24 token response has no access token');
      }

      const mallId = token.mall_id || cafe24MallId;
      const scriptTagResponse = await fetchImpl(
        `https://${mallId}.cafe24api.com/api/v2/admin/scripttags`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shop_no: Number(token.shop_no || 1),
            request: {
              src: cafe24ScriptUrl,
              display_location: ['PRODUCT_DETAIL'],
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const scriptTag = await parseCafe24Response(
        scriptTagResponse,
        'Cafe24 script tag creation',
      );

      logger.info(
        '[GET /oauth/authorize] Cafe24 script tag created=%o',
        scriptTag,
      );

      return res.status(201).json({
        message: 'Cafe24 script tag created',
        scriptTag,
      });
    } catch (error) {
      logger.error(
        '[GET /oauth/authorize] Cafe24 script tag creation failed=%o',
        error,
      );

      return res.status(502).json({
        error: 'Failed to create Cafe24 script tag',
      });
    }
  });

  return app;
}

const app = createApp();

export default app;
