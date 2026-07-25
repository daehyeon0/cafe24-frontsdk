import express from 'express';
import { fileURLToPath } from 'node:url';

const publicPath = fileURLToPath(new URL('../public', import.meta.url));
const CAFE24_MALL_ID = 'df6d';
const CAFE24_CLIENT_ID = 'F79PeGqf20Le8Hvh63GfCA';
const CAFE24_AUTH_STATE = '886321e3baf3';

const OAUTH_CLIENT_ORIGIN_PROD = 'https://cafe24-frontsdk.vercel.app';
const OAUTH_CLIENT_ORIGIN_PREVIEW =
  'https://cafe24-frontsdk-6lci2feqg-dd70296-1022s-projects.vercel.app';

const CAFE24_AUTHORIZATION_ENDPOINT =
  `https://${CAFE24_MALL_ID}.cafe24api.com/api/v2/oauth/authorize`;
const CAFE24_TOKEN_ENDPOINT =
  `https://${CAFE24_MALL_ID}.cafe24api.com/api/v2/oauth/token`;
const cafe24AuthorizationParams = {
  response_type: 'code',
  client_id: CAFE24_CLIENT_ID,
  state: CAFE24_AUTH_STATE,
  scope:
    'mall.write_order mall.read_application mall.write_application',
};
const cafe24AuthorizationTargets = [
  {
    buttonTitle: '운영 배포 script 설정',
    redirectUri: `${OAUTH_CLIENT_ORIGIN_PROD}/oauth/authorize`,
  },
  {
    buttonTitle: '프리뷰 배포 script 설정',
    redirectUri: `${OAUTH_CLIENT_ORIGIN_PREVIEW}/oauth/authorize`,
  },
];

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
  const forms = cafe24AuthorizationTargets
    .map((target) => {
      const hiddenInputs = Object.entries({
        ...cafe24AuthorizationParams,
        redirect_uri: target.redirectUri,
      })
        .map(
          ([name, value]) =>
            `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
        )
        .join('\n        ');

      return `    <form method="get" action="${CAFE24_AUTHORIZATION_ENDPOINT}">
      ${hiddenInputs}
      <button type="submit" title="${escapeHtml(target.buttonTitle)}">${escapeHtml(target.buttonTitle)}</button>
    </form>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cafe24 OAuth</title>
  </head>
  <body>
${forms}
  </body>
</html>`;
}

function getCafe24RedirectUri(hostname) {
  return hostname === new URL(cafe24RedirectUriPreview).hostname
    ? cafe24RedirectUriPreview
    : cafe24RedirectUriProd;
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
  vercelEnv = process.env.VERCEL_ENV,
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

    if (state !== CAFE24_AUTH_STATE) {
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
      const redirectUri = getCafe24RedirectUri(req.hostname);
      const SCRIPT_FILENAME = 'script-ignis.js'
      const cafe24ScriptUrl = process.env.VERCEL_ENV === 'production' ? `${OAUTH_CLIENT_ORIGIN_PROD}/${SCRIPT_FILENAME}` : `${OAUTH_CLIENT_ORIGIN_PREVIEW}/${SCRIPT_FILENAME}`;
      const basicAuthorization = Buffer.from(
        `${CAFE24_CLIENT_ID}:${cafe24ClientSecret}`,
      ).toString('base64');
      const tokenResponse = await fetchImpl(CAFE24_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuthorization}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
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
      const shopNo = Number(token.shop_no || 1);
      const scriptTagsEndpoint =
        `https://${mallId}.cafe24api.com/api/v2/admin/scripttags`;
      const scriptTagHeaders = {
        Authorization: `Bearer ${token.access_token}`,
      };
      const existingScriptTagsResponse = await fetchImpl(
        `${scriptTagsEndpoint}?shop_no=${shopNo}`,
        {
          headers: scriptTagHeaders,
          signal: AbortSignal.timeout(10_000),
        },
      );
      const existingScriptTags = await parseCafe24Response(
        existingScriptTagsResponse,
        'Cafe24 script tag lookup',
      );

      for (const scriptTag of existingScriptTags?.scripttags || []) {
        if (!scriptTag.script_no) {
          continue;
        }

        const deletionResponse = await fetchImpl(
          `${scriptTagsEndpoint}/${scriptTag.script_no}?shop_no=${shopNo}`,
          {
            method: 'DELETE',
            headers: scriptTagHeaders,
            signal: AbortSignal.timeout(10_000),
          },
        );
        await parseCafe24Response(
          deletionResponse,
          'Cafe24 script tag deletion',
        );
      }

      const scriptTagResponse = await fetchImpl(
        scriptTagsEndpoint,
        {
          method: 'POST',
          headers: {
            ...scriptTagHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shop_no: shopNo,
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
