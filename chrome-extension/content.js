// 監聽來自 background.js 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showOverlay") {
    showConfirmOverlay(message.data);
  }
});

/**
 * 顯示確認彈窗（使用 Shadow DOM 隔離樣式）
 */
function showConfirmOverlay(data) {
  // 移除舊的彈窗
  removeOverlay();

  // 建立 Shadow DOM 容器
  const host = document.createElement("div");
  host.id = "word-saver-overlay-host";
  const shadow = host.attachShadow({ mode: "open" });

  // 注入樣式
  const style = document.createElement("style");
  style.textContent = getOverlayStyles();
  shadow.appendChild(style);

  // 建立彈窗內容
  const overlay = document.createElement("div");
  overlay.className = "ws-overlay";
  overlay.innerHTML = `
    <div class="ws-card">
      <div class="ws-header">
        <span class="ws-icon">📝</span>
        <span class="ws-title">儲存單字</span>
        <button class="ws-close" title="關閉">&times;</button>
      </div>
      <div class="ws-body">
        <div class="ws-field">
          <label>單字</label>
          <div class="ws-word">${escapeHtml(data.word)}</div>
        </div>
        <div class="ws-field">
          <label>來源</label>
          <div class="ws-source" title="${escapeHtml(data.pageTitle)}">${escapeHtml(truncate(data.pageTitle, 50))}</div>
        </div>
      </div>
      <div class="ws-footer">
        <button class="ws-btn ws-btn-cancel">取消</button>
        <button class="ws-btn ws-btn-save">儲存</button>
      </div>
      <div class="ws-result" style="display:none;"></div>
    </div>
  `;

  shadow.appendChild(overlay);

  // 定位彈窗在選取文字附近
  positionOverlay(host);

  document.body.appendChild(host);

  // 綁定事件
  const card = shadow.querySelector(".ws-card");
  const closeBtn = shadow.querySelector(".ws-close");
  const cancelBtn = shadow.querySelector(".ws-btn-cancel");
  const saveBtn = shadow.querySelector(".ws-btn-save");
  const footer = shadow.querySelector(".ws-footer");
  const resultDiv = shadow.querySelector(".ws-result");

  closeBtn.addEventListener("click", removeOverlay);
  cancelBtn.addEventListener("click", removeOverlay);

  saveBtn.addEventListener("click", () => {
    // 顯示載入狀態
    footer.style.display = "none";
    resultDiv.style.display = "block";
    resultDiv.innerHTML = '<div class="ws-loading">儲存中...</div>';

    chrome.runtime.sendMessage(
      { action: "confirmSave", data: data },
      (response) => {
        if (chrome.runtime.lastError) {
          showResult(resultDiv, false, chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          showResult(resultDiv, true, response.translation, response.partOfSpeech);
        } else {
          showResult(resultDiv, false, response?.error || "儲存失敗");
        }

        // 3 秒後自動關閉
        setTimeout(removeOverlay, 3000);
      }
    );
  });

  // 點擊彈窗外部關閉
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      removeOverlay();
    }
  });
}

/**
 * 顯示結果
 */
function showResult(resultDiv, success, message, partOfSpeech) {
  if (success) {
    const posHtml = partOfSpeech ? `<div class="ws-pos">詞性：${escapeHtml(partOfSpeech)}</div>` : "";
    resultDiv.innerHTML = `
      <div class="ws-success">
        <span class="ws-result-icon">✅</span>
        <div>
          <div>儲存成功！</div>
          <div class="ws-translation">翻譯：${escapeHtml(message)}</div>
          ${posHtml}
        </div>
      </div>
    `;
  } else {
    resultDiv.innerHTML = `
      <div class="ws-error">
        <span class="ws-result-icon">❌</span>
        <div>${escapeHtml(message)}</div>
      </div>
    `;
  }
}

/**
 * 定位彈窗在選取文字附近
 */
function positionOverlay(host) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";

    // 在選取文字下方顯示，若超出畫面則顯示在上方
    let top = rect.bottom + 8;
    let left = rect.left;

    // 確保不超出右邊
    if (left + 320 > window.innerWidth) {
      left = window.innerWidth - 330;
    }
    // 確保不超出下方
    if (top + 200 > window.innerHeight) {
      top = rect.top - 208;
    }
    // 確保不超出左邊和上方
    left = Math.max(10, left);
    top = Math.max(10, top);

    host.style.left = left + "px";
    host.style.top = top + "px";
  }
}

/**
 * 移除彈窗
 */
function removeOverlay() {
  const existing = document.getElementById("word-saver-overlay-host");
  if (existing) {
    existing.remove();
  }
}

/**
 * HTML 跳脫
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 截斷文字
 */
function truncate(text, maxLen) {
  if (!text) return "";
  return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
}

/**
 * 彈窗樣式
 */
function getOverlayStyles() {
  return `
    .ws-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 2147483647;
    }

    .ws-card {
      position: absolute;
      top: 0;
      left: 0;
      width: 300px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      animation: ws-fadeIn 0.15s ease-out;
    }

    @keyframes ws-fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ws-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #4A90D9;
      color: white;
    }

    .ws-icon {
      font-size: 18px;
      margin-right: 8px;
    }

    .ws-title {
      flex: 1;
      font-weight: 600;
      font-size: 15px;
    }

    .ws-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.8;
    }

    .ws-close:hover {
      opacity: 1;
    }

    .ws-body {
      padding: 16px;
    }

    .ws-field {
      margin-bottom: 12px;
    }

    .ws-field:last-child {
      margin-bottom: 0;
    }

    .ws-field label {
      display: block;
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .ws-word {
      font-size: 20px;
      font-weight: 700;
      color: #222;
      word-break: break-word;
    }

    .ws-source {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ws-footer {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
      justify-content: flex-end;
    }

    .ws-btn {
      padding: 8px 20px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .ws-btn-cancel {
      background: #f0f0f0;
      color: #666;
    }

    .ws-btn-cancel:hover {
      background: #e0e0e0;
    }

    .ws-btn-save {
      background: #4A90D9;
      color: white;
    }

    .ws-btn-save:hover {
      background: #3a7bc8;
    }

    .ws-result {
      padding: 16px;
    }

    .ws-loading {
      text-align: center;
      color: #888;
      padding: 8px 0;
    }

    .ws-success, .ws-error {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .ws-result-icon {
      font-size: 20px;
      line-height: 1;
    }

    .ws-translation {
      margin-top: 4px;
      color: #4A90D9;
      font-weight: 600;
      font-size: 16px;
    }

    .ws-pos {
      margin-top: 2px;
      color: #666;
      font-size: 13px;
    }

    .ws-error {
      color: #d32f2f;
    }
  `;
}
