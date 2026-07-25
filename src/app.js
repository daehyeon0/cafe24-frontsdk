import express from 'express';
import { fileURLToPath } from 'node:url';

const publicPath = fileURLToPath(new URL('../public', import.meta.url));

export function getRawQueryString(originalUrl) {
  const queryStartIndex = originalUrl.indexOf('?');

  return queryStartIndex === -1 ? '' : originalUrl.slice(queryStartIndex + 1);
}

export function createApp({ logger = console } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.static(publicPath));

  app.get('/', (_req, res) => {
    res.status(200).send('OK');
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
