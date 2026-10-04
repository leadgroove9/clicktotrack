/**
 * ClicktoTrack Service Worker Background Script
 * Communicates with backend API Engine on DigitalOcean.
 */

const API_BASE_URL = 'https://whale-app-gel7l.ondigitalocean.app/api/v1';

chrome.runtime.onInstalled.addListener(() => {
  console.log('ClicktoTrack Visual Goal Selector Extension installed.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SAVE_GOAL') {
    handleSaveGoal(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (message.action === 'GET_GOALS') {
    handleGetGoals(message.siteId)
      .then(goals => sendResponse({ goals }))
      .catch(err => sendResponse({ goals: [] }));
    return true; // async
  }
});

async function handleSaveGoal(goalData) {
  // Retrieve saved siteId or default to demo-site-123
  const storage = await chrome.storage.local.get(['siteId']);
  const siteId = storage.siteId || 'demo-site-123';

  // Save goal locally first for immediate popup display
  const key = `goals_${siteId}`;
  const existing = await chrome.storage.local.get([key]);
  const goalsList = existing[key] || [];
  goalsList.push(goalData);
  await chrome.storage.local.set({ [key]: goalsList });

  // Sync goal to production backend server
  try {
    const res = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        ...goalData
      })
    });
    const data = await res.json();
    if (res.ok && (data.success || data.goal)) {
      return { success: true, ...data };
    }
    // Fallback gracefully if backend returned error status
    return { success: true, status: 'SAVED_LOCAL', goal: goalData };
  } catch (err) {
    console.warn('Backend server save endpoint fallback to local extension storage:', err);
    return { success: true, status: 'SAVED_LOCAL', goal: goalData };
  }
}

async function handleGetGoals(siteId) {
  const targetSiteId = siteId || 'demo-site-123';
  const key = `goals_${targetSiteId}`;
  const storage = await chrome.storage.local.get([key]);
  return storage[key] || [];
}