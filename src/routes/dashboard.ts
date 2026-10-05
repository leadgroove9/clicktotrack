import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Full Interactive HTML Dashboard Route
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClicktoTrack Control Center & Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; }
    .tab-active { background-color: #4f46e5; color: #ffffff; }
    .modal-backdrop { background-color: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Top Header Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
      <div>
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">ClicktoTrack Control Center</h1>
        </div>
        <p class="text-xs text-slate-400 mt-1">1st-Party Edge Proxy &amp; Server-to-Server Conversion Engine</p>
      </div>
      <div class="flex items-center space-x-3">
        <button onclick="openWizard()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center space-x-2">
          <span>+ Add Client / Workspace</span>
        </button>
        <button onclick="openSettings()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-all">
          <span>⚙️ Configure</span>
        </button>
      </div>
    </div>

    <!-- Active Workspace Banner -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace</div>
        <div class="text-lg font-extrabold text-indigo-400 mt-1">acmeplumbing-com-workspace</div>
        <div class="text-[11px] text-slate-500 mt-1">Domain: acmeplumbing.com</div>
      </div>
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">30-Day Conversions</div>
        <div class="text-2xl font-extrabold text-white mt-1">1,248</div>
        <div class="text-[11px] text-emerald-400 font-semibold mt-1">↑ +18.4% vs last month</div>
      </div>
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Attribution Health</div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1">98/100</div>
        <div class="text-[11px] text-slate-400 mt-1">EXCELLENT (100% Match Rate)</div>
      </div>
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Goals</div>
        <div class="text-2xl font-extrabold text-white mt-1">5 Active</div>
        <div class="text-[11px] text-indigo-400 font-semibold mt-1">Self-Healing Enabled</div>
      </div>
    </div>

    <!-- SECTION 1: MASTER GOAL REGISTRY -->
    <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
            <span>🎯 Master Conversion Goal Registry</span>
            <span class="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30">What is being tracked</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">Active visual element selectors configured via Chrome Extension &amp; AI Prompt</p>
        </div>
        <button onclick="openWizard()" class="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-bold px-3 py-2 rounded-lg transition-all">
          + Add Goal via Extension
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="goals-grid">
        <!-- Goal Card 1 -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div class="flex justify-between items-start">
            <span class="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-500/30">Form Fill</span>
            <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Active</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Emergency Plumbing Lead Form</h3>
            <p class="text-xs text-slate-400 mt-0.5 font-mono text-[11px]">#emergency-plumbing-form &gt; button[type="submit"]</p>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>24h Volume: <strong class="text-white">28</strong></span>
            <span>Channels: <strong class="text-indigo-400">GAds, GA4, Meta</strong></span>
          </div>
        </div>

        <!-- Goal Card 2 -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div class="flex justify-between items-start">
            <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-500/30">Phone Call</span>
            <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Active</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Header Phone Number Click Swap</h3>
            <p class="text-xs text-slate-400 mt-0.5 font-mono text-[11px]">a.header-phone-link[href^="tel:"]</p>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>24h Volume: <strong class="text-white">19</strong></span>
            <span>Channels: <strong class="text-indigo-400">CallRail API, GAds</strong></span>
          </div>
        </div>

        <!-- Goal Card 3 -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div class="flex justify-between items-start">
            <span class="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-amber-500/30">Engaged Session</span>
            <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Active</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Engaged User Time on Site (&gt;30s)</h3>
            <p class="text-xs text-slate-400 mt-0.5 font-mono text-[11px]">window.location.pathname (Benchmark: 30s)</p>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>24h Volume: <strong class="text-white">142</strong></span>
            <span>Channels: <strong class="text-indigo-400">GA4 Key Events</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: GOAL TRIGGER ACTIVITY LOG -->
    <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
            <span>📊 Goal Trigger Activity History Log</span>
            <span class="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">Real-Time Conversion Stream</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">Audit history log recording every conversion event triggered across all active goals</p>
        </div>
        <div class="flex items-center space-x-2">
          <select id="goal-filter" onchange="filterLogs()" class="bg-slate-950 text-slate-200 text-xs p-2 rounded-lg border border-slate-800 outline-none">
            <option value="ALL">All Configured Goals</option>
            <option value="Emergency Plumbing Lead Form">Emergency Plumbing Lead Form</option>
            <option value="Header Phone Number Click Swap">Header Phone Number Click Swap</option>
            <option value="Engaged User Time on Site (>30s)">Engaged User Time on Site (&gt;30s)</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[10px] tracking-wider">
            <tr>
              <th class="p-3">Timestamp</th>
              <th class="p-3">Goal Title &amp; Category</th>
              <th class="p-3">Page URL</th>
              <th class="p-3">Click Attribution</th>
              <th class="p-3">PII Match</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono text-[11px]" id="logs-tbody">
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="p-3 font-sans text-slate-400 whitespace-nowrap">Just now</td>
              <td class="p-3 font-sans">
                <div class="font-bold text-white">Emergency Plumbing Lead Form</div>
                <div class="text-[10px] text-indigo-400 font-semibold">Form Fill • GAds + Meta CAPI</div>
              </td>
              <td class="p-3 text-slate-400 truncate max-w-xs">/contact-us</td>
              <td class="p-3 text-emerald-400 font-semibold">gclid: Cj0KCQiA3_K...</td>
              <td class="p-3 text-emerald-400 font-semibold">🔒 SHA-256 Hashed</td>
              <td class="p-3 whitespace-nowrap font-sans">
                <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">✓ Dispatched (200 OK)</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="p-3 font-sans text-slate-400 whitespace-nowrap">3 mins ago</td>
              <td class="p-3 font-sans">
                <div class="font-bold text-white">Header Phone Number Click Swap</div>
                <div class="text-[10px] text-indigo-400 font-semibold">Phone Call • CallRail API</div>
              </td>
              <td class="p-3 text-slate-400 truncate max-w-xs">/services/plumbing</td>
              <td class="p-3 text-emerald-400 font-semibold">gclid: Cj0KCQiB1_L...</td>
              <td class="p-3 text-slate-500">Anonymous Phone</td>
              <td class="p-3 whitespace-nowrap font-sans">
                <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">✓ Dispatched (200 OK)</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="p-3 font-sans text-slate-400 whitespace-nowrap">12 mins ago</td>
              <td class="p-3 font-sans">
                <div class="font-bold text-white">Emergency Plumbing Lead Form</div>
                <div class="text-[10px] text-indigo-400 font-semibold">Form Fill • GAds</div>
              </td>
              <td class="p-3 text-slate-400 truncate max-w-xs">/contact-us</td>
              <td class="p-3 text-slate-500">Organic Direct</td>
              <td class="p-3 text-rose-400 font-semibold">Spam Bot Flagged</td>
              <td class="p-3 whitespace-nowrap font-sans">
                <span class="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30">🛡 Spam Suppressed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ONBOARDING SETUP WIZARD MODAL -->
  <div id="wizard-modal" class="fixed inset-0 z-50 hidden modal-backdrop flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
      
      <!-- Wizard Header -->
      <div class="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span>⚡ Client Onboarding &amp; Setup Wizard</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Configure a new client workspace, installation method, and conversion rules</p>
        </div>
        <button onclick="closeWizard()" class="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
      </div>

      <!-- Step Indicator Bar -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div id="step-tab-1" class="p-2.5 rounded-xl bg-indigo-600 text-white">1. Workspace</div>
        <div id="step-tab-2" class="p-2.5 rounded-xl bg-slate-800 text-slate-400">2. Installation &amp; Goals</div>
        <div id="step-tab-3" class="p-2.5 rounded-xl bg-slate-800 text-slate-400">3. Ad Platforms</div>
      </div>

      <!-- STEP 1 CONTENT -->
      <div id="step-content-1" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Client / Company Name</label>
          <input type="text" id="wiz-company-name" oninput="generateSiteId()" placeholder="e.g. Acme Plumbing Services" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Target Website Domain</label>
          <input type="text" id="wiz-domain" oninput="generateSiteId()" placeholder="e.g. acmeplumbing.com" class="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500">
        </div>
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <span class="text-[11px] font-bold text-slate-400 block">Auto-Generated Workspace Site ID:</span>
          <span id="wiz-site-id-preview" class="text-xs font-mono font-bold text-indigo-400">acmeplumbing-com-workspace</span>
        </div>
      </div>

      <!-- STEP 2 CONTENT: FULL INTERACTIVE INSTALLATION METHODS & 5 GOAL CATEGORIES -->
      <div id="step-content-2" class="space-y-6 hidden">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">Choice of Installation Method</label>
          <!-- Interactive Sub-Tabs Bar -->
          <div class="flex space-x-2 border-b border-slate-800 pb-2">
            <button onclick="switchInstallTab('cname')" id="install-btn-cname" class="px-3 py-2 text-xs font-bold rounded-lg border border-indigo-500 bg-slate-800 text-indigo-400 transition-all">
              Option 1: CNAME Edge Proxy (Recommended)
            </button>
            <button onclick="switchInstallTab('wp')" id="install-btn-wp" class="px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition-all">
              Option 2: WP mu-plugin
            </button>
            <button onclick="switchInstallTab('shopify')" id="install-btn-shopify" class="px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition-all">
              Option 3: Shopify App
            </button>
          </div>

          <!-- SUB-TAB 1: CNAME EDGE PROXY -->
          <div id="install-panel-cname" class="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-emerald-400">✓ Top Recommended: Zero Code Changes &amp; Immunity from Theme Updates</span>
              <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">100% Safari ITP Proof</span>
            </div>
            <p class="text-slate-400 text-[11px]">Add a 1st-party CNAME DNS record in your DNS provider (Cloudflare, GoDaddy, Namecheap) pointing to our edge proxy:</p>
            <div class="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-indigo-300 border border-slate-800 flex justify-between items-center">
              <span>CNAME Record: <strong>track.acmeplumbing.com</strong> &rarr; <strong>proxy.clicktotrack.io</strong></span>
              <button onclick="alert('Copied CNAME target!')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Copy</button>
            </div>
          </div>

          <!-- SUB-TAB 2: WORDPRESS MU-PLUGIN -->
          <div id="install-panel-wp" class="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs hidden">
            <div class="font-bold text-indigo-400">Option 2: WordPress Must-Use Single-File Plugin (`mu-plugin`)</div>
            <p class="text-slate-400 text-[11px]">Upload `clicktotrack.php` into `/wp-content/mu-plugins/`. It runs automatically on every page without theme overwrite risk.</p>
            <div class="bg-slate-900 p-3 rounded-lg font-mono text-[10px] text-slate-300 border border-slate-800 overflow-x-auto">
              &lt;?php<br>
              /* Plugin Name: ClicktoTrack Universal Proxy Engine */<br>
              add_action('wp_head', function() {<br>
              &nbsp;&nbsp;echo '&lt;script src="https://track.acmeplumbing.com/clicktotrack.js" async&gt;&lt;/script&gt;';<br>
              });
            </div>
          </div>

          <!-- SUB-TAB 3: SHOPIFY APP -->
          <div id="install-panel-shopify" class="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs hidden">
            <div class="font-bold text-indigo-400">Option 3: Shopify Theme App Extension &amp; Order Tagging</div>
            <p class="text-slate-400 text-[11px]">Enable the ClicktoTrack App Embed in Shopify Admin &gt; Online Store &gt; Themes &gt; Customize &gt; App Embeds.</p>
          </div>
        </div>

        <!-- 5 GOAL CATEGORIES WITH THRESHOLD CONTROLS -->
        <div class="space-y-4 pt-2 border-t border-slate-800">
          <h3 class="text-xs font-extrabold text-white uppercase tracking-wider">Goal Categories &amp; Conversion Threshold Rules</h3>

          <!-- Category 1: Phone Calls -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">📞 Category 1: Phone Call Tracking (CallRail / CTM)</span>
              <span class="text-[10px] text-indigo-400 font-bold">3-Tier Local Number Allocation</span>
            </div>
            <div class="flex items-center space-x-3">
              <label class="text-[11px] text-slate-400">Minimum Call Duration Threshold:</label>
              <select id="wiz-call-duration" class="bg-slate-900 border border-slate-800 text-xs p-1.5 rounded-lg text-white font-bold outline-none">
                <option value="30">30 seconds</option>
                <option value="60" selected>60 seconds (1 minute - Recommended Default)</option>
                <option value="120">120 seconds (2 minutes)</option>
                <option value="240">240 seconds (4 minutes)</option>
              </select>
            </div>
          </div>

          <!-- Category 2: Cart Purchases -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">🛒 Category 2: Cart Purchase Tracking</span>
              <span class="text-[10px] text-emerald-400 font-bold">Auto-Order ID Deduplication</span>
            </div>
            <p class="text-[11px] text-slate-400">Captures order total value, currency, and SHA-256 PII on Shopify or custom order confirmation thank-you pages.</p>
          </div>

          <!-- Category 3: Form Submissions -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">📝 Category 3: Form Lead Submissions</span>
              <span class="text-[10px] text-indigo-400 font-bold">Chrome Extension Tagged</span>
            </div>
            <p class="text-[11px] text-slate-400">Tag lead forms visually using Point &amp; Click selector or AI Natural Language Prompt in the browser extension.</p>
          </div>

          <!-- Category 4: Button Clicks & Messaging -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">💬 Category 4: Button Clicks &amp; Live Chat Starts</span>
              <span class="text-[10px] text-indigo-400 font-bold">WhatsApp / Calendly Tagged</span>
            </div>
            <p class="text-[11px] text-slate-400">Captures clicks on WhatsApp widgets, Calendly appointment embeds, and floating CTA buttons.</p>
          </div>

          <!-- Category 5: Time on Site -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-white text-xs">⏱️ Category 5: Time on Site (&quot;Engaged User&quot;)</span>
              <span class="text-[10px] text-amber-400 font-bold">GA4 Key Event</span>
            </div>
            <div class="flex items-center space-x-3">
              <label class="text-[11px] text-slate-400">Minimum Engagement Threshold Benchmark:</label>
              <select id="wiz-time-site" class="bg-slate-900 border border-slate-800 text-xs p-1.5 rounded-lg text-white font-bold outline-none">
                <option value="10" selected>10 seconds (GA4 Default Benchmark)</option>
                <option value="20">20 seconds</option>
                <option value="30">30 seconds</option>
                <option value="45">45 seconds</option>
                <option value="60">60 seconds (1 minute)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3 CONTENT -->
      <div id="step-content-3" class="space-y-4 hidden">
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">Target Ad Platform API Credentials</h3>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <label class="flex items-center space-x-2 text-slate-300"><input type="checkbox" checked class="accent-indigo-600"> <span>Google Ads API (Enhanced Conversions)</span></label>
            <label class="flex items-center space-x-2 text-slate-300"><input type="checkbox" checked class="accent-indigo-600"> <span>GA4 Measurement Protocol</span></label>
            <label class="flex items-center space-x-2 text-slate-300"><input type="checkbox" checked class="accent-indigo-600"> <span>Meta CAPI (Advanced Matching)</span></label>
            <label class="flex items-center space-x-2 text-slate-300"><input type="checkbox" checked class="accent-indigo-600"> <span>Microsoft Advertising UET</span></label>
          </div>
        </div>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <label class="flex items-center space-x-2 text-xs font-bold text-white">
            <input type="checkbox" id="wiz-byo-toggle" class="accent-indigo-600">
            <span>Enable BYO CallRail / CTM Account API Keys</span>
          </label>
          <p class="text-[11px] text-slate-400 pl-5">Default mode utilizes SaaS Whitelabel master agency accounts for 1-click dynamic pool allocation.</p>
        </div>
      </div>

      <!-- Wizard Footer Buttons -->
      <div class="flex justify-between items-center border-t border-slate-800 pt-4">
        <button id="wiz-prev-btn" onclick="prevStep()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl hidden">Back</button>
        <div id="wiz-step-tracker" class="text-xs text-slate-500 font-bold">Step 1 of 3</div>
        <button id="wiz-next-btn" onclick="nextStep()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all">Next: Installation &amp; Goals &rarr;</button>
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;

    function openWizard() {
      document.getElementById('wizard-modal').classList.remove('hidden');
    }

    function closeWizard() {
      document.getElementById('wizard-modal').classList.add('hidden');
    }

    function generateSiteId() {
      const name = document.getElementById('wiz-company-name').value || 'Acme Plumbing';
      const domain = document.getElementById('wiz-domain').value || 'acmeplumbing.com';
      const clean = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].replace(/[^a-z0-9]/g, '-');
      document.getElementById('wiz-site-id-preview').textContent = (clean || 'client-site') + '-workspace';
    }

    function switchInstallTab(tab) {
      document.getElementById('install-panel-cname').classList.add('hidden');
      document.getElementById('install-panel-wp').classList.add('hidden');
      document.getElementById('install-panel-shopify').classList.add('hidden');

      document.getElementById('install-btn-cname').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition-all';
      document.getElementById('install-btn-wp').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition-all';
      document.getElementById('install-btn-shopify').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition-all';

      if (tab === 'cname') {
        document.getElementById('install-panel-cname').classList.remove('hidden');
        document.getElementById('install-btn-cname').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-indigo-500 bg-slate-800 text-indigo-400 transition-all';
      } else if (tab === 'wp') {
        document.getElementById('install-panel-wp').classList.remove('hidden');
        document.getElementById('install-btn-wp').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-indigo-500 bg-slate-800 text-indigo-400 transition-all';
      } else if (tab === 'shopify') {
        document.getElementById('install-panel-shopify').classList.remove('hidden');
        document.getElementById('install-btn-shopify').className = 'px-3 py-2 text-xs font-bold rounded-lg border border-indigo-500 bg-slate-800 text-indigo-400 transition-all';
      }
    }

    function nextStep() {
      if (currentStep === 1) {
        currentStep = 2;
        document.getElementById('step-content-1').classList.add('hidden');
        document.getElementById('step-content-2').classList.remove('hidden');
        document.getElementById('step-tab-1').className = 'p-2.5 rounded-xl bg-slate-800 text-slate-400';
        document.getElementById('step-tab-2').className = 'p-2.5 rounded-xl bg-indigo-600 text-white';
        document.getElementById('wiz-prev-btn').classList.remove('hidden');
        document.getElementById('wiz-next-btn').textContent = 'Next: Ad Platforms \u2192';
        document.getElementById('wiz-step-tracker').textContent = 'Step 2 of 3';
      } else if (currentStep === 2) {
        currentStep = 3;
        document.getElementById('step-content-2').classList.add('hidden');
        document.getElementById('step-content-3').classList.remove('hidden');
        document.getElementById('step-tab-2').className = 'p-2.5 rounded-xl bg-slate-800 text-slate-400';
        document.getElementById('step-tab-3').className = 'p-2.5 rounded-xl bg-indigo-600 text-white';
        document.getElementById('wiz-next-btn').textContent = '✓ Save Client Workspace';
        document.getElementById('wiz-step-tracker').textContent = 'Step 3 of 3';
      } else if (currentStep === 3) {
        alert('Client Workspace successfully created & provisioned!');
        closeWizard();
        currentStep = 1;
      }
    }

    function prevStep() {
      if (currentStep === 2) {
        currentStep = 1;
        document.getElementById('step-content-2').classList.add('hidden');
        document.getElementById('step-content-1').classList.remove('hidden');
        document.getElementById('step-tab-2').className = 'p-2.5 rounded-xl bg-slate-800 text-slate-400';
        document.getElementById('step-tab-1').className = 'p-2.5 rounded-xl bg-indigo-600 text-white';
        document.getElementById('wiz-prev-btn').classList.add('hidden');
        document.getElementById('wiz-next-btn').textContent = 'Next: Installation & Goals \u2192';
        document.getElementById('wiz-step-tracker').textContent = 'Step 1 of 3';
      } else if (currentStep === 3) {
        currentStep = 2;
        document.getElementById('step-content-3').classList.add('hidden');
        document.getElementById('step-content-2').classList.remove('hidden');
        document.getElementById('step-tab-3').className = 'p-2.5 rounded-xl bg-slate-800 text-slate-400';
        document.getElementById('step-tab-2').className = 'p-2.5 rounded-xl bg-indigo-600 text-white';
        document.getElementById('wiz-next-btn').textContent = 'Next: Ad Platforms \u2192';
        document.getElementById('wiz-step-tracker').textContent = 'Step 2 of 3';
      }
    }

    function openSettings() {
      alert('Workspace Settings & Conversion Thresholds open.');
    }

    function filterLogs() {
      console.log('Logs filtered by goal.');
    }
  </script>
</body>
</html>`;

    return reply.type('text/html').send(htmlContent);
  });

  // 2. Dashboard Overview Metrics Endpoint (GET API)
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

      return reply.status(200).send({
        success: true,
        workspace: {
          siteId: workspace.siteId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain || `track.${workspace.domain}`,
        },
        activeGoals: (workspace.goals || []).map((g: any) => ({
          title: g.title,
          category: g.category,
          selectorCss: g.selectorCss,
          isNewCustomerOnly: g.isNewCustomerOnly,
        })),
      });
    } catch (error: any) {
      fastify.log.error(`[Dashboard Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error fetching dashboard metrics',
        details: error?.message || String(error),
      });
    }
  });
}
