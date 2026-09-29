import React, { useState } from 'react';

export function ClicktoTrackDashboardWithWizard() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSite, setSelectedSite] = useState('demo-site-123');

  const handleNext = () => {
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1);
    } else {
      setIsWizardOpen(false);
      alert(`Workspace "${companyName || 'New Client'}" provisioned successfully!`);
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      {/* HEADER */}
      <header class="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-xl text-white">Click<span class="text-indigo-400">to</span>Track</span>
          </div>

          <div class="flex items-center space-x-4">
            <select 
              value={selectedSite} 
              onChange={(e) => setSelectedSite(e.target.value)}
              class="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5"
            >
              <option value="demo-site-123">demo-site-123 (track.clientdomain.com)</option>
              <option value="agency-client-alpha">agency-client-alpha (track.alpha.com)</option>
            </select>

            <button 
              onClick={() => { setWizardStep(1); setIsWizardOpen(true); }}
              class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg"
            >
              + Add New Client / Domain
            </button>
          </div>
        </div>
      </header>

      {/* ONBOARDING MODAL WIZARD */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">🚀 Add New Client / Domain Onboarding Wizard</h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">Step 1: Company & Domain Information</h4>
                  <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 text-xs rounded text-white" />
                  <input type="text" placeholder="Website Domain (e.g. acme.com)" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 text-xs rounded text-white" />
                  <input type="text" placeholder="Target Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 text-xs rounded text-white" />
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">Step 2: Choose Installation Method</h4>
                  <div className="bg-gray-900 p-3 rounded border border-indigo-500/50">
                    <span className="font-bold text-xs text-indigo-400">Option A: CNAME Edge Proxy (Recommended)</span>
                    <p className="text-xs text-gray-400 mt-1">Add CNAME DNS record: <code>track.{domain || 'acme.com'}</code> ➔ <code>whale-app-gel7l.ondigitalocean.app</code></p>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">Step 3: Connect Ad Platform APIs</h4>
                  <input type="text" placeholder="Google Ads Customer ID" className="w-full bg-gray-900 border border-gray-700 p-2 text-xs rounded text-white" />
                  <input type="text" placeholder="GA4 Measurement ID" className="w-full bg-gray-900 border border-gray-700 p-2 text-xs rounded text-white" />
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">Step 4: Tag Goals with Chrome Extension</h4>
                  <p className="text-xs text-gray-400">Install the Point & Click extension to visually select forms and buttons on your live website.</p>
                </div>
              )}
            </div>

            <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 flex justify-between">
              <button onClick={handleBack} disabled={wizardStep === 1} className="bg-gray-800 text-xs text-gray-300 px-4 py-2 rounded disabled:opacity-40">Back</button>
              <button onClick={handleNext} className="bg-indigo-600 text-xs text-white font-bold px-5 py-2 rounded">{wizardStep === 4 ? 'Finish & Activate' : 'Next Step →'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClicktoTrackDashboardWithWizard;
