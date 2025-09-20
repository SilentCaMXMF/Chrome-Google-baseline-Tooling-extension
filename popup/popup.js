document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const scanBtn = document.getElementById('scanBtn');
  const statusText = document.getElementById('statusText');
  const spinner = document.getElementById('spinner');
  const featureList = document.getElementById('featureList');
  const baselineVersion = document.getElementById('baselineVersion');
  const summaryBadges = {
    success: document.querySelector('.badge.success'),
    warning: document.querySelector('.badge.warning'),
    error: document.querySelector('.badge.error')
  };

  // State
  let currentTab = null;
  let lastAnalysis = null;
  let currentIssues = [];

  // Initialize the popup
  async function init() {
    // Load the baseline data version
    try {
      const response = await fetch(chrome.runtime.getURL('data/baseline-features.json'));
      const data = await response.json();
      if (data.version) {
        baselineVersion.textContent = `v${data.version} (${new Date(data.updated).toLocaleDateString()})`;
      }
    } catch (error) {
      console.error('Failed to load baseline data:', error);
      baselineVersion.textContent = 'Error loading data';
    }

    // Set up event listeners
    scanBtn.addEventListener('click', startAnalysis);
    
    // Get the current active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      
      // Check if the current tab is a valid target
      if (!tab.url.startsWith('http')) {
        setStatus('This page cannot be analyzed', 'error');
        scanBtn.disabled = true;
      } else {
        // Request the latest analysis results
        chrome.tabs.sendMessage(tab.id, { type: 'GET_ANALYSIS_RESULTS' }, response => {
          if (chrome.runtime.lastError) {
            console.log('No analysis results yet:', chrome.runtime.lastError);
            return;
          }
          if (response && response.issues) {
            displayResults(response);
          }
        });
      }
    } catch (error) {
      console.error('Error getting active tab:', error);
      setStatus('Error accessing tab', 'error');
    }
  }

  // Start code analysis
  async function startAnalysis() {
    if (!currentTab) return;
    
    setStatus('Analyzing code...', 'info');
    scanBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
      // First, inject the content script if not already injected
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content-scripts/content.js']
      });
  
      // Then send the message with a timeout
      const response = await new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve({ error: 'Analysis timed out' });
        }, 10000); // 10 second timeout
  
        chrome.tabs.sendMessage(
          currentTab.id, 
          { type: 'ANALYZE_CODE' },
          (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              console.error('Message error:', chrome.runtime.lastError);
              resolve({ error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { error: 'No response from content script' });
            }
          }
        );
      });
  
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.issues) {
        displayResults(response);
        setStatus('Analysis complete', 'success');
      } else {
        setStatus('No issues found', 'success');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      setStatus(`Error: ${error.message}`, 'error');
    } finally {
      scanBtn.disabled = false;
      spinner.style.display = 'none';
    }
  }

  // Update the UI with analysis results
  function displayResults(results) {
    currentIssues = results.issues || [];
    
    // Update summary badges
    const counts = {
      success: 0,
      warning: 0,
      error: 0
    };
    
    currentIssues.forEach(issue => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    });
    
    summaryBadges.success.textContent = `${counts.success} ✅`;
    summaryBadges.warning.textContent = `${counts.warning} ⚠️`;
    summaryBadges.error.textContent = `${counts.error} ❌`;
    
    // Update feature list
    if (currentIssues.length === 0) {
      featureList.innerHTML = `
        <div class="empty-state">
          <p>No compatibility issues found! 🎉</p>
          <p class="subtext">Your code is looking good with the current baseline.</p>
        </div>
      `;
      return;
    }
    
    // Group issues by feature
    const issuesByFeature = currentIssues.reduce((acc, issue) => {
      if (!acc[issue.feature]) {
        acc[issue.feature] = [];
      }
      acc[issue.feature].push(issue);
      return acc;
    }, {});
    
    // Create feature cards
    featureList.innerHTML = Object.entries(issuesByFeature).map(([feature, issues]) => {
      const featureInfo = issues[0]; // Use first issue for feature metadata
      const severity = issues.some(i => i.severity === 'error') ? 'error' : 
                      issues.some(i => i.severity === 'warning') ? 'warning' : 'success';
      
      return `
        <div class="feature-card ${severity}" data-feature="${feature}">
          <div class="feature-header">
            <h3>${feature}</h3>
            <div class="feature-severity">
              <span class="severity-badge ${severity}">
                ${severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : '✅'} ${severity}
              </span>
            </div>
          </div>
          
          <div class="feature-details">
            <p class="feature-message">${featureInfo.message}</p>
            
            <div class="feature-links">
              <a href="${featureInfo.docsUrl}" target="_blank" class="btn small">
                📚 View Documentation
              </a>
              <button class="btn small secondary view-in-code" data-feature="${feature}">
                🔍 Show in Code
              </button>
            </div>
            
            ${issues.length > 1 ? `
              <div class="issue-count">
                ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} found
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners for "Show in Code" buttons
    document.querySelectorAll('.view-in-code').forEach(button => {
      button.addEventListener('click', (e) => {
        const feature = e.target.dataset.feature;
        const issues = currentIssues.filter(issue => issue.feature === feature);
        
        // Send message to content script to highlight the feature
        chrome.tabs.sendMessage(currentTab.id, {
          type: 'HIGHLIGHT_FEATURE',
          feature: feature
        });
        
        // Close the popup
        window.close();
      });
    });
    
    // Add event listeners for documentation links to track usage
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      link.addEventListener('click', (e) => {
        // You could add analytics here to track which documentation links are used
        console.log('Documentation link clicked:', e.target.href);
      });
    });
  }

  // Update the status message
  function setStatus(message, type = 'info') {
    statusText.textContent = message;
    statusText.className = '';
    
    switch (type) {
      case 'error':
        statusText.classList.add('error');
        break;
      case 'success':
        statusText.classList.add('success');
        break;
      case 'warning':
        statusText.classList.add('warning');
        break;
      default:
        statusText.classList.add('info');
    }
  }

  // Listen for messages from the content script or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYSIS_RESULTS') {
      displayResults(message.results);
      if (sendResponse) sendResponse({ status: 'success' });
      return true;
    }
  });

  // Initialize the popup
  init();
});
