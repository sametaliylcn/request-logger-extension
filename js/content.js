(function() {
  // Fetch hook
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    console.log("Fetch request:", resource, config);

    const res = await origFetch(...args);
    const clone = res.clone();
    try {
      console.log("Fetch response:", await clone.text());
    } catch(e) {
      console.log("Fetch response (okunamadı)");
    }
    return res;
  };

  // XHR hook
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.addEventListener('load', function() {
      console.log("XHR request:", method, url);
      console.log("XHR response:", this.responseText);
    });
    return origOpen.call(this, method, url, ...rest);
  };
})();
