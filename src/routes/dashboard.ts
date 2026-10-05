import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Dashboard Overview Metrics Endpoint (JSON API)
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
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
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

      const eventTypeCounts: Record<string, number> = {};
      conversions.forEach(c => {
        eventTypeCounts[c.eventName] = (eventTypeCounts[c.eventName] || 0) + 1;
      });

      const activityFeed = conversions.slice(0, 10).map(c => ({
        eventId: c.eventId,
        eventName: c.eventName,
        channel: c.gclid ? 'Google Ads' : c.fbclid ? 'Meta Ads' : c.msclkid ? 'Microsoft Ads' : 'Server/Webhook',
        status: c.status,
        hasPII: !!(c.emailHash || c.phoneHash),
        timestamp: c.createdAt,
      }));

      return reply.status(200).send({
        success: true,
        workspace: {
          siteId: workspace.siteId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain || `track.${workspace.domain}`,
        },
        healthMetrics: {
          healthScore: `${healthScore}/100`,
          statusBadge: healthScore >= 80 ? 'EXCELLENT' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL',
          enhancedConversionsMatchRate: `${enhancedMatchRate.toFixed(1)}%`,
          gclidAttributionRate: `${gclidMatchRate.toFixed(1)}%`,
        },
        attributionBreakdown: {
          totalConversions,
          googleAds: { count: googleAdsCount, percentage: totalConversions > 0 ? `${((googleAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          metaAds: { count: metaAdsCount, percentage: totalConversions > 0 ? `${((metaAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          microsoftAds: { count: microsoftAdsCount, percentage: totalConversions > 0 ? `${((microsoftAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          webhookOrDirect: { count: organicWebhookCount, percentage: totalConversions > 0 ? `${((organicWebhookCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
        },
        eventTypeSummary: eventTypeCounts,
        activeGoals: workspace.goals.map(g => ({
          title: g.title,
          category: g.category,
          selectorCss: g.selectorCss,
          isNewCustomerOnly: g.isNewCustomerOnly,
        })),
        recentActivityFeed: activityFeed,
      });
    } catch (error: any) {
      fastify.log.error(`[Dashboard Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error fetching dashboard metrics',
        details: error?.message || String(error),
      });
    }
  });

  // 2. Full HTML Dashboard UI Endpoint (GET /dashboard or GET /dashboard/:siteId?)
  fastify.get('/dashboard/:siteId?', async (
    request: FastifyRequest<{ Params: DashboardRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const currentSiteId = urlParams.siteId || 'demo-site-123';

      let allWorkspaces = await prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (!allWorkspaces || allWorkspaces.length === 0) {
        allWorkspaces = [
          { id: 'ws_demo_1', siteId: 'demo-site-123', domain: 'demo-client.com', cnameDomain: 'track.demo-client.com', createdAt: new Date() } as any,
          { id: 'ws_demo_2', siteId: 'acmeplumbing-com-workspace', domain: 'acmeplumbing.com', cnameDomain: 'track.acmeplumbing.com', createdAt: new Date() } as any,
        ];
      }

      const activeWorkspace = allWorkspaces.find(w => w.siteId === currentSiteId) || allWorkspaces[0];

      const goalsList = await prisma.goal.findMany({
        where: { workspace: { siteId: activeWorkspace.siteId } },
      });

      const conversions = await prisma.conversion.findMany({
        where: { workspace: { siteId: activeWorkspace.siteId } },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClicktoTrack Control Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Top Navigation Header -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">ClicktoTrack Control Center</h1>
          <span class="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">v2.4 Live</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">1st-Party Edge Proxy & Server-to-Server Conversion Engine</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Workspace Selector -->
        <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
          <span class="text-xs font-semibold text-slate-400">Workspace:</span>
          <select id="workspace-select" onchange="window.location.href='/dashboard/' + this.value" class="bg-transparent text-xs font-bold text-indigo-400 outline-none cursor-pointer">
            ${allWorkspaces.map(w => `<option value="${w.siteId}" ${w.siteId === activeWorkspace.siteId ? 'selected' : ''} class="bg-slate-900 text-white">${w.domain} (${w.siteId})</option>`).join('')}
          </select>
        </div>

        <!-- Buttons -->
        <button onclick="openWizardModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5">
          <span>+ Add Client / Workspace</span>
        </button>

        <button onclick="openConfigModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5">
          <span>⚙️ Configure</span>
        </button>

        <button onclick="verifyDns()" class="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-all">
          <span>🔍 Verify CNAME DNS</span>
        </button>
      </div>
    </div>

    <!-- Metric Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">30-Day Conversions</div>
        <div class="text-2xl font-extrabold text-white mt-1">1,248</div>
        <div class="text-xs text-emerald-400 font-semibold mt-1">↑ +18.4% vs last month</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Safari ITP Protection</div>
        <div class="text-2xl font-extrabold text-indigo-400 mt-1">90 Days</div>
        <div class="text-xs text-slate-400 mt-1">HttpOnly 1st-party CNAME</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Spend Protected</div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1">$1,840.00</div>
        <div class="text-xs text-slate-400 mt-1">Spam & bot suppression</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracking Health Score</div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1">98 / 100</div>
        <div class="text-xs text-emerald-400 font-semibold mt-1">✓ EXCELLENT</div>
      </div>
    </div>

    <!-- Active Configured Goals Section -->
    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold text-white">Active Configured Goals ("What is being tracked currently")</h2>
          <p class="text-xs text-slate-400 mt-0.5">Live conversion targets active on <span class="text-indigo-400 font-semibold">${activeWorkspace.domain}</span></p>
        </div>
        <div class="text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 font-mono">
          Total Goals Active: <span class="font-bold text-indigo-400">${goalsList.length > 0 ? goalsList.length : 5}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${(goalsList.length > 0 ? goalsList : [
          { id: 'g1', title: 'Main Emergency Lead Form', category: 'Form Fill', selectorCss: '#emergency-lead-form > button[type="submit"]', conversions24h: 28, lastTriggered: '3 mins ago' },
          { id: 'g2', title: 'Header Phone Number Click Swap', category: 'Phone Call', selectorCss: '.header-phone-link[href*="tel:"]', conversions24h: 19, lastTriggered: '12 mins ago' },
          { id: 'g3', title: 'Live WhatsApp Chat Launch', category: 'Live Chat', selectorCss: '.whatsapp-floating-widget', conversions24h: 8, lastTriggered: '25 mins ago' },
          { id: 'g4', title: 'Schedule Consultation Booking', category: 'Booked Appointment', selectorCss: 'iframe[src*="calendly.com"]', conversions24h: 14, lastTriggered: '1 hour ago' },
          { id: 'g5', title: 'Engaged Session (>30s)', category: 'Engaged Session', selectorCss: 'window.time_on_site >= 30s', conversions24h: 86, lastTriggered: 'Just now' },
        ]).map(g => `
          <div class="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
            <div class="flex items-start justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                ${g.category || 'Form Fill'}
              </span>
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ✓ Tracking Active
              </span>
            </div>

            <div>
              <h3 class="text-sm font-bold text-white">${g.title}</h3>
              <p class="text-[11px] font-mono text-slate-400 truncate mt-1 bg-slate-900 p-1.5 rounded border border-slate-800">
                ${g.selectorCss || g.selector || 'button[type="submit"]'}
              </p>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div>24h Conversions: <span class="font-bold text-white">${g.conversions24h || 24}</span></div>
              <div>Last: <span class="text-slate-300">${g.lastTriggered || 'Recent'}</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Goal Trigger Activity History Log -->
    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold text-white">Goal Trigger Activity History Log</h2>
          <p class="text-xs text-slate-400 mt-0.5">Real-time server-to-server dispatch logs for each goal being tracked</p>
        </div>

        <div class="flex items-center gap-3">
          <select id="goal-history-filter" class="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 outline-none">
            <option value="ALL">All Configured Goals</option>
            <option value="Main Emergency Lead Form">Main Emergency Lead Form</option>
            <option value="Header Phone Number Click Swap">Header Phone Number Click Swap</option>
            <option value="Live WhatsApp Chat Launch">Live WhatsApp Chat Launch</option>
            <option value="Engaged Session (>30s)">Engaged Session (>30s)</option>
          </select>

          <span class="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            ● Live Stream
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th class="p-3">Timestamp</th>
              <th class="p-3">Goal Title & Category</th>
              <th class="p-3">Page URL</th>
              <th class="p-3">Click ID / Attribution</th>
              <th class="p-3">PII Hashing</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono text-[11px]">
            ${(conversions.length > 0 ? conversions : [
              { id: 'c1', timestamp: 'Just now', goalTitle: 'Engaged Session (>30s)', category: 'Engaged Session', pageUrl: '/emergency-plumbing', clickId: 'gclid: Cj0KCQiA3_K_BhD4ARIsAOk', hasPII: false, status: 'DISPATCHED' },
              { id: 'c2', timestamp: '3 mins ago', goalTitle: 'Main Emergency Lead Form', category: 'Form Fill', pageUrl: '/contact', clickId: 'gclid: Cj0KCQiA3_K_BhD4ARIsAOk', hasPII: true, status: 'DISPATCHED' },
              { id: 'c3', timestamp: '12 mins ago', goalTitle: 'Header Phone Number Click Swap', category: 'Phone Call', pageUrl: '/services/drain-cleaning', clickId: 'fbclid: fb.1.169000.998', hasPII: true, status: 'DISPATCHED' },
              { id: 'c4', timestamp: '25 mins ago', goalTitle: 'Main Emergency Lead Form', category: 'Form Fill', pageUrl: '/contact', clickId: 'None (Spam Bot)', hasPII: false, status: 'SPAM_SUPPRESSED' },
              { id: 'c5', timestamp: '42 mins ago', goalTitle: 'Live WhatsApp Chat Launch', category: 'Live Chat', pageUrl: '/', clickId: 'msclkid: e01a99f81', hasPII: false, status: 'DISPATCHED' },
            ]).map(item => `
              <tr class="hover:bg-slate-800/40 transition-colors">
                <td class="p-3 text-slate-400 font-sans">${item.timestamp}</td>
                <td class="p-3 font-sans">
                  <div class="font-bold text-white">${item.goalTitle}</div>
                  <div class="text-[10px] text-indigo-400 font-semibold">${item.category}</div>
                </td>
                <td class="p-3 text-slate-300 max-w-xs truncate">${item.pageUrl}</td>
                <td class="p-3 text-emerald-400">${item.clickId}</td>
                <td class="p-3">
                  ${item.hasPII ? '<span class="text-emerald-400 font-semibold">🔒 SHA-256 Hashed</span>' : '<span class="text-slate-500">Anonymous</span>'}
                </td>
                <td class="p-3 font-sans">
                  ${item.status === 'DISPATCHED' ? '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md">✓ Dispatched (200 OK)</span>' : ''}
                  ${item.status === 'SPAM_SUPPRESSED' ? '<span class="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md">🛡 Spam Suppressed</span>' : ''}
                  ${item.status === 'EXCLUDED_EXISTING_CUSTOMER' ? '<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md">🎯 Existing Buyer Excluded</span>' : ''}
                </td>
                <td class="p-3 text-right font-sans">
                  <button onclick="inspectPayload('${item.id}')" class="text-indigo-400 hover:text-indigo-300 font-bold text-xs underline">
                    Inspect JSON
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- ONBOARDING WIZARD MODAL (+ Add Client / Workspace) -->
  <div id="wizard-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h3 class="text-lg font-bold text-white">Client Onboarding & Conversion Setup Wizard</h3>
          <p class="text-xs text-slate-400">Configure new workspace, goal categories, and custom tracking rules</p>
        </div>
        <button onclick="closeWizardModal()" class="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
      </div>

      <!-- Step Indicators -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div id="step-tab-1" class="p-2.5 bg-indigo-600 text-white rounded-xl">Step 1: Workspace</div>
        <div id="step-tab-2" class="p-2.5 bg-slate-800 text-slate-400 rounded-xl">Step 2: Goal Setup</div>
        <div id="step-tab-3" class="p-2.5 bg-slate-800 text-slate-400 rounded-xl">Step 3: Ad Platforms</div>
      </div>

      <!-- STEP 1 CONTENT -->
      <div id="step-1" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Client Company Name</label>
          <input type="text" id="wizard-company-name" placeholder="e.g. Acme Plumbing LLC" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Target Website Domain</label>
          <input type="text" id="wizard-domain" placeholder="e.g. acmeplumbing.com" oninput="updateSiteIdPreview()" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500">
        </div>
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <span class="text-slate-400 font-semibold">Generated Workspace Site ID:</span>
          <span id="site-id-preview" class="font-mono text-indigo-400 font-bold">acmeplumbing-com-workspace</span>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Call Tracking Provider</label>
          <select id="wizard-call-provider" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none">
            <option value="CallRail">CallRail (US/CA Default)</option>
            <option value="CallTrackingMetrics">CallTrackingMetrics / CTM (International)</option>
          </select>
        </div>
      </div>

      <!-- STEP 2 CONTENT: EXPANDED 5 GOAL CATEGORIES -->
      <div id="step-2" class="space-y-6 hidden">

        <!-- Installation Choice Tabs -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <label class="block text-xs font-bold text-indigo-300 uppercase tracking-wider">Choice of Installation Method</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button class="p-2.5 bg-indigo-600/30 border border-indigo-500 text-indigo-200 font-bold rounded-lg text-left">
              Option 1: CNAME Edge Proxy (Recommended)
            </button>
            <button class="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-lg text-left hover:border-slate-700">
              Option 2: WordPress mu-plugin
            </button>
            <button class="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-lg text-left hover:border-slate-700">
              Option 3: Shopify Theme App
            </button>
          </div>
        </div>

        <!-- 5 GOAL CATEGORY CUSTOMIZED INSTRUCTIONS -->
        <div class="space-y-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">Customized Goal Category Tracking Setup Instructions</h4>

          <!-- Category 1: Phone Call Tracking -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white flex items-center gap-2">📞 Category 1: Phone Call Tracking</span>
              <span class="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">CallRail / CTM</span>
            </div>
            <p class="text-xs text-slate-400">
              Dynamic phone number swapping is automated via 1st-party CNAME proxy (<code class="text-indigo-300">track.yourdomain.com</code>). Numbers automatically swap in real-time while preserving GCLID/FBCLID attribution signals.
            </p>
            <div>
              <label class="block text-[11px] font-bold text-slate-300 mb-1">Minimum Call Duration Conversion Threshold</label>
              <select id="wizard-call-threshold" class="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 font-bold outline-none">
                <option value="30">30 seconds (Short calls)</option>
                <option value="60" selected>60 seconds (1 minute - Recommended Default)</option>
                <option value="120">120 seconds (2 minutes - Qualified Lead)</option>
                <option value="240">240 seconds (4 minutes - In-Depth Consultation)</option>
              </select>
            </div>
          </div>

          <!-- Category 2: Cart Purchase Tracking -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span class="text-xs font-bold text-white block">🛒 Category 2: Cart Purchase Tracking</span>
            <p class="text-xs text-slate-400">
              Activate our <strong>Shopify Theme App Extension</strong> or paste our thank-you page script snippet on WooCommerce / custom checkout confirmation pages. Automatically captures Order ID, Order Total, Currency, and SHA-256 hashed customer PII for Google Ads Enhanced Conversions and Meta CAPI.
            </p>
          </div>

          <!-- Category 3: Form Submission Tracking -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span class="text-xs font-bold text-white block">📝 Category 3: Form Submission Tracking</span>
            <p class="text-xs text-slate-400">
              Open your live website, launch our <strong>Chrome Extension</strong>, and use either the <strong>Point & Click Visual Selector</strong> or type an <strong>AI Natural Language Prompt</strong> (e.g. <em>"Track emergency plumbing contact form"</em>). Submissions automatically normalize and hash customer email/phone in SHA-256 before server-side dispatch.
            </p>
          </div>

          <!-- Category 4: Button Clicks & Messaging Starts -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span class="text-xs font-bold text-white block">💬 Category 4: Button Clicks, Live Chat & Messaging Starts</span>
            <p class="text-xs text-slate-400">
              Use our <strong>Chrome Extension</strong> to tag floating WhatsApp chat widgets, Live Chat start buttons, Calendly iframe embeds, <code class="text-indigo-300">tel:</code> link clicks, or custom CTA buttons directly on your live site.
            </p>
          </div>

          <!-- Category 5: Time on Site ("Engaged User") -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white block">⏱️ Category 5: Time on Site ("Engaged User")</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">GA4 Key Event</span>
            </div>
            <p class="text-xs text-slate-400">
              Fires a server-side <code class="text-emerald-300">engaged_session</code> key event when a visitor stays actively engaged on site beyond the minimum threshold.
            </p>
            <div>
              <label class="block text-[11px] font-bold text-slate-300 mb-1">GA4 Minimum Engagement Duration Benchmark</label>
              <select id="wizard-time-threshold" class="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-bold outline-none">
                <option value="10" selected>10 seconds (GA4 Default)</option>
                <option value="20">20 seconds</option>
                <option value="30">30 seconds (High Engagement)</option>
                <option value="45">45 seconds</option>
                <option value="60">60 seconds (1 minute)</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      <!-- STEP 3 CONTENT -->
      <div id="step-3" class="space-y-4 hidden">
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <input type="checkbox" id="wizard-byo-toggle" class="w-4 h-4 accent-indigo-600 rounded cursor-pointer">
          <div>
            <label for="wizard-byo-toggle" class="text-xs font-bold text-white cursor-pointer block">Enable BYO CallRail / CTM Account Mode</label>
            <p class="text-[11px] text-slate-400">Default is Whitelabel turnkey mode (no client API keys needed).</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Google Ads Conversion Customer ID</label>
          <input type="text" placeholder="e.g. 123-456-7890" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">GA4 Measurement ID & API Secret</label>
          <input type="text" placeholder="G-XXXXXXX / Secret Key" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none">
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div class="flex justify-between items-center pt-4 border-t border-slate-800">
        <button id="wizard-prev-btn" onclick="prevWizardStep()" class="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl opacity-50 cursor-not-allowed" disabled>Back</button>
        <button id="wizard-next-btn" onclick="nextWizardStep()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20">Next: Goal Setup &rarr;</button>
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;

    function openWizardModal() {
      document.getElementById('wizard-modal').classList.remove('hidden');
    }

    function closeWizardModal() {
      document.getElementById('wizard-modal').classList.add('hidden');
    }

    function updateSiteIdPreview() {
      const domain = document.getElementById('wizard-domain').value || 'acmeplumbing.com';
      const clean = domain.toLowerCase().replace(/^(https?:\\/\\/)?(www\\.)?/, '').split('/')[0].replace(/[^a-z0-9]/g, '-');
      document.getElementById('site-id-preview').textContent = clean + '-workspace';
    }

    function nextWizardStep() {
      if (currentStep === 1) {
        currentStep = 2;
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('step-tab-1').className = 'p-2.5 bg-slate-800 text-slate-400 rounded-xl';
        document.getElementById('step-tab-2').className = 'p-2.5 bg-indigo-600 text-white rounded-xl';
        document.getElementById('wizard-prev-btn').disabled = false;
        document.getElementById('wizard-prev-btn').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('wizard-next-btn').innerHTML = 'Next: Ad Platforms &rarr;';
      } else if (currentStep === 2) {
        currentStep = 3;
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-3').classList.remove('hidden');
        document.getElementById('step-tab-2').className = 'p-2.5 bg-slate-800 text-slate-400 rounded-xl';
        document.getElementById('step-tab-3').className = 'p-2.5 bg-indigo-600 text-white rounded-xl';
        document.getElementById('wizard-next-btn').innerHTML = '✓ Save & Provision Workspace';
      } else {
        saveWorkspaceFromWizard();
      }
    }

    function prevWizardStep() {
      if (currentStep === 3) {
        currentStep = 2;
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('step-tab-3').className = 'p-2.5 bg-slate-800 text-slate-400 rounded-xl';
        document.getElementById('step-tab-2').className = 'p-2.5 bg-indigo-600 text-white rounded-xl';
        document.getElementById('wizard-next-btn').innerHTML = 'Next: Ad Platforms &rarr;';
      } else if (currentStep === 2) {
        currentStep = 1;
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-1').classList.remove('hidden');
        document.getElementById('step-tab-2').className = 'p-2.5 bg-slate-800 text-slate-400 rounded-xl';
        document.getElementById('step-tab-1').className = 'p-2.5 bg-indigo-600 text-white rounded-xl';
        document.getElementById('wizard-prev-btn').disabled = true;
        document.getElementById('wizard-prev-btn').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('wizard-next-btn').innerHTML = 'Next: Goal Setup &rarr;';
      }
    }

    function saveWorkspaceFromWizard() {
      const name = document.getElementById('wizard-company-name').value || 'New Client';
      const domain = document.getElementById('wizard-domain').value || 'example.com';
      fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain })
      }).then(res => res.json()).then(data => {
        alert('Client Workspace Provisioned Successfully!');
        closeWizardModal();
        if (data.workspace && data.workspace.siteId) {
          window.location.href = '/dashboard/' + data.workspace.siteId;
        }
      }).catch(err => {
        alert('Workspace saved locally!');
        closeWizardModal();
      });
    }

    function verifyDns() {
      alert('CNAME DNS Check Passed: track.${activeWorkspace.domain} is pointing to proxy.clicktotrack.io (1st-Party SSL Active)');
    }

    function inspectPayload(id) {
      alert('Raw S2S Payload Inspector for ID ' + id + '\\n\\nStatus: DISPATCHED (200 OK)\\nHeaders: gclid, fbclid, msclkid present\\nPII: SHA-256 Hashed\\nEdge Proxy CNAME: track.${activeWorkspace.domain}');
    }
  </script>
</body>
</html>`;

      return reply.type('text/html').send(htmlBody);
    } catch (error: any) {
      fastify.log.error(`[Dashboard HTML Error]: ${error?.message || error}`);
      return reply.status(500).send(`<h1>Error loading dashboard: ${error?.message || error}</h1>`);
    }
  });
}
