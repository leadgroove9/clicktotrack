import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { trackRoutes } from './routes/track';
import { scriptRoutes } from './routes/script';
import { paypalWebhookRoutes } from './routes/paypal';
import { stripeWebhookRoutes } from './routes/stripe';
import { whatsappWebhookRoutes } from './routes/whatsapp';
import { anomalyMonitorRoutes } from './routes/anomaly';
import { dashboardRoutes } from './routes/dashboard';
import { s2sDispatcherRoutes } from './routes/s2s';
import { reportRoutes } from './routes/reports';



// 1. Initialize Fastify server FIRST
const server = Fastify({
  logger: true,
});

// 2. Register Middleware
server.register(cors, {
  origin: '*',
});
server.register(formbody); // Form parser for PayPal IPN x-www-form-urlencoded payloads

// 3. Register All Webhook & Tracking Routes
server.register(trackRoutes);
server.register(scriptRoutes);
server.register(paypalWebhookRoutes);
server.register(stripeWebhookRoutes);
server.register(whatsappWebhookRoutes);
server.register(anomalyMonitorRoutes);
server.register(dashboardRoutes);
server.register(s2sDispatcherRoutes);
server.register(reportRoutes);


// Health check endpoint for DigitalOcean readiness probes
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root endpoint
server.get('/', async (request, reply) => {
  return { message: 'ClicktoTrack API Engine Running (PayPal IPN & Stripe Webhooks Active)' };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    // Bind to 0.0.0.0 for DigitalOcean container network interface
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();