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
      this.extractCode();
    }, 1000); // 1 second debounce
  }

  extractCode() {
    // This is a placeholder - the actual implementation will depend on the specific Cloud IDE's DOM structure
    // For now, we'll try to find common editor elements
    const editor = document.querySelector('.monaco-editor, .CodeMirror, .ace_editor, [role="textbox"], [contenteditable="true"]');
    
    if (!editor) {
      console.log('Baseline Checker: No editor element found');
      return;
    }

    let code = '';
    
    // Handle different editor types
    if (editor.classList.contains('monaco-editor')) {
      // VS Code-based editors
      code = editor.innerText;
    } else if (editor.classList.contains('CodeMirror')) {
      // CodeMirror-based editors
      const cm = editor.CodeMirror || editor.closest('.CodeMirror')?.CodeMirror;
      if (cm) code = cm.getValue();
    } else if (editor.classList.contains('ace_editor')) {
      // ACE editors
      const aceEditor = window.ace && window.ace.edit(editor.id || editor);
      if (aceEditor) code = aceEditor.getValue();
    } else if (editor.getAttribute('contenteditable') === 'true' || editor.role === 'textbox') {
      // Generic contenteditable or textbox
      code = editor.innerText || editor.textContent;
    }

    // Only process if code has changed
    if (code && code !== this.lastCode) {
      this.lastCode = code;
      this.analyzeCode(code);
    }
  }

  analyzeCode(code) {
    // Send the code to the background script for analysis
    chrome.runtime.sendMessage({
      type: 'CODE_ANALYSIS_REQUEST',
      code: code,
      timestamp: new Date().toISOString()
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Baseline Checker:', chrome.runtime.lastError);
        return;
      }
      console.log('Analysis results:', response);
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_CURRENT_CODE':
        sendResponse({ code: this.lastCode });
        break;
      case 'ANALYZE_CURRENT_CODE':
        this.extractCode();
        break;
    }
    return true; // Keep the message channel open for async response
  }
}

// Initialize the code extractor when the script loads
new CodeExtractor();
