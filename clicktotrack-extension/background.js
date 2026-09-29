const API_BASE_URL = 'https://whale-app-gel7l.ondigitalocean.app';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SAVE_GOAL') {
    saveGoal(request.goalData).then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'GET_GOALS') {
    getGoals(request.siteId).then(goals => sendResponse({ goals }));
    return true;
  }
});

async function saveGoal(goalData) {
  try {
    const result = await chrome.storage.local.get(['goals_' + goalData.siteId]);
    const existing = result['goals_' + goalData.siteId] || [];
    existing.push({ ...goalData, id: 'goal_' + Date.now() });

    await chrome.storage.local.set({ ['goals_' + goalData.siteId]: existing });
    return { success: true, count: existing.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getGoals(siteId) {
  const result = await chrome.storage.local.get(['goals_' + siteId]);
  return result['goals_' + siteId] || [];
}