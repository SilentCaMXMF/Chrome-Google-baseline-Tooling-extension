# Baseline Checker for Cloud IDEs

A Chrome extension that helps developers check web platform features against [Baseline](https://web.dev/baseline/) data directly in their Cloud IDE.

## Features

- **Real-time Analysis**: Automatically detects web platform features in your code
- **Baseline Status**: Shows which features are considered baseline, new, or unsupported
- **Detailed Information**: Provides descriptions and browser support for each feature
- **Multiple Editor Support**: Works with popular code editors in cloud IDEs (VS Code, Monaco, CodeMirror, ACE, etc.)
- **Non-intrusive UI**: Displays results in a clean popup without cluttering your workspace

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Baseline Checker icon should appear in your Chrome toolbar

## Usage

1. Open your Cloud IDE (e.g., GitHub Codespaces, GitPod, CodeSandbox, etc.)
2. Click the Baseline Checker icon in your Chrome toolbar
3. Click "Scan Current File" to analyze the code in your active editor
4. View the results showing which features are baseline, new, or unsupported
5. Hover over any feature for more details and links to documentation

## How It Works

The extension works by:

1. **Content Script**: Monitors the active editor in your Cloud IDE
2. **Code Extraction**: Extracts code from the editor using DOM APIs
3. **Feature Detection**: Analyzes the code to identify web platform features
4. **Baseline Check**: Compares detected features against the latest Baseline data
5. **Results Display**: Shows which features are safe to use and which might need fallbacks

## Supported Features

The extension currently checks for:

### JavaScript Features
- Optional Chaining (`?.`)
- Nullish Coalescing (`??`)
- Top-level `await`
- Private Class Fields (`#privateField`)
- Dynamic `import()`

### CSS Features
- `:has()` selector
- CSS Container Queries
- CSS Nesting
- CSS Subgrid

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Privacy Policy

For details on how this extension handles data and permissions, please read our [Privacy Policy](./PRIVACY.md)


## Acknowledgments

- [MDN Web Docs](https://developer.mozilla.org/) for comprehensive web documentation
- [Can I use](https://caniuse.com/) for browser compatibility data
- [web.dev/baseline](https://web.dev/baseline/) for the Baseline initiative

## Support

For issues and feature requests, please [open an issue](https://github.com/silentcamxmf/baseline-checker/issues) on GitHub.
