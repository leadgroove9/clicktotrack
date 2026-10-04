import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

// Clean HTML template string with concatenated lines to prevent backtick interpolation errors
const DASHBOARD_HTML = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>ClicktoTrack Control Center</title>' +
'  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>' +
'  <style>@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"); body { font-family: "Inter", sans-serif; }</style>' +
'</head>' +
'<body class="bg-gray-900 text-gray-100 min-h-screen p-6">' +
'  <div class="max-w-6xl mx-auto space-y-6">' +
'    <header class="flex justify-between items-center bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">' +
'      <div>' +
'        <h1 class="text-2xl font-bold text-white flex items-center gap-2">⚡ ClicktoTrack Control Center</h1>' +
'        <p class="text-xs text-gray-400 mt-1">1st-Party Edge Proxy & Multi-Channel S2S Conversion Engine</p>' +
'      </div>' +
'      <button onclick="openWizard()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30">' +
'        + Add New Client / Domain' +
'      </button>' +
'    </header>' +
'    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">' +
'      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">' +
'        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">30-Day Conversions</div>' +
'        <div class="text-3xl font-bold text-white mt-2" id="kpi-conversions">1,428</div>' +
'      </div>' +
'      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">' +
'        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Safari ITP Recovery</div>' +
'        <div class="text-3xl font-bold text-indigo-400 mt-2">+28.4%</div>' +
'      </div>' +
'      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">' +
'        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Consent Mode v2</div>' +
'        <div class="text-3xl font-bold text-emerald-400 mt-2">Active (100%)</div>' +
'      </div>' +
'      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">' +
'        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Edge Proxy Status</div>' +
'        <div class="text-3xl font-bold text-emerald-400 mt-2">Healthy</div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'  <script>' +
'    function openWizard() { alert("Onboarding Wizard: Enter target domain and ad platform API credentials."); }' +
'  </script>' +
'</body>' +
'</html>';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Serve Visual Dashboard Interface (GET /dashboard)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.type('text/html').send(DASHBOARD_HTML);
  });

  // 2. Dashboard API Overview Endpoint (GET /api/v1/dashboard/overview/:siteId?)
  fastify.get('/api/v1/dashboard/overview/:siteId?', async (
    request: FastifyRequest<{ Params: DashboardRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: {
          goals: true,
          conversions: {
            take: 100,
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace with siteId '" + siteId + "' not found" });
      }

      const conversions = workspace.conversions;
      const totalConversions = conversions.length;

      let googleAdsCount = 0;
      let metaAdsCount = 0;
      let microsoftAdsCount = 0;
      let organicWebhookCount = 0;

      let emailHashedCount = 0;
      let phoneHashedCount = 0;

      conversions.forEach(c => {
        if (c.gclid) googleAdsCount++;
        else if (c.fbclid) metaAdsCount++;
        else if (c.msclkid) microsoftAdsCount++;
        else organicWebhookCount++;

        if (c.emailHash) emailHashedCount++;
        if (c.phoneHash) phoneHashedCount++;
      });

      const gclidMatchRate = totalConversions > 0 ? (googleAdsCount / totalConversions) * 100 : 100;
      const enhancedMatchRate = totalConversions > 0 ? (emailHashedCount / totalConversions) * 100 : 100;
      const healthScore = Math.round((gclidMatchRate * 0.6) + (enhancedMatchRate * 0.4));

      return reply.status(200).send({
        success: true,
        workspace: {
          siteId: workspace.siteId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain || "track." + workspace.domain,
        },
        healthMetrics: {
          healthScore: healthScore + "/100",
          statusBadge: healthScore >= 80 ? 'EXCELLENT' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL',
          enhancedConversionsMatchRate: enhancedMatchRate.toFixed(1) + "%",
          gclidAttributionRate: gclidMatchRate.toFixed(1) + "%",
        },
        attributionBreakdown: {
          totalConversions,
          googleAds: { count: googleAdsCount },
          metaAds: { count: metaAdsCount },
          microsoftAds: { count: microsoftAdsCount },
          webhookOrDirect: { count: organicWebhookCount },
        },
      });
    } catch (error: any) {
      fastify.log.error("[Dashboard Error]: " + (error?.message || String(error)));
      return reply.status(500).send({
        error: 'Internal Server Error fetching dashboard metrics',
      });
    }
  });
}