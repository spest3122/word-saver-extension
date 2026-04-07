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
