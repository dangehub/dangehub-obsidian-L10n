# L10n Plugin for Obsidian 

A tool for translating settings interfaces of other Obsidian plugins.

## Features

- Automatically scan text from other plugins' settings pages
- Support translation of setting names and descriptions
- Real-time translation display
- Side-by-side display of original text and translation
- Simple and intuitive translation management interface

## Installation

### Manual Installation

1. Download the latest release
2. Extract it to your vault's `.obsidian/plugins` directory
3. Reload Obsidian
4. Enable the plugin in Settings

## Usage

### Scanning Text for Translation

1. Open the settings page of the plugin you want to translate
2. Click the `Scan Current Page Text` button above the plugin list on the left
3. Wait for the "Text scanning completed" notification

### Adding Translations

1. Open Obsidian Settings
2. Find "L10n" plugin settings
3. Enter translations in the corresponding text boxes
4. Translations will be automatically saved and applied

### Viewing Translations

- Reopen the settings page of the translated plugin
- Translations will appear below the original text
- Original text and translations are distinguished by different colors

## Roadmap

- [ ] Support import/export of translation data
- [ ] Support batch translation
- [ ] Support translation of more UI elements
- [ ] Add translation memory feature
- [ ] Integrate online translation services

## Contributing

Contributions are welcome! Before developing:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Build Instructions

# Clone the repository
git clone https://github.com/yourusername/obsidian-L10n.git

# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

- Thanks to Obsidian for providing an excellent plugin platform
- Thanks to all contributors

## Contact

If you have any questions or suggestions:

- Submit an [Issue](https://github.com/yourusername/obsidian-L10n/issues)
- Start a [Discussion](https://github.com/yourusername/obsidian-L10n/discussions)

## Changelog

### 0.1.0 (2024-XX-XX)
- Initial release
- Basic plugin settings interface translation
- Real-time translation injection