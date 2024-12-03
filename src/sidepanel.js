document.getElementById("selectElement").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startElementSelection" }, (response) => {
    if (chrome.runtime.lastError) {
      ErrorMsg();
      console.error("Error sending message:", chrome.runtime.lastError.message);
    } else {
      console.log("Message sent:", response);
    }
  });
});

// Listen for the message from the background script to update the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSidePanel") {
    const htmlTag = message.data.htmlTag;
    const css = message.data.css;
    // Create message element for user feedback
    const msgElement = document.createElement("div");
    msgElement.className = "user-msg";
    msgElement.textContent = "Element has been selected!";
    // Create 'Copy HTML' button
    const copyHtmlButton = document.createElement("button");
    copyHtmlButton.id = "copyhtmlbutton";
    copyHtmlButton.textContent = "Copy HTML";
    copyHtmlButton.addEventListener("click", () => {
      navigator.clipboard.writeText(htmlTag).then(() => {
        alert("HTML copied to clipboard!");
      }).catch(err => {
        ErrorMsg();
        console.error("Failed to copy HTML:", err);
      });
    });
    // Create 'Copy CSS' button
    const copyCssButton = document.createElement("button");
    copyCssButton.id = "copycssbutton";
    copyCssButton.textContent = "Copy CSS";
    copyCssButton.addEventListener("click", () => {
      navigator.clipboard.writeText(JSON.stringify(css, null, 2)).then(() => {
        alert("CSS copied to clipboard!");
      }).catch(err => {
        ErrorMsg();
        console.error("Failed to copy CSS:", err);
      });
    });
    // Append elements to the conversation panel
    appendToMsgs(msgElement);
    appendToMsgs(copyHtmlButton);
    appendToMsgs(copyCssButton);
    // Call Gemini for further context
    giveGeminiContext(htmlTag, css);
  }
});


function appendToMsgs(element) {
  const msgsContainer = document.getElementById("msgs");
  if (msgsContainer) {
    msgsContainer.appendChild(element);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  } else {
    ErrorMsg();
    console.error("Msgs container not found!");
  }
}

function giveGeminiContext(htmlTag, css) {
  console.log("Sending context to Gemini Nano...");

  const thinkingElement = document.createElement("div");
  thinkingElement.className = "thinking-msg";
  thinkingElement.textContent = "THINKING...";
  appendToMsgs(thinkingElement);

  initializeGeminiSession().then(() => {
    geminiSession.prompt(`You are the HTML/CSS designer, Tell something about the code which is selected by user, \n
      \nThis is the HTML Tag: ${htmlTag}\nCSS: ${JSON.stringify(css, null, 2)}.
       Give a short and simple response. 
       Ask the user that in which way he wants to proceed Code or Explain.`)
      .then(response => {
        if (thinkingElement) thinkingElement.remove();

        const richTextResponse = convertMarkdownToRichText(response);
        const responseElement = document.createElement("div");
        responseElement.className = "ai-msg";
        responseElement.innerHTML = richTextResponse; 
        appendToMsgs(responseElement);
      })
      .catch(error => {
        ErrorMsg();
        console.error("Error in Gemini response:", error);
        if (thinkingElement) thinkingElement.remove();
      });
  });
}


let geminiSession = null;

function initializeGeminiSession() {
  if (geminiSession) return Promise.resolve();

  return ai.languageModel.create({
    systemPrompt: "You are an assistant analyzing HTML and CSS.",
  }).then(session => {
    geminiSession = session;
    console.log("Gemini session initialized.");
  }).catch(error => {
    ErrorMsg();
    console.log("Error initializing Gemini Nano session");
  });
}


function convertMarkdownToRichText(markdown) {
  return markdown
    .replace(/</g, "&lt;") // Escape opening angle brackets
    .replace(/>/g, "&gt;") // Escape closing angle brackets
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italics
    .replace(/## (.*?)\n/g, "<h4>$1</h4>") // H4
    .replace(/# (.*?)\n/g, "<h3>$1</h3>") // H3
    .replace(/`(.*?)`/g, "<code>$1</code>") // Inline code
    .replace(/^\* (.*?)$/gm, "<li>$1</li>") // List item
    .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>") // Wrap list items in <ul>
    .replace(/\n/g, "<br>") // Line breaks
    .trim();
}



document.addEventListener("DOMContentLoaded", () => {
  const sendButton = document.getElementById("sendButton");

  if (sendButton) {
    sendButton.addEventListener("click", () => {
      const userInput = document.getElementById("chatInput").value.trim();
      if (userInput) {
        // Append the user's input message to the conversation
        const userMsgElement = document.createElement("div");
        userMsgElement.className = "user-msg";
        userMsgElement.textContent = userInput;

        const msgsContainer = document.getElementById("msgs");
        if (msgsContainer) {
          msgsContainer.appendChild(userMsgElement);
          msgsContainer.scrollTop = msgsContainer.scrollHeight; // Scroll to the bottom
        }

        // Clear input field
        document.getElementById("chatInput").value = "";

        let promptUser = `If user greets then simply greet him back and end conversation,
        If the user asks for code provide him explaination along with the modifications, 
        and if user asks for explaination of code give details about the code, user input is: `;
        // Send user input to Gemini Nano
        sendToGemini(promptUser + userInput);
      } else {
        ErrorMsg();
      }
    });
  } else {
    ErrorMsg();
  }
});

// Send user input to Gemini Nano for a response
function sendToGemini(userInput) {
  const msgsContainer = document.getElementById("msgs");
  const thinkingElement = document.createElement("div");
  thinkingElement.className = "thinking-msg";
  thinkingElement.textContent = "THINKING...";
  if (msgsContainer) {
    msgsContainer.appendChild(thinkingElement);
  }

  initializeGeminiSession().then(() => {
    geminiSession.prompt(userInput)
      .then(response => {
        console.log("Gemini Response:", response);

        // Remove THINKING... message
        if (thinkingElement) {
          thinkingElement.remove();
        }

        // Append Gemini's response as rich text
        const responseElement = document.createElement("div");
        responseElement.className = "ai-msg";
        responseElement.innerHTML = convertMarkdownToRichText(response); 

        if (msgsContainer) {
          msgsContainer.appendChild(responseElement);
          msgsContainer.scrollTop = msgsContainer.scrollHeight;
        }
      })
      .catch(error => {
        console.error("Error in Gemini response:", error);
        if (thinkingElement) {
          thinkingElement.remove();
        }
      });
  }).catch(error => {
    ErrorMsg();
    if (thinkingElement) {
      thinkingElement.remove();
    }
  });
}

function ErrorMsg() {
  const responseElement = document.createElement("div");
  responseElement.className = "ai-msg";
  responseElement.innerHTML = "Internal Gemeni Error, Please try again."; 
}

