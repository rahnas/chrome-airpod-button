document.getElementById("toggle").addEventListener("click", async () => {
  chrome.runtime.sendMessage({ type: "POPUP_TOGGLE" });
});
