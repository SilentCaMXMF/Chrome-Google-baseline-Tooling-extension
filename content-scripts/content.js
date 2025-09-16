// Content script to interact with the Cloud IDE

// Configuration
const OBSERVER_CONFIG = {
  childList: true,
  subtree: true,
  characterData: true
};

class CodeExtractor {
  constructor() {
    this.observer = null;
    this.lastCode = '';
    this.debounceTimer = null;
    this.featureHighlights = new Map();
    this.init();
  }

  init() {
    // Start observing the document for changes
    this.observeEditor();
    
    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  observeEditor() {
    // Create an observer instance
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    
    // Start observing the document with the configured parameters
    this.observer.observe(document.documentElement, OBSERVER_CONFIG);
    
    console.log('Baseline Checker: Observing editor for changes...');
  }

  handleMutations(mutationsList) {
    // Debounce to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.analyzeCode();
    }, 1000); // 1 second debounce
  }

  async analyzeCode() {
    const editor = document.querySelector('.monaco-editor, .CodeMirror, .ace_editor, [role="textbox"], [contenteditable="true"]');
    if (!editor) return;

    // Get the current code (implementation depends on the editor)
    const code = this.getEditorContent(editor);
    if (code === this.lastCode) return;
    
    this.lastCode = code;

    // Send code to background for analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_CODE',
      code: code
    });

    if (response && response.issues) {
      this.highlightIssues(response.issues, editor);
    }
  }

  highlightIssues(issues, editor) {
    // Remove previous highlights
    this.featureHighlights.forEach(highlight => {
      try {
        const element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
        if (element) {
          element.replaceWith(highlight.originalTextNode);
        }
      } catch (e) {
        console.error('Error removing highlight:', e);
      }
    });
    this.featureHighlights.clear();

    // Add new highlights
    issues.forEach(issue => {
      const { feature, message, docsUrl, startPos, endPos } = issue;
      const range = document.createRange();
      
      try {
        // This is a simplified example - you'll need to adjust based on how you track positions
        const textNode = this.findTextNodeAtPosition(editor, startPos, endPos);
        if (!textNode) return;

        range.setStart(textNode, startPos);
        range.setEnd(textNode, Math.min(endPos, textNode.length));

        const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'baseline-highlight';
        highlightSpan.dataset.highlightId = highlightId;
        highlightSpan.dataset.feature = feature;
        highlightSpan.dataset.docsUrl = docsUrl;
        
        // Store the original text node to restore it later
        this.featureHighlights.set(highlightId, {
          originalTextNode: textNode.cloneNode(true),
          id: highlightId
        });

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'baseline-tooltip';
        tooltip.innerHTML = `
          <div class="tooltip-header">
            <span class="tooltip-title">${feature}</span>
            <a href="${docsUrl}" target="_blank" class="tooltip-docs-link">View Docs</a>
          </div>
          <div class="tooltip-message">${message}</div>
        `;
        
        highlightSpan.appendChild(tooltip);
        range.surroundContents(highlightSpan);
      } catch (e) {
        console.error('Error highlighting issue:', e);
      }
    });
  }

  // Helper methods
  getEditorContent(editor) {
    // Implementation depends on the specific editor
    return editor.innerText || editor.textContent || '';
  }

  findTextNodeAtPosition(editor, startPos, endPos) {
    // This is a simplified implementation
    // You'll need to adjust this based on the actual editor's DOM structure
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let currentNode;
    let position = 0;
    
    while (currentNode = walker.nextNode()) {
      const nodeLength = currentNode.length || 0;
      if (position + nodeLength >= startPos) {
        return currentNode;
      }
      position += nodeLength;
    }
    
    return null;
  }

  handleMessage(message, sender, sendResponse) {
    if (message.type === 'HIGHLIGHT_ISSUES') {
      this.highlightIssues(message.issues, document.activeElement);
    }
  }
}

// Add styles for highlights and tooltips
const style = document.createElement('style');
style.textContent = `
  .baseline-highlight {
    position: relative;
    background-color: rgba(255, 183, 0, 0.2);
    border-bottom: 1px dashed #ffb700;
    cursor: help;
  }
  
  .baseline-highlight:hover .baseline-tooltip {
    visibility: visible;
    opacity: 1;
  }
  
  .baseline-tooltip {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    z-index: 1000;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    width: 250px;
    background: #2d2d2d;
    color: #fff;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: opacity 0.2s, visibility 0.2s;
    pointer-events: none;
  }
  
  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }
  
  .tooltip-title {
    font-weight: bold;
    color: #ffb700;
  }
  
  .tooltip-docs-link {
    color: #4da6ff;
    text-decoration: none;
    font-size: 11px;
  }
  
  .tooltip-docs-link:hover {
    text-decoration: underline;
    pointer-events: auto;
  }
  
  .tooltip-message {
    color: #e0e0e0;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);

// Initialize the code extractor when the script loads
new CodeExtractor();
