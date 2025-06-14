# Repo Gist Userscript

A userscript that enhances [T3 Chat](https://t3.chat) by providing GitHub repository context to your conversations. This script allows you to import repositories and use their contents as additional context for your chat interactions.

## Features

- Import public GitHub repositories directly into your [T3 Chat](https://t3.chat) conversations
- Automatically enhances chat prompts with relevant repository context
- Clean and intuitive UI integration with [T3 Chat](https://t3.chat)
- Persistent storage of repository data using IndexedDB
- Debug mode for troubleshooting
- Secure API key management

## Demo

<video width="800" controls autoplay muted>
  <source src="repogist-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Prerequisites

- [Tampermonkey](https://www.tampermonkey.net/) browser extension
- A Gemini API key (for context generation)
- A RepoGist API URL (for repository ingest)

## Installation

1. Install the Tampermonkey browser extension from [tampermonkey.net](https://www.tampermonkey.net/)
2. Click on the Tampermonkey icon in your browser
3. Select "Create a new script"
4. Copy and paste the entire contents of `repo-gist.js` into the editor
5. Save the script (Ctrl+S or File > Save)

## Configuration

The script requires two API configurations:

1. **RepoGist API URL**: The endpoint for repository import
2. **Gemini API Key**: Used for generating relevant context from repository contents

You can configure these in two ways:

### Automatic Configuration

- The first time you click the "Import Repo" button, a configuration modal will appear
- Enter your RepoGist API URL and Gemini API key
- Click "Save" to store the configuration

### Manual Configuration

You can also configure the APIs through Tampermonkey's menu:

1. Click the Tampermonkey icon
2. Find "Repo Gist" in the menu
3. Use the following commands:
   - "Reset Gemini API Key" - Clear and reconfigure the Gemini API key
   - "Reset RepoGist API URL" - Clear and reconfigure the RepoGist API URL

### RepoGist API Options

You have two options for using the RepoGist API:

1. **Use the Public API** (Recommended for most users):

   - Use the default endpoint:
     - `https://repogist-api.vercel.app/ingest`
   - No setup required
   - Subject to rate limits and availability

2. **Self-host the API** (For advanced users):
   - Fork the Repo Gist [repository](https://github.com/prudentbird/repogist-api)
   - Follow the setup instructions in the forked repository
   - Deploy to your preferred hosting platform (Vercel, Railway, etc.)
   - Use your deployed API URL in the configuration

## Usage

1. Navigate to [T3 Chat](https://t3.chat/)
2. Look for the "Import Repo" button in the message actions area
3. Click the button and enter a GitHub repository URL
4. The script will import the repository and enhance your chat interactions with relevant context

## Supported Repository URLs

The script supports the following URL formats:

- HTTPS GitHub URLs: `https://github.com/username/repo`
- HTTPS GitHub URLs with branch: `https://github.com/username/repo/tree/branch`
- Git URLs: `git@github.com:username/repo.git`
- HTTPS Git URLs: `https://github.com/username/repo.git`
- GitLab URLs: `https://gitlab.com/username/repo`
- GitLab URLs with branch: `https://gitlab.com/username/repo/-/tree/branch`

## Debug Mode

To enable debug mode:

1. Click the Tampermonkey icon
2. Find "Repo Gist" in the menu
3. Click "Toggle debug logs"

Debug mode will show detailed logs in the browser console, which can be helpful for troubleshooting.

## Data Management

The script stores repository data locally using IndexedDB. You can clear all stored data using the "Reset IndexedDB for all chats" option in the Tampermonkey menu.

## Security

- API keys are stored securely using Tampermonkey's storage API
- Repository data is stored locally in your browser
- No data is sent to unauthorized endpoints

## Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/prudentbird/repogist).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
