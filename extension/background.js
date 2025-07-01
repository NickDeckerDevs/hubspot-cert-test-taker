// Q&A Schema Highlighter Background Script
chrome.runtime.onInstalled.addListener(() => {
    console.log('Q&A Schema Highlighter installed');
    
    // Initialize storage
    chrome.storage.local.get(['qaSchemas'], (result) => {
        if (!result.qaSchemas) {
            chrome.storage.local.set({ qaSchemas: [] });
        }
    });
});

// Handle badge updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateBadge') {
        const count = request.count || 0;
        const badgeText = count > 0 ? count.toString() : '';
        const badgeColor = count > 0 ? '#00FF00' : '#FF0000';
        
        chrome.action.setBadgeText({
            text: badgeText,
            tabId: sender.tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: badgeColor,
            tabId: sender.tab.id
        });
        
        sendResponse({ success: true });
    }
});

// Handle tab changes to reset badge
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.action.setBadgeText({
        text: '',
        tabId: activeInfo.tabId
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
    }
});
