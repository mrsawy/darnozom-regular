import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'
import { CITY_SHIPPING_MODULE } from './src/modules/city-shipping'

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
      adminCors: process.env.MEDUSA_ADMIN_CORS || 'http://localhost:9010',
      authCors: process.env.MEDUSA_ADMIN_CORS || 'http://localhost:9010',
      jwtSecret,
      cookieSecret,
      // Restrict each actor type to only its intended auth provider(s).
      // This prevents unintended auth flows (e.g., a customer Better Auth
      // assertion being accepted for admin/user login via /auth/user/better-auth-bridge).
      // See Task 23 review feedback: without this, the protection against
      // cross-actor auth was accidental (empty app_metadata causing token minting to
      // fail) rather than designed. This makes it explicit and tamper-resistant.
      authMethodsPerActor: {
        user: ['emailpass'],
        customer: ['better-auth-bridge'],
      },
    }
  },
  modules: [
    {
      resolve: './src/modules/digital-product',
    },
    {
      resolve: './src/modules/city-shipping',
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
          {
            resolve: './src/modules/lemonsqueezy',
            id: 'lemonsqueezy',
          },
        ],
      },
    },
    {
      key: Modules.FULFILLMENT,
      resolve: '@medusajs/fulfillment',
      options: {
        providers: [
          {
            resolve: './src/modules/city-shipping/fulfillment-provider-module',
            id: 'city-shipping',
            // Inert: `dependencies` is only consulted for a module's own
            // top-level `resolve` entry, never for options.providers[]
            // entries (confirmed against @medusajs/fulfillment's loader).
            // The provider resolves CityShippingModuleService itself via
            // MedusaModule.getModuleInstance() — see fulfillment-provider.ts.
            dependencies: [CITY_SHIPPING_MODULE],
          },
        ],
      },
    },
    {
      key: Modules.AUTH,
      resolve: '@medusajs/auth',
      options: {
        providers: [
          {
            resolve: './src/modules/better-auth-bridge',
            id: 'better-auth-bridge',
          },
          // Keep the default emailpass provider registered too — Medusa
          // Admin (/app) staff logins still use it, per the design's
          // "separate Medusa admin accounts" decision. Store/customer auth
          // goes through better-auth-bridge; admin auth is unaffected.
          {
            resolve: '@medusajs/auth-emailpass',
            id: 'emailpass',
          },
        ],
      },
    },
  ],
})
