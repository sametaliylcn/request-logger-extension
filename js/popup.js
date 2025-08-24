// Variables
let allRequests = [];
let filteredRequests = [];
const clearBtn = document.getElementById("clearRequests");
const container = document.getElementById("requests");
let currentUrlFilter = "";
let currentMethodFilter = "";

// -------------------- LOG LOAD --------------------
function loadLogs() {
  chrome.storage.local.get({ requests: [] }, (data) => {
    allRequests = data.requests || [];
    applyFilter(); // mevcut filtre ile renderla
  });
}

// -------------------- RENDER --------------------
function renderRequests() {
  container.innerHTML = "";

  filteredRequests.forEach((req) => {
    const div = document.createElement("div");
    div.className = "request";

    // Headers string'e çevirme
    const reqHeaders = (req.requestHeaders || [])
      .map(h => `${h.name}: ${h.value}`)
      .join("\n") || "-";
    const resHeaders = (req.responseHeaders || [])
      .map(h => `${h.name}: ${h.value}`)
      .join("\n") || "-";

    div.innerHTML = `
      <strong>${req.method || "?"}</strong> ${req.url} [${req.status || "-"}]<br>
      <details>
        <summary>Detay</summary>
        <pre>Request Headers:\n${reqHeaders}</pre>
        <pre>Request Body:\n${req.requestBody || "-"}</pre>
        <pre>Response Headers:\n${resHeaders}</pre>
        <pre>Response Body:\n${req.responseBody || "[Not available via webRequest]"}</pre>
      </details>
    `;
    container.appendChild(div);
  });
}

// -------------------- FILTER --------------------
function applyFilter() {
  currentUrlFilter = document.getElementById("urlFilter").value.toLowerCase();
  currentMethodFilter = document.getElementById("methodFilter").value;

  filteredRequests = allRequests.filter(req => {
    const urlMatch = currentUrlFilter ? req.url.toLowerCase().includes(currentUrlFilter) : true;
    const methodMatch = currentMethodFilter ? req.method === currentMethodFilter : true;
    return urlMatch && methodMatch;
  });

  renderRequests();
}

document.getElementById("applyFilter").addEventListener("click", applyFilter);

// -------------------- DOWNLOAD TXT --------------------
document.getElementById("downloadTxt").addEventListener("click", () => {
  const text = filteredRequests.map(req =>
    `${req.method} ${req.url}\nRequest Headers:\n${(req.requestHeaders || []).map(h => `${h.name}: ${h.value}`).join("\n")}\nRequest Body:\n${req.requestBody}\nResponse Headers:\n${(req.responseHeaders || []).map(h => `${h.name}: ${h.value}`).join("\n")}\nResponse Body:\n${req.responseBody || "[Not available via webRequest]"}\n`
  ).join("\n----------------------\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "requests.txt";
  a.click();
});

// -------------------- DOWNLOAD HAR --------------------
document.getElementById("downloadHar").addEventListener("click", () => {
  const har = {
    log: {
      version: "1.2",
      creator: { name: "Custom Extension", version: "1.0" },
      entries: filteredRequests.map(req => ({
        startedDateTime: new Date().toISOString(),
        request: {
          method: req.method,
          url: req.url,
          headers: (req.requestHeaders || []).map(h => ({ name: h.name, value: h.value })),
          postData: req.requestBody ? { text: req.requestBody } : undefined
        },
        response: {
          status: req.status || 200,
          headers: (req.responseHeaders || []).map(h => ({ name: h.name, value: h.value })),
          content: {
            text: req.responseBody || "",
            size: (req.responseBody || "").length || 0
          }
        }
      }))
    }
  };

  const blob = new Blob([JSON.stringify(har, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "requests.har";
  a.click();
});

// -------------------- BACKGROUND'DAN MESAJ --------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "new_request" || msg.type === "update_request") {
    const idx = allRequests.findIndex(r => r.id === msg.data.id);
    if (idx !== -1) {
      allRequests[idx] = msg.data;
    } else {
      allRequests.push(msg.data);
    }
    // filtreyi bozmadan renderla
    applyFilter();
  }
});

// -------------------- CLEAR --------------------
clearBtn.addEventListener("click", () => {
  allRequests = [];
  filteredRequests = [];
  
  chrome.storage.local.remove(["requests", "logs"], () => {
    container.innerHTML = "";
    console.log("Requests ve log temizlendi");
  });
});

// -------------------- INIT --------------------
loadLogs();
