import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { trackRoutes } from './routes/track';
import { scriptRoutes } from './routes/script';
import { paypalWebhookRoutes } from './routes/paypal';

const server = Fastify({ logger: true });

server.register(cors, { origin: '*' });
server.register(formbody); // Parses URL-encoded form data from PayPal IPN

server.register(trackRoutes);
server.register(scriptRoutes);
server.register(paypalWebhookRoutes);

server.get('/health', async () => ({ status: 'ok' }));

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