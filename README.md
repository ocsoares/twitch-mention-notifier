<h1 align="center">
  <img src="https://raw.githubusercontent.com/ocsoares/Twitch-Mention-Notifier/master/public/icons/twitch-icon_128.png" alt="Twitch Mention Notifier">
  <br />
  Twitch Mention Notifier
  <br />
</h1>

> A web extension to notify users when they are mentioned in Twitch chats.

Twitch Mention Notifier is a web extension that allows users to receive notifications when they are mentioned in Twitch chats. The extension continuously monitors the chats in which the user is active and displays a notification whenever a mention is detected.

# Content

-   [Features ✨](#features-)
-   [Screenshots 📸](#screenshots-)
-   [Installation 🚀](#installation-)
-   [Usage 💡](#usage-)
-   [Contributing 🤝](#contributing-)
-   [License 📄](#license-)

## Features ✨

-   Receive notifications when you are mentioned in Twitch chats 🔔

-   Notifies when you are mentioned with "@" and also without, so both "@JohnDoe" and "JohnDoe", for example, will activate notifications 💬

-   The matching is **case-insensitive**, meaning that it **will work** regardless of whether the mention is in uppercase or lowercase, so "@johndoe" or "JoHNdOe" will work ⌨️

-   Click on the notification to open the mentioned chat in a new browser tab 📢

-   20-second cooldown between each new notification, to prevent spam 🕒

## Screenshots 📸

<p align="center">
  <img src="https://raw.githubusercontent.com/ocsoares/twitch-mention-notifier/master/images/twitch-ext-popup-disabled.jpg" alt="Disabled Popup">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ocsoares/twitch-mention-notifier/master/images/twitch-ext-popup-activated.jpg" alt="Activated Popup">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ocsoares/twitch-mention-notifier/master/images/twitch-ext-notification.jpg" alt="Notification">
</p>

## Installation 🚀

### 🌐 Chromium (Google Chrome, Edge, or Brave)

1. Download the extension in ZIP format [here](https://github.com/ocsoares/Twitch-Mention-Notifier/releases/latest) on the [Releases Page](https://github.com/ocsoares/Twitch-Mention-Notifier/releases).
2. Extract the ZIP file to a local directory.
3. In your browser, go to `chrome://extensions` in the address bar.
4. Enable "Developer mode" in the top right corner of the page.
5. Click on the "Load unpacked" button and select the folder where you extracted the ZIP file.
6. The Twitch Mention Notifier extension will be loaded and activated.

⚠️ **IMPORTANT**: The extension will **not work** if activated on chrome://extensions due to browser-specific policies

## Usage 💡

1. Click on the extension popup.
2. Enter, respectively, the twitch channel name from which the chat will be read, your twitch username, and optionally, abbreviations or variations of your twitch username.
3. When you are mentioned in the Twitch chat, a notification will be displayed on your computer.
4. Click on the notification to open the mentioned chat in a new browser tab.

## Contributing 🤝

Contributions are welcome! To contribute to the project, follow these steps:

1. Fork the repository. 🍴
2. Create a new branch with your feature or bug fix: `git checkout -b my-feature`.
3. Commit your changes: `git commit -m 'Added a new feature'`.
4. Push to the branch: `git push origin my-feature`.
5. Open a pull request on GitHub.

## License 📄

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ocsoares/Twitch-Mention-Notifier/blob/master/LICENSE)

MIT © ocsoares
