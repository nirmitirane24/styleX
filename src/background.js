chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log("Panel behavior set"))
    .catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "displayElementDetails") {
    console.log("Element details are ready:", message.data.css);

    // Send message to the side panel to update content
    chrome.runtime.sendMessage({
      action: "updateSidePanel",
      data: {
        htmlTag: message.data.htmlTag,
        css: message.data.css,
      }
    });
  }

  if (message.action === "startElementSelection") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            files: ["src/content.js"],
          },
          (result) => {
            if (chrome.runtime.lastError) {
              console.error("Script execution failed:", chrome.runtime.lastError.message);
            } else {
              console.log("Script executed successfully:", result);
            }
          }
        );
      }
    });
  }
});
