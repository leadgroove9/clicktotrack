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
    <div class="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
      <div class="flex items-center justify-between border-b border-gray-700 pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">New Client Onboarding & Setup Wizard</h2>
          <p class="text-xs text-gray-400">Configure 1st-party conversion tracking & ad integrations</p>
        </div>
        <button onclick="closeWizard()" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      </div>

      <div class="space-y-4 text-xs max-h-[72vh] overflow-y-auto pr-2">
        <!-- STEP 1: BUSINESS & WEBSITE -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 1: Client & Website Profile</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Company / Workspace Name *</label>
              <input type="text" id="wizName" oninput="updateDynamicSiteId()" placeholder="e.g. Acme Plumbing & HVAC" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Target Website Domain *</label>
              <input type="text" id="wizDomain" oninput="updateDynamicSiteId()" placeholder="e.g. acmeplumbing.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
            </div>
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Primary Business Phone Number</label>
            <input type="text" id="wizPhone" placeholder="e.g. +1 (555) 019-2831" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
          </div>
        </div>

        <!-- STEP 2: INSTALLATION METHOD SELECTION -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 2: Installation Method Selection</div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label onclick="updateInstallMethod('cname')" class="flex items-start gap-2 bg-gray-900 p-3 rounded-xl border border-indigo-500 cursor-pointer transition-all hover:border-indigo-400">
              <input type="radio" name="wizInstall" value="cname" checked class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white block">CNAME Proxy</span>
                <span class="text-[10px] text-emerald-400 font-semibold">Recommended</span>
              </div>
            </label>

            <label onclick="updateInstallMethod('wp-mu')" class="flex items-start gap-2 bg-gray-900 p-3 rounded-xl border border-gray-700 cursor-pointer transition-all hover:border-indigo-400">
              <input type="radio" name="wizInstall" value="wp-mu" class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white block">WordPress</span>
                <span class="text-[10px] text-gray-400">Plugin / mu-plugin</span>
              </div>
            </label>

            <label onclick="updateInstallMethod('shopify')" class="flex items-start gap-2 bg-gray-900 p-3 rounded-xl border border-gray-700 cursor-pointer transition-all hover:border-indigo-400">
              <input type="radio" name="wizInstall" value="shopify" class="mt-0.5 text-indigo-600">
              <div>
                <span class="font-bold text-white block">Shopify</span>
                <span class="text-[10px] text-gray-400">App Embed / Liquid</span>
              </div>
            </label>
          </div>

          <!-- DYNAMIC PANEL A: CNAME SETUP -->
          <div id="install-cname-box" class="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs">DNS 1st-Party Edge Proxy Setup:</span>
              <span class="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">100% Ad-Blocker Immune</span>
            </div>
            <p class="text-gray-400 text-[11px]">Add a 1st-party CNAME record in Cloudflare, Namecheap, or GoDaddy pointing to ClicktoTrack:</p>
            <div class="bg-gray-900 p-2.5 rounded-lg border border-gray-800 flex items-center justify-between font-mono text-[11px]">
              <div><span class="text-indigo-400 font-bold">CNAME</span> track &rarr; <span class="text-white">whale-app-gel7l.ondigitalocean.app</span></div>
              <button onclick="navigator.clipboard.writeText('whale-app-gel7l.ondigitalocean.app'); alert('Copied CNAME target!')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1 rounded text-[10px]">Copy Target</button>
            </div>
          </div>

          <!-- DYNAMIC PANEL B: WORDPRESS SETUP -->
          <div id="install-wp-box" class="hidden bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div class="font-bold text-white text-xs flex items-center gap-2">
              <span>🔵 WordPress Installation Pathways:</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div class="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2">
                <div class="font-bold text-indigo-300">Path A: Official WP Directory</div>
                <ol class="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Go to <span class="text-white font-semibold">WP Admin &rarr; Plugins &rarr; Add New</span>.</li>
                  <li>Search for <span class="text-white font-semibold">"ClicktoTrack"</span>.</li>
                  <li>Click <span class="text-emerald-400 font-semibold">Install & Activate</span>.</li>
                  <li>Paste your Workspace Site ID below:</li>
                </ol>
                <div class="flex items-center gap-2 pt-1">
                  <input type="text" id="wpSiteIdDisplay" readonly value="acmeplumbing-com-workspace" class="bg-gray-950 border border-gray-700 text-indigo-300 text-[10px] font-mono rounded px-2 py-1 w-full">
                  <button onclick="copySiteId('wpSiteIdDisplay')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap">Copy ID</button>
                </div>
              </div>

              <div class="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div class="font-bold text-indigo-300">Path B: Direct 1-Click Download</div>
                  <p class="text-gray-400 mt-1">Download pre-configured plugin file or copy to <span class="font-mono text-gray-300">/wp-content/mu-plugins/</span> to prevent client overwrites.</p>
                </div>
                <button onclick="downloadWpPlugin()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 shadow-md">
                  📥 Download Plugin (.zip / .php)
                </button>
              </div>
            </div>
          </div>

          <!-- DYNAMIC PANEL C: SHOPIFY SETUP -->
          <div id="install-shopify-box" class="hidden bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div class="font-bold text-white text-xs flex items-center gap-2">
              <span>🛍️ Shopify Store Installation Pathways:</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div class="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2">
                <div class="font-bold text-indigo-300">Path A: Shopify App Embed (Recommended)</div>
                <ol class="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Go to <span class="text-white font-semibold">Shopify Admin &rarr; Online Store &rarr; Themes</span>.</li>
                  <li>Click <span class="text-indigo-400 font-semibold">Customize</span> &rarr; select <span class="text-white font-semibold">App Embeds</span> icon in left sidebar.</li>
                  <li>Enable <span class="text-emerald-400 font-semibold">ClicktoTrack 1st-Party Engine</span> and paste your Site ID:</li>
                </ol>
                <div class="flex items-center gap-2 pt-1">
                  <input type="text" id="shopifySiteIdDisplay" readonly value="acmeplumbing-com-workspace" class="bg-gray-950 border border-gray-700 text-indigo-300 text-[10px] font-mono rounded px-2 py-1 w-full">
                  <button onclick="copySiteId('shopifySiteIdDisplay')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap">Copy ID</button>
                </div>
              </div>

              <div class="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div class="font-bold text-indigo-300">Path B: Manual theme.liquid Snippet</div>
                  <p class="text-gray-400 mt-1">Paste this line right before <span class="font-mono text-gray-300">&lt;/head&gt;</span> in <span class="font-mono text-gray-300">theme.liquid</span>:</p>
                </div>
                <div class="bg-gray-950 p-2 rounded border border-gray-800 font-mono text-[9px] text-gray-300 break-all" id="shopifySnippetBox">
                  &lt;script src="https://whale-app-gel7l.ondigitalocean.app/script/latest.js" data-site-id="acmeplumbing-com-workspace" async&gt;&lt;/script&gt;
                </div>
                <button onclick="copyShopifySnippet()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs">
                  Copy Snippet Code
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- STEP 3: AD PLATFORM INTEGRATIONS -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 3: Ad Platform & Analytics Credentials</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Google Ads Customer ID</label>
              <input type="text" id="wizGadsId" placeholder="e.g. 123-456-7890" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold text-gray-300 mb-1">GA4 Measurement ID</label>
              <input type="text" id="wizGa4Id" placeholder="e.g. G-X1Y2Z3A4" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
            </div>
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Meta Pixel ID / CAPI Token</label>
            <input type="text" id="wizMetaPixelId" placeholder="e.g. 1092837465" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
          </div>
        </div>

        <!-- STEP 4: CALL TRACKING PROVIDER -->
        <div class="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
          <div class="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Step 4: Call Tracking Provider & Account Model</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Call Tracking Provider</label>
              <select id="wizCallProvider" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
                <option value="callrail">CallRail (US/CA Default)</option>
                <option value="ctm">CallTrackingMetrics (Global/International)</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-gray-300 mb-1">Account Mode</label>
              <select id="wizAccountMode" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
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

    function updateDynamicSiteId() {
      const domain = document.getElementById('wizDomain').value || 'acmeplumbing.com';
      const clean = domain.trim().toLowerCase().replace(/^(https?:\\/\\/)?(www\\.)?/, '').split('/')[0].replace(/[^a-z0-9]/g, '-');
      const siteId = (clean || 'client') + '-workspace';
      
      document.getElementById('wpSiteIdDisplay').value = siteId;
      document.getElementById('shopifySiteIdDisplay').value = siteId;
      document.getElementById('shopifySnippetBox').innerText = '<script src="https://whale-app-gel7l.ondigitalocean.app/script/latest.js" data-site-id="' + siteId + '" async><\\/script>';
    }

    function updateInstallMethod(method) {
      document.getElementById('install-cname-box').classList.add('hidden');
      document.getElementById('install-wp-box').classList.add('hidden');
      document.getElementById('install-shopify-box').classList.add('hidden');

      if (method === 'cname') {
        document.getElementById('install-cname-box').classList.remove('hidden');
      } else if (method === 'wp-mu') {
        document.getElementById('install-wp-box').classList.remove('hidden');
      } else if (method === 'shopify') {
        document.getElementById('install-shopify-box').classList.remove('hidden');
      }
    }

    function copySiteId(elementId) {
      const val = document.getElementById(elementId).value;
      navigator.clipboard.writeText(val);
      alert('Copied Workspace Site ID: ' + val);
    }

    function copyShopifySnippet() {
      const txt = document.getElementById('shopifySnippetBox').innerText;
      navigator.clipboard.writeText(txt);
      alert('Copied Shopify theme.liquid snippet!');
    }

    function downloadWpPlugin() {
      alert('Downloading ClicktoTrack WordPress Loader Plugin (.zip)...');
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
