
//variables
let logs = [];

// Request Body yakalama
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    let body = "";

    if (details.requestBody) {
      if (details.requestBody.raw && details.requestBody.raw[0]?.bytes) {
        try {
          body = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
        } catch (e) {
          body = "[binary data]";
        }
      } else if (details.requestBody.formData) {
        body = JSON.stringify(details.requestBody.formData, null, 2);
      }
    }

    const req = {
      id: details.requestId,
      url: details.url || "",
      method: details.method || "?",
      requestBody: body,
      requestHeaders: [],
      responseHeaders: [],
      status: null
    };

    chrome.storage.local.get({ requests: [] }, (data) => {
      const updated = [...data.requests, req];
      chrome.storage.local.set({ requests: updated });

      // popup açıksa gönder
      chrome.runtime.sendMessage({ type: "new_request", data: req }).catch(() => {});
    });
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Request Headers yakalama
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    chrome.storage.local.get({ requests: [] }, (data) => {
      const idx = data.requests.findIndex(r => r.id === details.requestId);
      if (idx !== -1) {
        data.requests[idx].requestHeaders = details.requestHeaders || [];
        chrome.storage.local.set({ requests: data.requests });

        chrome.runtime.sendMessage({ type: "update_request", data: data.requests[idx] }).catch(() => {});
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

// Response Headers + Status yakalama
chrome.webRequest.onCompleted.addListener(
  (details) => {
    chrome.storage.local.get({ requests: [] }, (data) => {
      const idx = data.requests.findIndex(r => r.id === details.requestId);
      if (idx !== -1) {
        logs.push(details);
        data.requests[idx].status = details.statusCode;
        data.requests[idx].responseHeaders = details.responseHeaders || [];
        // DİKKAT: responseBody yakalanamaz, Chrome API vermez!
        chrome.storage.local.set({ logs });
        chrome.storage.local.set({ requests: data.requests });

        chrome.runtime.sendMessage({ type: "update_request", data: data.requests[idx] }).catch(() => {});
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

//eski logları isteme
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getOldLogs") {
    sendResponse(logs);
  }
});