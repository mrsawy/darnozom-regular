import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const jwtSecret = process.env.MEDUSA_JWT_SECRET
const cookieSecret = process.env.MEDUSA_COOKIE_SECRET

if (!jwtSecret || !cookieSecret) {
  throw new Error(
    'MEDUSA_JWT_SECRET and MEDUSA_COOKIE_SECRET must be set (see apps/medusa/.env) — refusing to start with a hardcoded default secret.'
  )
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.MEDUSA_DATABASE_URL,
    redisUrl: process.env.MEDUSA_REDIS_URL,
    http: {
      storeCors: process.env.MEDUSA_STORE_CORS || 'http://localhost:5173',
      adminCors: process.env.MEDUSA_ADMIN_CORS || 'http://localhost:9000',
      authCors: process.env.MEDUSA_ADMIN_CORS || 'http://localhost:9000',
      jwtSecret,
      cookieSecret,
    }
  },
  modules: [
    {
      resolve: './src/modules/digital-product',
    },
    {
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            resolve: './src/modules/cod',
            id: 'cod',
          },
          {
            resolve: './src/modules/paymob-card',
            id: 'paymob-card',
            options: {
              apiKey: process.env.PAYMOB_API_KEY,
              integrationId: process.env.PAYMOB_INTEGRATION_ID,
              hmacSecret: process.env.PAYMOB_HMAC_SECRET,
              iframeId: process.env.PAYMOB_IFRAME_ID,
            },
          },
          {
            resolve: './src/modules/paymob-wallet',
            id: 'paymob-wallet',
          },
          {
            resolve: './src/modules/paypal-egp',
            id: 'paypal-egp',
          },
        ],
      },
    },
  ],
})
