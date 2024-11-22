# L10n Plugin for Obsidian 

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/dangehub/obsidian-L10n/total)
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

A tool for translating plugin interfaces in Obsidian.

## Features

- Real-time monitoring and translation of plugin interface text
- Quick translation refresh via floating ball
- Convenient translation management panel
- Translation rules management by plugin
- Search and filter translation entries
- Real-time editing and updating of translations

## Installation

### Manual Installation

1. Download the latest release
2. Extract to your vault's `.obsidian/plugins` directory
3. Restart Obsidian
4. Enable plugin in Settings

## Usage

### Recording Translations

1. Open the plugin interface you want to translate
2. Open the translation control panel (via command palette or sidebar button)
3. Click "Start Recording"
4. Modify text directly on the interface
5. Click "Stop Recording" - modified text will be automatically saved as translation rules

### Managing Translations

1. In the translation control panel, you can:
   - View all translation rules
   - Filter rules by plugin
   - Search specific text
   - Edit existing translations
   - Delete unwanted translations

### Applying Translations

- Use the floating ball in the bottom right corner to refresh translations anytime
- Toggle translation feature quickly via command palette

## Roadmap

- [x] Support import/export of translation data
- [ ] Support batch translation
- [ ] Support translation of more UI elements
- [ ] Add translation memory feature
- [ ] Integrate online translation services

## Development

# Clone the repository
git clone https://github.com/dangehub/obsidian-L10n.git

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

## Changelog

### 0.0.1 (In Development)
- Initial release
- Basic translation functionality
- Translation control panel
- Real-time translation injection

<!-- links -->
[your-project-path]:dangehub/obsidian-L10n
[contributors-shield]: https://img.shields.io/github/contributors/dangehub/obsidian-L10n.svg?style=flat-square
[contributors-url]: https://github.com/dangehub/obsidian-L10n/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dangehub/obsidian-L10n.svg?style=flat-square
[forks-url]: https://github.com/dangehub/obsidian-L10n/network/members
[stars-shield]: https://img.shields.io/github/stars/dangehub/obsidian-L10n.svg?style=flat-square
[stars-url]: https://github.com/dangehub/obsidian-L10n/stargazers
[issues-shield]: https://img.shields.io/github/issues/dangehub/obsidian-L10n.svg?style=flat-square
[issues-url]: https://img.shields.io/github/issues/dangehub/obsidian-L10n.svg
[license-shield]: https://img.shields.io/github/license/dangehub/obsidian-L10n.svg?style=flat-square
[license-url]: https://github.com/dangehub/obsidian-L10n/blob/master/LICENSE.txt
