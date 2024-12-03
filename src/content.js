console.log("Content script executed");

// Add your existing logic here to handle element selection and CSS display
document.addEventListener("click", (event) => {
  const element = event.target;

  // Assuming you want to target an element by id
  // If you want to target by id, replace 'elementId' with the actual id of the element
  const elementById = document.getElementById('elementId'); 

  // If you want to target by class, replace 'elementClass' with the actual class of the element
  const elementByClass = document.querySelector('.elementClass'); 

  // Get computed styles of the element by id or class
  const computedStyles = window.getComputedStyle(elementById || elementByClass);

  const cssProperties = Array.from(computedStyles).reduce((acc, prop) => {
    acc[prop] = computedStyles.getPropertyValue(prop);
    return acc;
  }, {});
  
  // Send the data to the extension or log it
  chrome.runtime.sendMessage({
    action: "displayElementDetails",
    data: {
      htmlTag: (elementById || elementByClass).outerHTML,
      css: JSON.stringify(cssProperties, null, 2),
    },
  });
});

// Selection Functionality
if (!window._elementSelectionActive) {
    window._elementSelectionActive = true;

    let highlightOverlay;

    function startElementSelection() {
      if (highlightOverlay) return;

      highlightOverlay = document.createElement("div");
      highlightOverlay.style.position = "fixed";
      highlightOverlay.style.pointerEvents = "none";
      highlightOverlay.style.zIndex = "100000";
      highlightOverlay.style.border = "2px solid red";
      highlightOverlay.style.transition = "all 0.1s ease-out";
      document.body.appendChild(highlightOverlay);

      document.addEventListener("mousemove", handleMouseMove, true);
      document.addEventListener("click", handleElementClick, true);
      document.addEventListener("keydown", handleCancel, true);
    }

    function handleMouseMove(event) {
      const element = event.target;
      const rect = element.getBoundingClientRect();

      highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
      highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
      highlightOverlay.style.width = `${rect.width}px`;
      highlightOverlay.style.height = `${rect.height}px`;
    }
  
    
    




    function handleElementClick(event) {
      event.preventDefault();
      event.stopPropagation();
  
      const element = event.target;
  
      // Get inline styles directly applied to the element
      const inlineStyles = element.getAttribute('style') ? element.getAttribute('style').split(';') : [];
      const inlineStylesObj = {};
      inlineStyles.forEach((style) => {
          const [property, value] = style.split(':').map(item => item.trim());
          if (property && value) {
              inlineStylesObj[property] = value;
          }
      });
  
      // Get computed styles from the browser
      const computedStyles = window.getComputedStyle(element);
  
      // Create an object to hold filtered styles
      const filteredStyles = {};
  
      Array.from(computedStyles).forEach((prop) => {
          const value = computedStyles.getPropertyValue(prop).trim();
  
          // Define ignored and redundant styles
          const ignoredDefaults = ["auto", "normal", "none", "initial", "inherit", "unset"];
          const redundantProperties = ["appearance", "box-sizing", "animation-composition", "transform-origin"];
          
          // Exclude defaults, redundant styles, 0px/empty values, and WebKit-prefixed properties
          if (
              value &&
              !ignoredDefaults.includes(value) &&
              !redundantProperties.includes(prop) &&
              !(prop in inlineStylesObj && inlineStylesObj[prop] === value) &&
              !(value === "0px" || value === "0" || value === "0s" ||  value === "0% 0%" || value === "0deg" || value === "0ms" || value === "0em" || value === "0px" || value === "0rem" || value === "0vh" || value === "0vw" || value === "0vmin" || value === "0vmax" || value === "0ch" || value === "0ex" || value === "0cm" || value === "0mm" || value === "0in" || value === "0pt" || value === "0pc" || value === "0px" || value === "0%" || value === "grba(0, 0, 0, 0)" || value === "transparent" || value === "rgba(0, 0, 0, 0)" || value === "rgb(0, 0, 0)" ) &&
              !prop.startsWith('-webkit') &&
              !prop.startsWith('background') &&
              !prop.startsWith('animation') &&
              !prop.startsWith('cursor') && !prop.startsWith('display') && !prop.startsWith('visibility') && !prop.startsWith('writing-mode') 
              && !prop.startsWith('cursor')// Exclude WebKit-prefixed styles
          ) {
              filteredStyles[prop] = value;
          }
      });
  
      // Send the filtered styles
      chrome.runtime.sendMessage({
          action: "displayElementDetails",
          data: {
              htmlTag: element.outerHTML,
              css: filteredStyles, // Optimized and filtered CSS styles
          },
      });
  
      cleanUp();
  }



    function handleCancel(event) {
      if (event.key === "Escape") {
        cleanUp();
      }
    }

    function cleanUp() {
      if (highlightOverlay) {
        highlightOverlay.remove();
        highlightOverlay = null;
      }
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleElementClick, true);
      document.removeEventListener("keydown", handleCancel, true);
      window._elementSelectionActive = false;
    }

    startElementSelection();
}
