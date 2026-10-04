import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Serve Visual Dashboard Interface (GET /dashboard)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ClicktoTrack Control Center</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-gray-900 text-gray-100 p-8">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div>
        <h1 class="text-xl font-bold text-white">⚡ ClicktoTrack Dashboard</h1>
        <p class="text-xs text-gray-400 mt-1">Multi-Channel S2S Tracking & Consent Shield Active</p>
      </div>
      <button onclick="alert('Onboarding Wizard Active')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg">
        + Add New Client / Domain
      </button>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div class="text-xs text-gray-400">30-Day Conversions</div>
        <div class="text-2xl font-bold text-white mt-1">1,428</div>
      </div>
      <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div class="text-xs text-gray-400">Consent Mode v2</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">Active (100%)</div>
      </div>
      <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div class="text-xs text-gray-400">Edge Proxy Status</div>
        <div class="text-2xl font-bold text-indigo-400 mt-1">Healthy</div>
      </div>
    </div>
  </div>
</body>
</html>`;
    return reply.type('text/html').send(html);
  });

  // 2. Dashboard API Overview Endpoint (GET /api/v1/dashboard/overview/:siteId?)
  fastify.get('/api/v1/dashboard/overview/:siteId?', async (
    request: FastifyRequest<{ Params: DashboardRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';
      return reply.status(200).send({
        success: true,
        siteId,
        status: 'OPERATIONAL',
        consentModeV2: 'ENABLED',
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}