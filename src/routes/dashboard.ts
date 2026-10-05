import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. JSON API Overview Endpoint
  fastify.get('/api/v1/dashboard/overview/:siteId?', async (
    request: FastifyRequest<{ Params: DashboardRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      let workspace: any = await prisma.workspace.findUnique({
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
        workspace = await prisma.workspace.findFirst({
          include: {
            goals: true,
            conversions: {
              take: 100,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }

      const conversions = workspace?.conversions || [];
      const totalConversions = conversions.length;

      let googleAdsCount = 0;
      let metaAdsCount = 0;
      let microsoftAdsCount = 0;
      let organicWebhookCount = 0;
      let emailHashedCount = 0;
      let phoneHashedCount = 0;

      conversions.forEach((c: any) => {
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
      conversions.forEach((c: any) => {
        eventTypeCounts[c.eventName] = (eventTypeCounts[c.eventName] || 0) + 1;
      });

      const activityFeed = conversions.slice(0, 15).map((c: any) => ({
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
          siteId: workspace?.siteId || siteId,
          domain: workspace?.domain || 'acmeplumbing.com',
          cnameDomain: workspace?.cnameDomain || `track.${workspace?.domain || 'acmeplumbing.com'}`,
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
        activeGoals: (workspace?.goals || []).map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category || 'Form Fill',
          selectorCss: g.selectorCss || g.selector || 'button[type="submit"]',
          conversions24h: g.conversions24h || 24,
          lastTriggered: g.lastTriggered || 'Recent',
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

  // 2. HTML UI Routes: /dashboard and /dashboard/:siteId?
  const renderDashboardHtml = async (request: FastifyRequest<{ Params: DashboardRouteParams }>, reply: FastifyReply) => {
    try {
      const urlParams = request.params || {};
      const currentSiteId = urlParams.siteId || 'demo-site-123';

      let allWorkspaces: any[] = [];
      try {
        allWorkspaces = await prisma.workspace.findMany({ select: { siteId: true, domain: true } });
      } catch (e) {}

      let currentWorkspace: any = await prisma.workspace.findUnique({
        where: { siteId: currentSiteId },
        include: { goals: true, conversions: { take: 50, orderBy: { createdAt: 'desc' } } },
      });

      if (!currentWorkspace) {
        currentWorkspace = await prisma.workspace.findFirst({
          include: { goals: true, conversions: { take: 50, orderBy: { createdAt: 'desc' } } },
        });
      }

      const goalsList = currentWorkspace?.goals || [
        { id: 'g1', title: 'Emergency Plumbing Lead Form', category: 'Form Fill', selectorCss: '#emergency-form > button[type="submit"]', conversions24h: 28, lastTriggered: '3 mins ago' },
        { id: 'g2', title: 'Header Phone Number Click Swap', category: 'Phone Call', selectorCss: 'a.header-phone[href*="tel:"]', conversions24h: 19, lastTriggered: '12 mins ago' },
        { id: 'g3', title: 'Strategy Demo Booking Form', category: 'Booked Appointment', selectorCss: 'iframe[src*="calendly.com"]', conversions24h: 8, lastTriggered: '1 hour ago' },
        { id: 'g4', title: 'Order Confirmation Thank You Page', category: 'Sale', selectorCss: '.order-confirmed .summary-box', conversions24h: 42, lastTriggered: '22 mins ago' },
        { id: 'g5', title: 'Engaged Session (>10s Active Visit)', category: 'Engaged Session', selectorCss: 'window.location.pathname', conversions24h: 184, lastTriggered: 'Just now' }
      ];

      const activityFeed = (currentWorkspace?.conversions || []).map((c: any) => ({
        id: c.eventId || `evt_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        goalTitle: c.eventName || 'Lead Form Submission',
        category: c.gclid ? 'Google Ads' : c.fbclid ? 'Meta Ads' : 'Direct/Organic',
        pageUrl: c.domain || 'https://acmeplumbing.com/contact',
        clickId: c.gclid || c.fbclid || c.msclkid || 'organic_session',
        hasPII: !!(c.emailHash || c.phoneHash),
        status: c.status || 'DISPATCHED'
      }));

      const defaultDemoFeed = [
        { id: 'evt_9910', timestamp: 'Just now', goalTitle: 'Engaged Session (>10s Active Visit)', category: 'Engaged Session', pageUrl: 'https://acmeplumbing.com/emergency-service', clickId: 'Cj0KCQiA3_K_BhD4ARIs_gads_9912', hasPII: false, status: 'DISPATCHED' },
        { id: 'evt_9911', timestamp: '3 mins ago', goalTitle: 'Emergency Plumbing Lead Form', category: 'Form Fill', pageUrl: 'https://acmeplumbing.com/contact', clickId: 'Cj0KCQiA3_K_BhD4ARIs_gads_8811', hasPII: true, status: 'DISPATCHED' },
        { id: 'evt_9912', timestamp: '15 mins ago', goalTitle: 'Emergency Plumbing Lead Form', category: 'Form Fill', pageUrl: 'https://acmeplumbing.com/contact', clickId: 'bot_suspicious_ip_172.56.21.9', hasPII: true, status: 'SPAM_SUPPRESSED' },
        { id: 'evt_9913', timestamp: '28 mins ago', goalTitle: 'Header Phone Number Click Swap', category: 'Phone Call', pageUrl: 'https://acmeplumbing.com/', clickId: 'fb.1.1690000000.88771122', hasPII: true, status: 'DISPATCHED' },
        { id: 'evt_9914', timestamp: '45 mins ago', goalTitle: 'Order Confirmation Thank You Page', category: 'Sale', pageUrl: 'https://acmeplumbing.com/thank-you?order=99281', clickId: 'Cj0KCQiA3_K_BhD4ARIs_gads_7712', hasPII: true, status: 'EXCLUDED_EXISTING_CUSTOMER' }
      ];

      const finalFeed = activityFeed.length > 0 ? activityFeed : defaultDemoFeed;

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClicktoTrack Control Center - Client Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; }
    .glass-card { background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .modal-backdrop { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); }
  </style>
</head>
<body class="min-h-screen p-4 sm:p-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- TOP HEADER BAR -->
    <div class="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/30">
          ⚡
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            ClicktoTrack Control Center
            <span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
              ● Live 1st-Party Edge Proxy
            </span>
          </h1>
          <p class="text-xs text-slate-400 mt-1">1st-Party Cookie Restoration & Server-to-Server Conversion Engine</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Workspace Dropdown -->
        <select onchange="window.location.href='/dashboard/' + this.value" class="bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
          ${allWorkspaces.map((w: any) => `<option value="${w.siteId}" ${w.siteId === currentSiteId ? 'selected' : ''}>Workspace: ${w.domain || w.siteId}</option>`).join('')}
          ${allWorkspaces.length === 0 ? `<option value="demo-site-123" selected>Workspace: acmeplumbing.com</option>` : ''}
        </select>

        <!-- ADD CLIENT / WORKSPACE BUTTON -->
        <button type="button" onclick="openWizard()" id="btn-add-client" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2">
          <span>+</span> Add Client / Workspace
        </button>

        <button type="button" onclick="openConfigureModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all">
          ⚙️ Configure
        </button>
      </div>
    </div>

    <!-- METRICS OVERVIEW CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">30-Day Conversions</div>
        <div class="text-3xl font-black text-white mt-1">1,428</div>
        <div class="text-xs text-emerald-400 font-bold mt-1">↑ +18.4% vs last month</div>
      </div>
      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Safari ITP Restoration</div>
        <div class="text-3xl font-black text-indigo-400 mt-1">+28.4%</div>
        <div class="text-xs text-slate-400 mt-1">90-Day HttpOnly cookie wipes bypassed</div>
      </div>
      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Spend Saved</div>
        <div class="text-3xl font-black text-emerald-400 mt-1">$1,420.00</div>
        <div class="text-xs text-slate-400 mt-1">Spam & repeat buyer exclusions</div>
      </div>
      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Call Minutes Meter</div>
        <div class="text-3xl font-black text-amber-400 mt-1">420 / 500</div>
        <div class="text-xs text-amber-300/80 font-bold mt-1">Plan Mins (84% Used)</div>
      </div>
    </div>

    <!-- SECTION 1: WHAT IS BEING TRACKED CURRENTLY (ACTIVE GOALS GRID) -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-black text-white flex items-center gap-2">
            🎯 Active Configured Goals
            <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              ${goalsList.length} Active Trackers
            </span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Live conversion rules actively monitored & auto-healed by ClicktoTrack</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${goalsList.map((g: any) => `
          <div class="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all">
            <div class="flex justify-between items-start gap-2">
              <span class="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/30">
                ${g.category || 'Form Fill'}
              </span>
              <span class="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                ✓ Tracking Active
              </span>
            </div>
            <h3 class="text-sm font-bold text-white">${g.title}</h3>
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 truncate">
              ${g.selectorCss || g.selector || 'button[type="submit"]'}
            </div>
            <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div>24h Volume: <span class="font-bold text-emerald-400">${g.conversions24h || 24}</span></div>
              <div>Last Activity: <span class="text-slate-300 font-medium">${g.lastTriggered || 'Recent'}</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SECTION 2: GOAL ACTIVITY HISTORY LOG -->
    <div class="glass-card p-6 rounded-2xl space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-black text-white flex items-center gap-2">
            📜 Goal Trigger Activity History Log
            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Real-Time Feed
            </span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Audit log of all triggered conversions across Google Ads, GA4, Meta CAPI, and Microsoft Ads</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <select id="log-filter-goal" onchange="filterLogs()" class="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold py-2 px-3 rounded-lg outline-none">
            <option value="ALL">Filter Goal: All Configured Goals</option>
            ${goalsList.map((g: any) => `<option value="${g.title}">${g.title}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/90 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th class="py-3 px-4">Timestamp</th>
              <th class="py-3 px-4">Goal Title & Category</th>
              <th class="py-3 px-4">Page URL</th>
              <th class="py-3 px-4">Attribution Identifiers</th>
              <th class="py-3 px-4">SHA-256 PII</th>
              <th class="py-3 px-4">Dispatch Status</th>
            </tr>
          </thead>
          <tbody id="log-tbody" class="divide-y divide-slate-800 font-mono text-xs">
            ${finalFeed.map((item: any) => `
              <tr class="log-row hover:bg-slate-800/50 transition-colors" data-goal="${item.goalTitle}">
                <td class="py-3 px-4 text-slate-400 whitespace-nowrap font-sans">${item.timestamp}</td>
                <td class="py-3 px-4 font-sans">
                  <div class="font-bold text-white">${item.goalTitle}</div>
                  <div class="text-[11px] text-indigo-400">${item.category}</div>
                </td>
                <td class="py-3 px-4 text-slate-400 truncate max-w-xs">${item.pageUrl}</td>
                <td class="py-3 px-4 text-emerald-400 font-semibold truncate max-w-xs">${item.clickId}</td>
                <td class="py-3 px-4 font-sans">
                  ${item.hasPII ? '<span class="text-emerald-400 font-bold">🔒 Hashed</span>' : '<span class="text-slate-500">Anonymous</span>'}
                </td>
                <td class="py-3 px-4 font-sans whitespace-nowrap">
                  ${item.status === 'DISPATCHED' ? '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">✓ Dispatched (200 OK)</span>' : ''}
                  ${item.status === 'SPAM_SUPPRESSED' ? '<span class="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🛡 Spam Suppressed</span>' : ''}
                  ${item.status === 'EXCLUDED_EXISTING_CUSTOMER' ? '<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🎯 Existing Buyer Excluded</span>' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- ONBOARDING SETUP WIZARD MODAL -->
  <div id="wizard-modal" style="display: none;" class="fixed inset-0 z-50 modal-backdrop p-4 flex items-center justify-center overflow-y-auto">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 text-slate-200">
      
      <div class="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h3 class="text-lg font-black text-white">Client Onboarding & Conversion Setup Wizard</h3>
          <p class="text-xs text-slate-400 mt-0.5">Provision workspace, 1st-party edge proxy, call tracking, and ad platforms</p>
        </div>
        <button type="button" onclick="closeWizard()" class="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
      </div>

      <!-- Step Indicator Pills -->
      <div class="flex items-center space-x-2">
        <div id="step-tab-1" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white">1. Workspace & Phone</div>
        <div id="step-tab-2" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-400">2. Goal Setup</div>
        <div id="step-tab-3" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-400">3. Ad Platforms</div>
      </div>

      <!-- WIZARD STEP 1 -->
      <div id="wizard-step-1" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Company / Client Name</label>
          <input type="text" id="wiz-company-name" oninput="updateSiteId()" placeholder="e.g. Acme Plumbing Services" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Target Website Domain</label>
          <input type="text" id="wiz-domain" oninput="updateSiteId()" placeholder="e.g. acmeplumbing.com" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Destination Forwarding Phone Number</label>
          <input type="text" id="wiz-forwarding-phone" placeholder="e.g. +1 (555) 123-4567" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
          <p class="text-[11px] text-slate-400 mt-1">Where website call tracking & dynamic pool numbers route calls.</p>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">ClicktoTrack Alert SMS Phone Number</label>
          <input type="text" id="wiz-alert-phone" placeholder="e.g. +1 (555) 987-6543" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
          <p class="text-[11px] text-slate-400 mt-1">Where anomaly warnings & self-healing status texts are sent.</p>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Auto-Generated Workspace Site ID</label>
          <input type="text" id="wiz-site-id-preview" readonly class="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs text-indigo-400 outline-none font-mono">
        </div>
      </div>

      <!-- WIZARD STEP 2 -->
      <div id="wizard-step-2" style="display: none;" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">Choice of Installation Method</label>
          <div class="flex flex-wrap gap-2 mb-3">
            <button type="button" id="install-btn-cname" onclick="switchInstallTab('cname')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white">1. CNAME Proxy</button>
            <button type="button" id="install-btn-headtag" onclick="switchInstallTab('headtag')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300">2. Head Snippet</button>
            <button type="button" id="install-btn-wp" onclick="switchInstallTab('wp')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300">3. WP mu-plugin</button>
            <button type="button" id="install-btn-shopify" onclick="switchInstallTab('shopify')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300">4. Shopify App</button>
          </div>

          <!-- Install Tab 1: CNAME -->
          <div id="install-content-cname" class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div class="font-bold text-indigo-400">Option 1: CNAME Edge Proxy (Recommended)</div>
            <p class="text-slate-400">Point CNAME <code class="text-white">track.yourdomain.com</code> to <code class="text-white">proxy.clicktotrack.io</code>. Zero code edits, total immunity from theme updates, and 100% Safari ITP protection.</p>
          </div>

          <!-- Install Tab 2: Head Snippet -->
          <div id="install-content-headtag" style="display: none;" class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div class="font-bold text-indigo-400">Option 2: Universal JavaScript &lt;head&gt; Snippet</div>
            <p class="text-slate-400">Paste this 1st-party script tag before &lt;/head&gt; on custom HTML, PHP, or React sites:</p>
            <textarea id="tag-head-snippet" readonly rows="2" class="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px] p-2 rounded outline-none">&lt;script src="https://track.yourdomain.com/clicktotrack.js" async&gt;&lt;/script&gt;</textarea>
            <button type="button" id="btn-copy-tag" onclick="copyToClipboard('tag-head-snippet', 'btn-copy-tag')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-3 py-1 rounded">Copy Tag</button>
          </div>

          <!-- Install Tab 3: WP -->
          <div id="install-content-wp" style="display: none;" class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div class="font-bold text-indigo-400">Option 3: WordPress Must-Use Plugin (mu-plugin)</div>
            <p class="text-slate-400">Create <code class="text-white">/wp-content/mu-plugins/clicktotrack.php</code> for auto-enabled, un-deactivatable tracking.</p>
          </div>

          <!-- Install Tab 4: Shopify -->
          <div id="install-content-shopify" style="display: none;" class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div class="font-bold text-indigo-400">Option 4: Shopify Theme App Extension</div>
            <p class="text-slate-400">Enable the ClicktoTrack App Embed in Shopify Admin &gt; Online Store &gt; Themes &gt; Customize &gt; App Embeds.</p>
          </div>
        </div>

        <div class="border-t border-slate-800 pt-3 space-y-3">
          <div class="font-bold text-xs text-white">Goal Category Setup Rules</div>
          
          <div class="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div>
              <div class="font-bold text-white">📞 Phone Call Minimum Duration</div>
              <div class="text-[11px] text-slate-400">Minimum call length required to report a conversion</div>
            </div>
            <select class="bg-slate-900 text-white border border-slate-700 text-xs font-bold py-1 px-2 rounded outline-none">
              <option value="30">30 seconds</option>
              <option value="60" selected>60 seconds (Default)</option>
              <option value="120">120 seconds</option>
              <option value="240">240 seconds</option>
            </select>
          </div>

          <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div class="flex justify-between items-center">
              <div class="font-bold text-white">🛒 Cart Purchases Snippet</div>
              <div class="flex gap-1">
                <button type="button" id="cart-btn-shopify" onclick="switchCartTab('shopify')" class="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-600 text-white">Shopify</button>
                <button type="button" id="cart-btn-custom" onclick="switchCartTab('custom')" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">Custom/Woo</button>
              </div>
            </div>

            <div id="cart-content-shopify" class="text-slate-400 text-[11px]">
              Automatically captures Order ID, Currency, and Value via native Shopify App Embed.
            </div>
            <div id="cart-content-custom" style="display: none;" class="space-y-1.5">
              <textarea id="cart-custom-code" readonly rows="3" class="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[10px] p-2 rounded outline-none">&lt;script&gt;
window.clickToTrack('purchase', { order_id: '<?php echo $order_id; ?>', value: <?php echo $total; ?>, currency: 'USD', email: '<?php echo $email; ?>' });
&lt;/script&gt;</textarea>
              <button type="button" id="btn-copy-cart" onclick="copyToClipboard('cart-custom-code', 'btn-copy-cart')" class="bg-indigo-600 text-white font-bold text-[10px] px-2.5 py-1 rounded">Copy Snippet</button>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div>
              <div class="font-bold text-white">⏱️ Time on Site ("Engaged User") Benchmark</div>
              <div class="text-[11px] text-slate-400">Duration required to fire GA4 engaged_session key event</div>
            </div>
            <select class="bg-slate-900 text-white border border-slate-700 text-xs font-bold py-1 px-2 rounded outline-none">
              <option value="10" selected>10 seconds (Default)</option>
              <option value="20">20 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
            </select>
          </div>
        </div>
      </div>

      <!-- WIZARD STEP 3 -->
      <div id="wizard-step-3" style="display: none;" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Google Ads Customer ID</label>
          <input type="text" id="wiz-gads-id" placeholder="e.g. 123-456-7890" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">GA4 Measurement ID & Secret</label>
          <input type="text" id="wiz-ga4-id" placeholder="e.g. G-XXXXXXX | Secret: abc123xyz" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Meta CAPI Pixel ID & Access Token</label>
          <input type="text" id="wiz-meta-id" placeholder="e.g. Pixel: 9876543210" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Microsoft Advertising (Bing Ads) UET Tag ID & Account ID</label>
          <input type="text" id="wiz-msft-uet" placeholder="e.g. UET: 18009922 | Account: 991823" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none font-mono">
        </div>
      </div>

      <!-- Wizard Buttons -->
      <div class="flex justify-between items-center pt-4 border-t border-slate-800">
        <button type="button" id="wiz-back-btn" onclick="prevWizardStep()" style="display: none;" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-lg">
          ← Back
        </button>
        <div class="ml-auto flex gap-2">
          <button type="button" onclick="closeWizard()" class="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs px-4 py-2 rounded-lg">
            Cancel
          </button>
          <button type="button" id="wiz-next-btn" onclick="nextWizardStep()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg">
            Next Step →
          </button>
          <button type="button" id="wiz-save-btn" onclick="submitWizard()" style="display: none;" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-lg shadow-emerald-600/30">
            Save & Provision Workspace
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- CONFIGURE MODAL -->
  <div id="config-modal" style="display: none;" class="fixed inset-0 z-50 modal-backdrop p-4 flex items-center justify-center">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 class="text-sm font-black text-white">⚙️ Workspace Conversion Rules & Thresholds</h3>
        <button type="button" onclick="closeConfigureModal()" class="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
      </div>
      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Call Duration Threshold</label>
          <select class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white outline-none">
            <option value="30">30 seconds</option>
            <option value="60" selected>60 seconds (Recommended)</option>
            <option value="120">120 seconds</option>
            <option value="240">240 seconds</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Time on Site Benchmark ("Engaged User")</label>
          <select class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white outline-none">
            <option value="10" selected>10 seconds (GA4 Benchmark)</option>
            <option value="20">20 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-800 flex justify-end">
        <button type="button" onclick="closeConfigureModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg">Save Changes</button>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT GLOBAL HANDLERS -->
  <script>
    window.openWizard = function() {
      console.log('openWizard called');
      var modal = document.getElementById('wizard-modal');
      if (modal) {
        modal.style.display = 'flex';
        window.currentStep = 1;
        window.updateWizardStepUI();
      }
    };

    window.closeWizard = function() {
      var modal = document.getElementById('wizard-modal');
      if (modal) modal.style.display = 'none';
    };

    window.openConfigureModal = function() {
      var modal = document.getElementById('config-modal');
      if (modal) modal.style.display = 'flex';
    };

    window.closeConfigureModal = function() {
      var modal = document.getElementById('config-modal');
      if (modal) modal.style.display = 'none';
    };

    window.currentStep = 1;

    window.updateWizardStepUI = function() {
      for (var i = 1; i <= 3; i++) {
        var stepEl = document.getElementById('wizard-step-' + i);
        var tabEl = document.getElementById('step-tab-' + i);
        if (stepEl) stepEl.style.display = (i === window.currentStep) ? 'block' : 'none';
        if (tabEl) {
          if (i === window.currentStep) {
            tabEl.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white';
          } else {
            tabEl.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-400';
          }
        }
      }
      var backBtn = document.getElementById('wiz-back-btn');
      var nextBtn = document.getElementById('wiz-next-btn');
      var saveBtn = document.getElementById('wiz-save-btn');
      if (backBtn) backBtn.style.display = (window.currentStep > 1) ? 'inline-block' : 'none';
      if (nextBtn) nextBtn.style.display = (window.currentStep < 3) ? 'inline-block' : 'none';
      if (saveBtn) saveBtn.style.display = (window.currentStep === 3) ? 'inline-block' : 'none';
    };

    window.nextWizardStep = function() {
      if (window.currentStep < 3) {
        window.currentStep++;
        window.updateWizardStepUI();
      }
    };

    window.prevWizardStep = function() {
      if (window.currentStep > 1) {
        window.currentStep--;
        window.updateWizardStepUI();
      }
    };

    window.switchInstallTab = function(tabId) {
      var tabs = ['cname', 'headtag', 'wp', 'shopify'];
      tabs.forEach(function(t) {
        var content = document.getElementById('install-content-' + t);
        var btn = document.getElementById('install-btn-' + t);
        if (content) content.style.display = (t === tabId) ? 'block' : 'none';
        if (btn) {
          btn.className = (t === tabId)
            ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-sm'
            : 'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300';
        }
      });
    };

    window.switchCartTab = function(tabId) {
      var contentShopify = document.getElementById('cart-content-shopify');
      var contentCustom = document.getElementById('cart-content-custom');
      var btnShopify = document.getElementById('cart-btn-shopify');
      var btnCustom = document.getElementById('cart-btn-custom');
      if (contentShopify) contentShopify.style.display = (tabId === 'shopify') ? 'block' : 'none';
      if (contentCustom) contentCustom.style.display = (tabId === 'custom') ? 'block' : 'none';
      if (btnShopify) btnShopify.className = (tabId === 'shopify') ? 'px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-600 text-white' : 'px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300';
      if (btnCustom) btnCustom.className = (tabId === 'custom') ? 'px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-600 text-white' : 'px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300';
    };

    window.copyToClipboard = function(elementId, btnId) {
      var textEl = document.getElementById(elementId);
      if (!textEl) return;
      var text = textEl.value || textEl.innerText;
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(btnId);
        if (btn) {
          var original = btn.innerText;
          btn.innerText = '✓ Copied!';
          setTimeout(function() { btn.innerText = original; }, 2000);
        }
      });
    };

    window.updateSiteId = function() {
      var company = document.getElementById('wiz-company-name').value;
      var domain = document.getElementById('wiz-domain').value;
      var clean = (domain || company || 'new-client')
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .split('/')[0]
        .replace(/[^a-z0-9]/g, '-');
      var preview = clean + '-workspace';
      var previewEl = document.getElementById('wiz-site-id-preview');
      if (previewEl) previewEl.value = preview;
    };

    window.filterLogs = function() {
      var selected = document.getElementById('log-filter-goal').value;
      var rows = document.querySelectorAll('.log-row');
      rows.forEach(function(row) {
        var goal = row.getAttribute('data-goal');
        if (selected === 'ALL' || goal === selected) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    };

    window.submitWizard = function() {
      var domainEl = document.getElementById('wiz-domain');
      var domain = domainEl ? domainEl.value : '';
      if (!domain) {
        alert('Please enter a website domain.');
        return;
      }
      var payload = {
        name: document.getElementById('wiz-company-name').value || domain,
        domain: domain,
        forwardingPhone: document.getElementById('wiz-forwarding-phone').value,
        alertPhone: document.getElementById('wiz-alert-phone').value,
        gadsId: document.getElementById('wiz-gads-id').value,
        ga4Id: document.getElementById('wiz-ga4-id').value,
        metaId: document.getElementById('wiz-meta-id').value,
        msftUet: document.getElementById('wiz-msft-uet').value
      };
      fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert('Client workspace successfully created: ' + data.workspace.siteId);
          window.closeWizard();
          window.location.reload();
        } else {
          alert('Error creating workspace: ' + (data.error || 'Server error'));
        }
      })
      .catch(function(err) {
        alert('Network error creating workspace: ' + err.message);
      });
    };
  </script>
</body>
</html>`;

      return reply.type('text/html').send(htmlContent);
    } catch (error: any) {
      fastify.log.error(`[Dashboard HTML Error]: ${error?.message || error}`);
      return reply.status(500).send('<h1>Internal Server Error Rendering Dashboard</h1>');
    }
  };

  fastify.get('/dashboard', renderDashboardHtml);
  fastify.get('/dashboard/:siteId?', renderDashboardHtml);
}
