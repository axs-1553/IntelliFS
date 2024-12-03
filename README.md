IntelliFS - Intelligent Filesystem Server 🚀

An intelligent, AI-powered filesystem server that does more than just manage files!
Features

    📁 File Management: List, read, write, and modify files with ease.
    📝 Code Editing: Stream content to files with interruption handling and resume capability.
    🕰️ Version Control: Automatic backups and version history for all your files.
    🔍 Search: Find files and search within file contents.
    🛠️ Syntax Validation: Validate the syntax of your code for supported languages.
    🤖 AI Integration: Designed to work seamlessly with AI code generation tools.

Getting Started
Prerequisites

    Node.js: Version 14 or higher.
    NPM Packages: @modelcontextprotocol/sdk, ajv, glob.

Installation

    Clone the Repository

git clone https://github.com/yourusername/intellifs.git
cd intellifs

Install Dependencies

npm install

Configure Allowed Directories

Update the ALLOWED_DIRS array in intellifs.js or pass them as command-line arguments.

Run IntelliFS

    node intellifs.js "path_to_allowed_directory1" "path_to_allowed_directory2"

Usage Examples
List Files

{
  "command": "intellifs-list",
  "arguments": {
    "path": "/"
  }
}

Read File

{
  "command": "intellifs-read",
  "arguments": {
    "path": "example.js"
  }
}

Stream Write with Interruption Handling

    Start Writing

{
  "command": "intellifs-stream-write",
  "arguments": {
    "path": "new_file.js",
    "content": "// Initial content...",
    "isComplete": false
  }
}

Resume After Interruption

{
  "command": "intellifs-stream-write",
  "arguments": {
    "path": "new_file.js",
    "content": "// Continued content...",
    "isResume": true,
    "position": 150,
    "isComplete": true
  }
}

Commit Changes

    {
      "command": "intellifs-commit",
      "arguments": {
        "path": "new_file.js"
      }
    }

Contributors

    Axs - @axs1553 on Twitter/X , axs1553 on Discord
    Claude 3.5 Sonnet - Self-testing with Python interpreter 🐍
    IntelliAI (that's me!) - Your friendly AI assistant 🤖

License

This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgments

    Special thanks to the AI community for inspiration and support.
    Shoutout to all developers pushing the boundaries of what's possible! 🚀

Installation Notes

    Make sure to have Python installed if you plan to use syntax validation for Python files.
    For JavaScript syntax validation, ensure Node.js is properly installed and configured.

Make IntelliFS your own

    Customization: Feel free to tweak the code to suit your needs. Contributions are welcome! 🌟

Troubleshooting

    Common Issues
        Invalid Path Error: Ensure your file paths are within the allowed directories.
        Position Mismatch: Check the position parameter when resuming writes; small discrepancies are tolerated.

    Need Help?
        Open an issue on GitHub.
        Reach out on Twitter @axs1553.

Future Plans

    🌐 Web Interface: A sleek web UI for easier interaction.
    🧠 Enhanced AI Integration: Smarter suggestions and code completions.
    📊 Analytics: Insightful stats about your filesystem usage.


Enjoy using IntelliFS! May your files be ever organized and your code ever flawless! ✨
Additional Notes

    NPM Package Versions

    Ensure the following versions (or higher) are installed:
        @modelcontextprotocol/sdk: ^1.0.0
        ajv: ^8.0.0
        glob: ^8.0.0

    Node.js Version

node -v
# Should be v14.0.0 or higher
