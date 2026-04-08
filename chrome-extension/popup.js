// Tab 切換
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

    if (btn.dataset.tab === "today") {
      loadTodayWords();
    }
  });
});

// 今日單字載入
function loadTodayWords() {
  const wordList = document.getElementById("wordList");
  const emptyState = document.getElementById("emptyState");

  chrome.storage.local.get("todayWords", (result) => {
    const today = new Date().toISOString().slice(0, 10);
    const data = result.todayWords;

    if (!data || data.date !== today || data.words.length === 0) {
      wordList.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    wordList.innerHTML = data.words.map(w => `
      <div class="word-card">
        <div class="card-word">${escapeHtml(w.word)}</div>
        <div class="card-translation">${escapeHtml(w.translation)}</div>
        ${w.partOfSpeech ? `<div class="card-pos">${escapeHtml(w.partOfSpeech)}</div>` : ""}
      </div>
    `).join("");
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// 設定頁面
const urlInput = document.getElementById("url");
const saveBtn = document.getElementById("saveBtn");
const statusDiv = document.getElementById("status");

// 載入已儲存的 URL
chrome.storage.sync.get(["appsScriptUrl"], (result) => {
  if (result.appsScriptUrl) {
    urlInput.value = result.appsScriptUrl;
    showStatus("success", "已設定完成");
  }
});

// 儲存 URL
saveBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();

  if (!url) {
    showStatus("error", "請輸入 URL");
    return;
  }

  if (!url.startsWith("https://script.google.com/")) {
    showStatus("error", "URL 格式不正確，應以 https://script.google.com/ 開頭");
    return;
  }

  chrome.storage.sync.set({ appsScriptUrl: url }, () => {
    showStatus("success", "設定已儲存！");
  });
});

function showStatus(type, message) {
  statusDiv.style.display = "block";
  statusDiv.className = "status " + type;
  statusDiv.textContent = message;
}
