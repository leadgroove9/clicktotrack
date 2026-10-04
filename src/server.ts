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
import { rbacRoutes } from './routes/rbac';
import { brandingRoutes } from './routes/branding';
import { syntheticTesterRoutes } from './routes/synthetic';
import { spamFilterRoutes } from './routes/spam';
import { enricherRoutes } from './routes/enricher';
import { itpRestorationRoutes } from './routes/itp';
import { deduplicationRoutes } from './routes/dedup';
import { ncaRoutes } from './routes/nca';
import { goalRelocationRoutes } from './routes/relocation';
import { dnsHealthRoutes } from './routes/dns-health';
import { landingDiscoveryRoutes } from './routes/landing-discovery';
import { usageMeterRoutes } from './routes/usage-meter';
import { superAdminRoutes } from './routes/super-admin';
import { adrollRoutes } from './routes/adroll';
import { workspaceRoutes } from './routes/workspaces';

const server = Fastify({
  logger: true,
});

server.register(cors, { origin: '*' });
server.register(formbody);

server.register(trackRoutes);
server.register(scriptRoutes);
server.register(paypalWebhookRoutes);
server.register(stripeWebhookRoutes);
server.register(whatsappWebhookRoutes);
server.register(anomalyMonitorRoutes);
server.register(dashboardRoutes);
server.register(s2sDispatcherRoutes);
server.register(reportRoutes);
server.register(rbacRoutes);
server.register(brandingRoutes);
server.register(syntheticTesterRoutes);
server.register(spamFilterRoutes);
server.register(enricherRoutes);
server.register(itpRestorationRoutes);
server.register(deduplicationRoutes);
server.register(ncaRoutes);
server.register(goalRelocationRoutes);
server.register(dnsHealthRoutes);
server.register(landingDiscoveryRoutes);
server.register(usageMeterRoutes);
server.register(superAdminRoutes);
server.register(adrollRoutes);
server.register(workspaceRoutes);

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();