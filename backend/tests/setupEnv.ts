process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://otr_dev:otr_dev_pw_demo@localhost:5432/otr_india_test';
process.env.JWT_SECRET = 'test_only_secret_do_not_reuse';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
