import { createApp } from './app';
import { env } from './env';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'info',
      message: `mock-ssc-portal bridge server listening on port ${env.port}`,
      otrApiUrl: env.otrApiUrl,
      sscClientId: env.sscClientId,
      sscRedirectUri: env.sscRedirectUri,
    })
  );
});
