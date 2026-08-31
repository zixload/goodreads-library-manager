function openAfterLoad(tabId) {
  const onUpdated = async (updatedTabId, changeInfo) => {
    if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    try {
      await chrome.tabs.sendMessage(tabId, { type: "GLM_TOGGLE" });
    } catch {
      // Goodreads may have redirected to a login page.
    }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "GLM_TOGGLE" });
  } catch {
    const createdTab = await chrome.tabs.create({ url: "https://www.goodreads.com/review/list" });
    openAfterLoad(createdTab.id);
  }
});
