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
 * 查詢單字詞性（透過免費字典 API）
 */
async function lookupPartOfSpeech(word) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return "";

    const entries = await response.json();
    const posSet = new Set();
    for (const entry of entries) {
      for (const meaning of entry.meanings || []) {
        if (meaning.partOfSpeech) {
          posSet.add(meaning.partOfSpeech);
        }
      }
    }
    return [...posSet].join(", ");
  } catch {
    return "";
  }
}

/**
 * 儲存單字到本地快取（chrome.storage.local）
 */
async function cacheWordLocally(wordEntry) {
  const today = new Date().toISOString().slice(0, 10);
  const stored = await chrome.storage.local.get("todayWords");
  let data = stored.todayWords || { date: today, words: [] };
  if (data.date !== today) {
    data = { date: today, words: [] };
  }
  data.words.push(wordEntry);
  await chrome.storage.local.set({ todayWords: data });
}

/**
 * 將單字資料 POST 到 Google Apps Script Web App
 */
async function handleSave(data) {
  const result = await chrome.storage.sync.get(["appsScriptUrl"]);
  const url = result.appsScriptUrl;

  if (!url) {
    return { success: false, error: "請先在擴充功能設定中輸入 Google Apps Script URL" };
  }

  // 先查詢詞性
  const partOfSpeech = await lookupPartOfSpeech(data.word);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: data.word,
      pageTitle: data.pageTitle,
      pageUrl: data.pageUrl,
      partOfSpeech: partOfSpeech
    }),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const jsonResult = await response.json();

  // 儲存成功後快取到本地
  if (jsonResult.success) {
    await cacheWordLocally({
      word: data.word,
      translation: jsonResult.translation,
      partOfSpeech: partOfSpeech,
      timestamp: Date.now()
    });
  }

  return { ...jsonResult, partOfSpeech };
}
