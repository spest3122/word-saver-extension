/**
 * 處理 POST 請求：接收單字資料、翻譯、寫入 Google Sheet
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var word = data.word;
    var partOfSpeech = data.partOfSpeech || "";
    var pageTitle = data.pageTitle;
    var pageUrl = data.pageUrl;

    // 自動偵測語言並翻譯成繁體中文
    var translation = LanguageApp.translate(word, "", "zh-TW");

    // 取得或建立 "Words" 工作表
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Words");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Words");
      sheet.appendRow(["Timestamp", "Word", "Translation", "Part of Speech", "Page Title", "URL"]);
      // 設定標題列格式
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    }

    // 寫入資料
    sheet.appendRow([
      new Date(),
      word,
      translation,
      partOfSpeech,
      pageTitle,
      pageUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        translation: translation
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 健康檢查端點
 */
function doGet(e) {
  return ContentService
    .createTextOutput("Word Saver API is running")
    .setMimeType(ContentService.MimeType.TEXT);
}
