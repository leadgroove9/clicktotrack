import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface WhatsAppQueryParams {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

interface WhatsAppRouteParams {
  siteId?: string;
}

// Utility: Normalize and SHA-256 Hash PII
function hashPII(value?: string, type: 'email' | 'phone' = 'phone'): string | undefined {
  if (!value) return undefined;
  let normalized = value.trim().toLowerCase();

  if (type === 'email') {
    const parts = normalized.split('@');
    if (parts.length === 2) {
      let [username, domain] = parts;
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        username = username.replace(/\./g, '');
      }
      normalized = `${username}@${domain}`;
    }
  } else if (type === 'phone') {
    normalized = normalized.replace(/\D/g, '');
    if (!normalized.startsWith('+') && normalized.length === 10) {
      normalized = `+1${normalized}`;
    } else if (!normalized.startsWith('+') && normalized.length > 10) {
      normalized = `+${normalized}`;
    }
  }

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function whatsappWebhookRoutes(fastify: FastifyInstance) {
  // 1. Meta Webhook Verification Endpoint (GET)
  fastify.get('/api/v1/webhooks/whatsapp/:siteId?', async (
    request: FastifyRequest<{ Params: WhatsAppRouteParams; Querystring: WhatsAppQueryParams }>,
    reply: FastifyReply
  ) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'clicktotrack_whatsapp_token_123';

    if (mode === 'subscribe' && token === expectedToken) {
      fastify.log.info('[WhatsApp Webhook] Verification successful');
      return reply.status(200).send(challenge);
    } else {
      fastify.log.warn('[WhatsApp Webhook] Verification failed - token mismatch');
      return reply.status(403).send({ error: 'Forbidden: Invalid verify token' });
    }
  });

  // 2. Incoming WhatsApp Message Ingestion Endpoint (POST)
  fastify.post('/api/v1/webhooks/whatsapp/:siteId?', async (
    request: FastifyRequest<{ Params: WhatsAppRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const body: any = request.body || {};
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || body.siteId || 'demo-site-123';

      // Respond 200 OK immediately to Meta to prevent retries
      reply.status(200).send({ status: 'EVENT_RECEIVED' });

      // Process payload asynchronously
      const entry = body.entry?.;
      const change = entry?.changes?.;
      const value = change?.value;
      const message = value?.messages?.;

      if (!message) return;

      const rawPhone = message.from;
      const wamid = message.id || `wamid_${Date.now()}`;
      const contactName = value.contacts?.?.profile?.name || 'WhatsApp User';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        fastify.log.warn(`[WhatsApp Webhook] Workspace siteId not found: ${siteId}`);
        return;
      }

      const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
      const phoneHash = hashPII(formattedPhone, 'phone');

      const eventId = `evt_wa_${wamid}`;

      const conversion = await prisma.conversionEvent.create({
        data: {
          workspaceId: workspace.id,
          eventId,
          eventName: 'contact',
          phoneHash,
          status: 'QUEUED',
        },
      });

      fastify.log.info(`[WhatsApp Webhook] Conversation queued from ${contactName} (${formattedPhone}): ${conversion.eventId}`);
    } catch (error: any) {
      fastify.log.error(`[WhatsApp Webhook Error]: ${error?.message || error}`);
    }
  });
}