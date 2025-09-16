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
      }
    } catch (error) {
      console.error('Error getting active tab:', error);
      setStatus('Error accessing tab', 'error');
    }
  }

  // Start the analysis process
  async function startAnalysis() {
    if (!currentTab) return;
    
    setStatus('Analyzing code...', 'loading');
    
    try {
      // Send a message to the content script to analyze the current code
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'ANALYZE_CURRENT_CODE'
      });
      
      // The actual response will come through the runtime.onMessage listener below
    } catch (error) {
      console.error('Error during analysis:', error);
      setStatus('Analysis failed. Please try again.', 'error');
    }
  }

  // Update the UI with analysis results
  function displayResults(results) {
    if (!results || !results.features || results.features.length === 0) {
      featureList.innerHTML = `
        <div class="empty-state">
          <p>No web platform features detected in the current file.</p>
        </div>
      `;
      setStatus('No features found', 'success');
      return;
    }
    
    // Count features by status
    const counts = {
      baseline: 0,
      new: 0,
      unsupported: 0
    };
    
    // Sort features by status (unsupported first, then new, then baseline)
    const sortedFeatures = [...results.features].sort((a, b) => {
      const statusOrder = { 'unsupported': 0, 'new': 1, 'baseline': 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
    
    // Generate HTML for each feature
    const featuresHtml = sortedFeatures.map(feature => {
      // Update counts
      if (feature.status === 'baseline') counts.baseline++;
      else if (feature.status === 'new') counts.new++;
      else counts.unsupported++;
      
      // Get status display text and class
      let statusText, statusClass, statusEmoji;
      
      switch (feature.status) {
        case 'baseline':
          statusText = 'Baseline';
          statusClass = 'success';
          statusEmoji = '✅';
          break;
        case 'new':
          statusText = 'New';
          statusClass = 'warning';
          statusEmoji = '⚠️';
          break;
        case 'unsupported':
          statusText = 'Unsupported';
          statusClass = 'error';
          statusEmoji = '❌';
          break;
      }
      
      return `
        <div class="feature-item ${statusClass}" title="${feature.description || 'No description available'}">
          <div class="feature-header">
            <span class="feature-name">${feature.name}</span>
            <span class="feature-status ${statusClass}">${statusEmoji} ${statusText}</span>
          </div>
          ${feature.details ? `<div class="feature-details">${feature.details}</div>` : ''}
          ${feature.moreInfo ? `<a href="${feature.moreInfo}" target="_blank" class="feature-link">Learn more</a>` : ''}
        </div>
      `;
    }).join('');
    
    // Update the UI
    featureList.innerHTML = featuresHtml;
    
    // Update summary badges
    summaryBadges.success.textContent = `${counts.baseline} ✅`;
    summaryBadges.warning.textContent = `${counts.new} ⚠️`;
    summaryBadges.error.textContent = `${counts.unsupported} ❌`;
    
    // Update status
    if (counts.unsupported > 0) {
      setStatus(`Found ${counts.unsupported} unsupported features`, 'error');
    } else if (counts.new > 0) {
      setStatus(`Found ${counts.new} new features`, 'warning');
    } else {
      setStatus(`All ${counts.baseline} features are baseline`, 'success');
    }
    
    // Store the last analysis
    lastAnalysis = results;
  }

  // Update the status message
  function setStatus(message, type = 'info') {
    statusText.textContent = message;
    statusText.className = type;
    
    // Show/hide spinner
    if (type === 'loading') {
      spinner.style.display = 'block';
      scanBtn.disabled = true;
    } else {
      spinner.style.display = 'none';
      scanBtn.disabled = false;
    }
  }

  // Listen for messages from the content script or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYSIS_RESULTS') {
      displayResults(message.results);
    } else if (message.type === 'ANALYSIS_ERROR') {
      setStatus(message.error || 'Analysis failed', 'error');
    }
  });

  // Initialize the popup
  init();
});
