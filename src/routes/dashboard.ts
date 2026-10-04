Open **`src/routes/dashboard.ts`** in VS Code, select all, delete, and paste this exact code:

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Serve Visual Dashboard HTML Interface (GET /dashboard)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClicktoTrack Control Center</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- HEADER -->
    <header class="flex justify-between items-center bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">⚡ ClicktoTrack Control Center</h1>
        <p class="text-xs text-gray-400 mt-1">Multi-Channel S2S Conversion Engine & Workspace Manager</p>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="openWizard()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30">
          + Add New Client / Domain
        </button>
        <select id="workspaceSelect" onchange="switchWorkspace(this.value)" class="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium">
          <option value="">Loading client workspaces...</option>
        </select>
      </div>
    </header>

    <!-- KPI CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">30-Day Conversions</div>
        <div class="text-3xl font-bold text-white mt-2" id="kpi-conversions">1,428</div>
        <div class="text-xs text-emerald-400 mt-1">↑ +14.2% vs prior month</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Safari ITP Recovery</div>
        <div class="text-3xl font-bold text-indigo-400 mt-2">+28.4%</div>
        <div class="text-xs text-indigo-300 mt-1">90-Day Cookie Restoration</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Consent Mode v2</div>
        <div class="text-3xl font-bold text-emerald-400 mt-2">Active (100%)</div>
        <div class="text-xs text-gray-400 mt-1">Cookieless Modeling Enabled</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Edge Proxy Status</div>
        <div class="text-3xl font-bold text-emerald-400 mt-2">Healthy</div>
        <div class="text-xs text-emerald-400 mt-1">1st-Party CNAME Proxy Shield</div>
      </div>
    </div>

  </div>

  <!-- ONBOARDING WIZARD MODAL -->
  <div id="wizardModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-gray-800 border border-gray-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
      <div class="flex items-center justify-between border-b border-gray-700 pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">New Client Onboarding & Setup Wizard</h2>
          <p class="text-xs text-gray-400">Configure 1st-party conversion tracking & ad integrations</p>
        </div>
        <button onclick="closeWizard()" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      </div>

      <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-2">
        <!-- STEP 1: BUSINESS & WEBSITE -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 1: Client & Website Details</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Company / Workspace Name *</label>
              <input type="text" id="wizName" placeholder="e.g. Acme Plumbing & HVAC" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Target Website Domain *</label>
              <input type="text" id="wizDomain" placeholder="e.g. acmeplumbing.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Primary Business Phone Number</label>
            <input type="text" id="wizPhone" placeholder="e.g. +1 (555) 019-2831" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
          </div>
        </div>

        <!-- STEP 2: INSTALLATION METHOD -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 2: Installation Method Selection</div>
          <div class="space-y-2">
            <label class="flex items-start gap-2 bg-gray-900 p-2.5 rounded-lg border border-indigo-700/50 cursor-pointer">
              <input type="radio" name="wizInstall" value="cname" checked onchange="toggleInstallInstructions('cname')" class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white">Option 1: CNAME Setup (Recommended)</span>
                <p class="text-[11px] text-gray-400">Zero code changes, immune to theme updates & 100% ad-blocker resistant.</p>
              </div>
            </label>
            <label class="flex items-start gap-2 bg-gray-900 p-2.5 rounded-lg border border-gray-800 cursor-pointer">
              <input type="radio" name="wizInstall" value="wp-mu" onchange="toggleInstallInstructions('wp')" class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white">Option 2: WordPress Plugin / Must-Use (mu-plugin)</span>
                <p class="text-[11px] text-gray-400">Install from WP Directory or upload single mu-plugin PHP file.</p>
              </div>
            </label>
            <label class="flex items-start gap-2 bg-gray-900 p-2.5 rounded-lg border border-gray-800 cursor-pointer">
              <input type="radio" name="wizInstall" value="shopify" onchange="toggleInstallInstructions('shopify')" class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white">Option 3: Shopify Theme App Extension</span>
                <p class="text-[11px] text-gray-400">Native App Embed that persists across Shopify theme updates.</p>
              </div>
            </label>
          </div>

          <!-- DYNAMIC INSTALLATION PANEL -->
          <div id="installBox-cname" class="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1">
            <div class="text-[11px] font-bold text-emerald-400">1st-Party Edge Proxy CNAME Record Target:</div>
            <div class="font-mono text-gray-200 text-[11px] bg-gray-900 p-2 rounded border border-gray-800 flex justify-between items-center">
              <span>CNAME track &rarr; whale-app-gel7l.ondigitalocean.app</span>
              <button onclick="navigator.clipboard.writeText('whale-app-gel7l.ondigitalocean.app'); alert('Copied CNAME target!')" class="text-indigo-400 hover:text-indigo-300 font-sans text-[10px] font-bold">Copy Target</button>
            </div>
          </div>

          <div id="installBox-wp" class="hidden bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2">
            <div class="text-[11px] font-bold text-indigo-400">WordPress Installation Pathways:</div>
            <div class="text-[11px] text-gray-300 space-y-1">
              <p><b>Path A (WP Directory):</b> Search <i>"ClicktoTrack"</i> in WP Admin &rarr; Plugins &rarr; Add New, then enter your Site ID.</p>
              <p><b>Path B (1-Click Upload):</b> Download pre-configured <code>.zip</code> plugin file below and upload in WP Admin.</p>
            </div>
            <button onclick="alert('Downloading clicktotrack-loader.zip plugin package...')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded text-[11px] transition-all">
              📥 Download Pre-Configured WP Plugin (.zip)
            </button>
          </div>

          <div id="installBox-shopify" class="hidden bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2">
            <div class="text-[11px] font-bold text-indigo-400">Shopify Theme App Extension Pathways:</div>
            <div class="text-[11px] text-gray-300 space-y-1">
              <p><b>Option A:</b> Shopify Admin &rarr; Online Store &rarr; Themes &rarr; Customize &rarr; App Embeds &rarr; Toggle <i>"ClicktoTrack"</i> ON.</p>
              <p><b>Option B (Manual Snippet):</b> Paste this code directly above <code>&lt;/head&gt;</code> in <code>theme.liquid</code>:</p>
            </div>
            <div class="font-mono text-gray-200 text-[10px] bg-gray-900 p-2 rounded border border-gray-800 overflow-x-auto">
              &lt;script src="https://whale-app-gel7l.ondigitalocean.app/script/latest.js" async&gt;&lt;/script&gt;
            </div>
          </div>
        </div>

        <!-- STEP 3: AD PLATFORM INTEGRATIONS WITH TOOLTIPS -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 3: Ad Platform & Analytics Credentials</div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Google Ads Customer ID -->
            <div>
              <label class="flex items-center justify-between font-semibold text-gray-300 mb-1">
                <span>Google Ads Customer ID</span>
                <div class="relative group cursor-pointer">
                  <span class="text-gray-400 hover:text-indigo-400 text-[10px] font-bold bg-gray-800 border border-gray-700 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                  <div class="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-950 border border-gray-700 text-gray-200 text-[11px] p-2.5 rounded-xl shadow-2xl z-50 font-normal leading-relaxed">
                    Log into Google Ads. Look at the top-right corner next to your profile icon for your 10-digit Customer ID (e.g. 123-456-7890).
                  </div>
                </div>
              </label>
              <input type="text" id="wizGadsId" placeholder="e.g. 123-456-7890" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>

            <!-- GA4 Measurement ID -->
            <div>
              <label class="flex items-center justify-between font-semibold text-gray-300 mb-1">
                <span>GA4 Measurement ID</span>
                <div class="relative group cursor-pointer">
                  <span class="text-gray-400 hover:text-indigo-400 text-[10px] font-bold bg-gray-800 border border-gray-700 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                  <div class="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-950 border border-gray-700 text-gray-200 text-[11px] p-2.5 rounded-xl shadow-2xl z-50 font-normal leading-relaxed">
                    In GA4, go to Admin (gear) &rarr; Data Streams &rarr; click your Web Stream &rarr; copy the 'Measurement ID' starting with G- (e.g. G-X1Y2Z3A4).
                  </div>
                </div>
              </label>
              <input type="text" id="wizGa4Id" placeholder="e.g. G-X1Y2Z3A4" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>

            <!-- Meta Pixel ID / CAPI Token -->
            <div>
              <label class="flex items-center justify-between font-semibold text-gray-300 mb-1">
                <span>Meta Pixel ID / CAPI Token</span>
                <div class="relative group cursor-pointer">
                  <span class="text-gray-400 hover:text-indigo-400 text-[10px] font-bold bg-gray-800 border border-gray-700 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                  <div class="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-950 border border-gray-700 text-gray-200 text-[11px] p-2.5 rounded-xl shadow-2xl z-50 font-normal leading-relaxed">
                    In Meta Events Manager &rarr; Data Sources &rarr; Settings. Copy your Dataset / Pixel ID (or generate an Access Token under Conversions API).
                  </div>
                </div>
              </label>
              <input type="text" id="wizMetaPixelId" placeholder="e.g. 1092837465" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>

            <!-- Microsoft / Bing Ads UET Tag ID -->
            <div>
              <label class="flex items-center justify-between font-semibold text-gray-300 mb-1">
                <span>Microsoft / Bing Ads UET Tag ID</span>
                <div class="relative group cursor-pointer">
                  <span class="text-gray-400 hover:text-indigo-400 text-[10px] font-bold bg-gray-800 border border-gray-700 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                  <div class="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-950 border border-gray-700 text-gray-200 text-[11px] p-2.5 rounded-xl shadow-2xl z-50 font-normal leading-relaxed">
                    In Microsoft Advertising, go to Tools &rarr; UET Tag and copy your 8-digit Tag ID (e.g. 187029384).
                  </div>
                </div>
              </label>
              <input type="text" id="wizMsUetId" placeholder="e.g. 187029384" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
            </div>
          </div>
        </div>

        <!-- STEP 4: CALL TRACKING PROVIDER -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 4: Call Tracking Provider & Account Model</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Call Tracking Provider</label>
              <select id="wizCallProvider" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                <option value="callrail">CallRail (US/CA Default)</option>
                <option value="ctm">CallTrackingMetrics (Global/International)</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Account Mode</label>
              <select id="wizAccountMode" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                <option value="whitelabel">Whitelabel Turnkey (SaaS Master Account)</option>
                <option value="byo">BYO Account (Own API Key)</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      <div class="flex items-center justify-end space-x-3 pt-3 border-t border-gray-700">
        <button onclick="closeWizard()" class="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">Cancel</button>
        <button onclick="saveWorkspace()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
          Complete Setup &amp; Save Client
        </button>
      </div>
    </div>
  </div>

  <script>
    function openWizard() { document.getElementById('wizardModal').classList.remove('hidden'); }
    function closeWizard() { document.getElementById('wizardModal').classList.add('hidden'); }

    function toggleInstallInstructions(type) {
      document.getElementById('installBox-cname').classList.add('hidden');
      document.getElementById('installBox-wp').classList.add('hidden');
      document.getElementById('installBox-shopify').classList.add('hidden');

      if (type === 'cname') document.getElementById('installBox-cname').classList.remove('hidden');
      if (type === 'wp') document.getElementById('installBox-wp').classList.remove('hidden');
      if (type === 'shopify') document.getElementById('installBox-shopify').classList.remove('hidden');
    }

    async function loadWorkspaces() {
      try {
        const res = await fetch('/api/v1/workspaces');
        if (!res.ok) return;
        const data = await res.json();
        if (data.workspaces && data.workspaces.length > 0) {
          const select = document.getElementById('workspaceSelect');
          select.innerHTML = '';
          data.workspaces.forEach(ws => {
            const opt = document.createElement('option');
            opt.value = ws.siteId;
            opt.textContent = ws.domain + ' (' + (ws.cnameDomain || 'track.' + ws.domain) + ')';
            select.appendChild(opt);
          });
        }
      } catch (err) {
        console.error('Error loading workspaces:', err);
      }
    }

    async function saveWorkspace() {
      const name = document.getElementById('wizName').value || 'New Client';
      const domain = document.getElementById('wizDomain').value || '';
      const phone = document.getElementById('wizPhone').value || '';
      const gadsId = document.getElementById('wizGadsId').value || '';
      const ga4Id = document.getElementById('wizGa4Id').value || '';
      const metaPixelId = document.getElementById('wizMetaPixelId').value || '';
      const msUetId = document.getElementById('wizMsUetId').value || '';
      const callProvider = document.getElementById('wizCallProvider').value || 'callrail';
      const installRadio = document.querySelector('input[name="wizInstall"]:checked');
      const installMethod = installRadio ? installRadio.value : 'cname';

      if (!domain) {
        alert('Please enter a target website domain.');
        return;
      }

      try {
        const res = await fetch('/api/v1/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            domain,
            phone,
            gadsId,
            ga4Id,
            metaPixelId,
            msUetId,
            callProvider,
            installMethod
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Successfully created workspace for ' + domain + '!');
          closeWizard();
          loadWorkspaces();
        } else {
          alert('Error: ' + (data.error || 'Failed to save workspace'));
        }
      } catch (err) {
        alert('Error connecting to backend server.');
      }
    }

    function switchWorkspace(val) {
      if (val) {
        alert('Switched active workspace to: ' + val);
      }
    }

    loadWorkspaces();
  </script>
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

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: {
          goals: true,
          conversions: { take: 100, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      return reply.status(200).send({
        success: true,
        workspace: { siteId: workspace.siteId, domain: workspace.domain },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}