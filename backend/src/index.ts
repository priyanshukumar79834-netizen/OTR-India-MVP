import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { seedGovernmentClients } from './modules/government-clients/governmentClients.service';

const app = createApp();

seedGovernmentClients()
  .then(() => {
    app.listen(env.port, () => {
      logger.info(`OTR-India backend listening on port ${env.port}`, { nodeEnv: env.nodeEnv });
    });
  })
  .catch((err) => {
    logger.error('Failed to seed government clients at startup', {
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
