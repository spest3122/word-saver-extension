// 安裝時建立右鍵選單
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveWord",
    title: '儲存「%s」到 Google Sheet',
    contexts: ["selection"]
  });
});

// 右鍵選單點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveWord" && info.selectionText) {
    const word = info.selectionText.trim();
    if (!word) return;

    chrome.tabs.sendMessage(tab.id, {
      action: "showOverlay",
      data: {
        word: word,
        pageTitle: tab.title,
        pageUrl: tab.url
      }
    });
  }
});

// 監聽來自 content.js 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "confirmSave") {
    handleSave(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持 sendResponse 通道開啟（非同步）
  }
});

/**
 * 將單字資料 POST 到 Google Apps Script Web App
 */
async function handleSave(data) {
  const result = await chrome.storage.sync.get(["appsScriptUrl"]);
  const url = result.appsScriptUrl;

  if (!url) {
    return { success: false, error: "請先在擴充功能設定中輸入 Google Apps Script URL" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: data.word,
      pageTitle: data.pageTitle,
      pageUrl: data.pageUrl
    }),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}
