// Background service worker for the Baseline Checker extension

// Load the baseline features data
let baselineFeatures = null;

// Load the baseline features data when the service worker starts
async function loadBaselineData() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/baseline-features.json'));
    baselineFeatures = await response.json();
    console.log('Baseline Checker: Loaded baseline features data');
  } catch (error) {
    console.error('Failed to load baseline features:', error);
  }
}

// Analyze code for web platform features
function analyzeCode(code) {
  if (!baselineFeatures) {
    throw new Error('Baseline features data not loaded');
  }

  // This is a simplified example - in a real implementation, you would use a proper parser
  // like @babel/parser for JavaScript, postcss for CSS, etc.
  const features = [];
  
  // Example: Check for specific JavaScript features
  const jsFeatures = {
    'optional-chaining': { name: 'Optional Chaining (?.)', category: 'javascript' },
    'nullish-coalescing': { name: 'Nullish Coalescing (??)', category: 'javascript' },
    'top-level-await': { name: 'Top-level await', category: 'javascript' },
    'private-class-fields': { name: 'Class Fields', category: 'javascript' },
    'dynamic-import': { name: 'Dynamic import()', category: 'javascript' },
  };

  // Example: Check for specific CSS features
  const cssFeatures = {
    'css-has': { name: ':has() selector', category: 'css' },
    'css-container-queries': { name: 'CSS Container Queries', category: 'css' },
    'css-nesting': { name: 'CSS Nesting', category: 'css' },
    'css-subgrid': { name: 'CSS Subgrid', category: 'css' },
  };

  // Check for JavaScript features
  for (const [featureId, featureInfo] of Object.entries(jsFeatures)) {
    // This is a very basic check - in a real implementation, use a proper parser
    if (code.includes(featureId.replace(/-/g, ' ')) || 
        code.includes(featureId.replace(/-/g, '')) ||
        code.includes(featureId)) {
      features.push({
        id: featureId,
        name: featureInfo.name,
        category: featureInfo.category,
        status: getFeatureStatus(featureId, featureInfo.category),
        description: getFeatureDescription(featureId, featureInfo.category)
      });
    }
  }

  // Check for CSS features
  for (const [featureId, featureInfo] of Object.entries(cssFeatures)) {
    // This is a very basic check - in a real implementation, use a proper CSS parser
    if (code.includes(`:${featureId}`) || 
        code.includes(`@${featureId}`) ||
        code.includes(featureId.replace(/-/g, ' ')) ||
        code.includes(featureId)) {
      features.push({
        id: featureId,
        name: featureInfo.name,
        category: featureInfo.category,
        status: getFeatureStatus(featureId, featureInfo.category),
        description: getFeatureDescription(featureId, featureInfo.category)
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    features: features,
    stats: {
      total: features.length,
      baseline: features.filter(f => f.status === 'baseline').length,
      new: features.filter(f => f.status === 'new').length,
      unsupported: features.filter(f => f.status === 'unsupported').length
    }
  };
}

// Get the status of a feature (baseline, new, or unsupported)
function getFeatureStatus(featureId, category) {
  // In a real implementation, this would check against the actual baseline data
  // For now, we'll use a simplified approach
  
  // Example baseline features (as of 2024)
  const baselineFeaturesList = [
    'optional-chaining', 'nullish-coalescing', 'css-nesting'
  ];
  
  // Example new features (not yet baseline)
  const newFeaturesList = [
    'top-level-await', 'private-class-fields', 'css-has', 'css-container-queries'
  ];
  
  if (baselineFeaturesList.includes(featureId)) {
    return 'baseline';
  } else if (newFeaturesList.includes(featureId)) {
    return 'new';
  } else {
    return 'unsupported';
  }
}

// Get a description for a feature
function getFeatureDescription(featureId, category) {
  const descriptions = {
    'optional-chaining': 'Safely access nested object properties without checking each level',
    'nullish-coalescing': 'Provide default values for null or undefined values',
    'top-level-await': 'Use await at the top level of modules',
    'private-class-fields': 'Encapsulate class fields with private # syntax',
    'dynamic-import': 'Load modules dynamically at runtime',
    'css-has': 'Style elements based on their descendants',
    'css-container-queries': 'Style elements based on their container size',
    'css-nesting': 'Nest CSS rules for better readability and maintainability',
    'css-subgrid': 'Create more complex grid layouts with nested grids'
  };
  
  return descriptions[featureId] || `Information about ${featureId} not available.`;
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CODE_ANALYSIS_REQUEST') {
    try {
      const results = analyzeCode(message.code);
      sendResponse({
        type: 'ANALYSIS_RESULTS',
        results: results
      });
    } catch (error) {
      console.error('Error during code analysis:', error);
      sendResponse({
        type: 'ANALYSIS_ERROR',
        error: error.message
      });
    }
    return true; // Keep the message channel open for async response
  }
});

// Initialize the service worker
loadBaselineData().catch(console.error);

// Log when the service worker is installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Baseline Checker extension installed');
  } else if (details.reason === 'update') {
    console.log('Baseline Checker extension updated');
  }
});
