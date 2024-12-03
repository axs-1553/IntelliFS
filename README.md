# IntelliFS 🚀
> An intelligent filesystem server with advanced code management capabilities

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🎯 Overview

IntelliFS extends the Model Context Protocol (MCP) with advanced filesystem capabilities designed for AI-assisted development. It provides seamless integration between AI tools and your local filesystem.

## ✨ Features

| Category | Features | Description |
|----------|----------|-------------|
| 📝 Code Management | Line-Based Editing<br>Syntax Validation<br>Pattern Matching | Edit specific line ranges<br>Validate Python/JavaScript syntax<br>Find and replace code patterns |
| 🔄 Version Control | Auto-Backups<br>History Tracking<br>Point-in-Time Restore | Automatic version creation<br>Track all file changes<br>Restore previous versions |
| 📊 Content Operations | Streaming Writes<br>Resume Capability<br>Content Search | Stream large files<br>Resume interrupted writes<br>Search file contents |
| 🛡️ Security | Path Validation<br>Directory Control<br>Safe Operations | Prevent traversal attacks<br>Limit accessible directories<br>Safe file operations |

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|----------|
| Node.js | ≥ 14.0.0 | Runtime environment |
| Python | ≥ 3.6 | Syntax validation (optional) |

### Installation

```bash
npm install @modelcontextprotocol/sdk ajv glob

Configuration
<details> <summary>📋 Claude Desktop Configuration</summary>

json
{
  "intellifs": {
    "command": "node",
    "args": [
      "path/to/intellifs.js",
      "allowed/directory/1",
      "allowed/directory/2"
    ],
    "type": "module"
  }
}

</details>
📚 Command Reference
Core Commands
Command	Purpose	Required Args	Optional Args
intellifs-list	List directory contents	path	recursive
intellifs-read	Read file with line numbers	path	-
intellifs-stream-write	Stream content to file	path, content	isComplete, isResume, position
intellifs-commit	Commit changes	path	-
Advanced Commands
Command	Purpose	Required Args	Optional Args
intellifs-patch	Replace code sections	path, startLine, endLine, newCode	-
intellifs-validate-syntax	Validate code syntax	path, language	-
intellifs-search-content	Search in file contents	pattern, searchString	recursive
intellifs-history	View file history	path	-
intellifs-restore	Restore previous versions	path, version	-
📝 Usage Examples
<details> <summary>Stream Writing with Resume</summary>

javascript
// Initial Write
{
  "command": "intellifs-stream-write",
  "arguments": {
    "path": "example.js",
    "content": "// Initial content\nfunction hello() {",
    "isComplete": false
  }
}

// Resume After Interruption
{
  "command": "intellifs-stream-write",
  "arguments": {
    "path": "example.js",
    "content": "  console.log('Hello!');\n}",
    "isResume": true,
    "position": 42,
    "isComplete": true
  }
}

// Commit Changes
{
  "command": "intellifs-commit",
  "arguments": {
    "path": "example.js"
  }
}

</details> <details> <summary>Code Patching</summary>

javascript
// Read File
{
  "command": "intellifs-read",
  "arguments": {
    "path": "example.js"
  }
}

// Patch Code
{
  "command": "intellifs-patch",
  "arguments": {
    "path": "example.js",
    "startLine": 10,
    "endLine": 15,
    "newCode": "// New implementation\nfunction newFeature() {\n  return 'Enhanced!';\n}"
  }
}

</details>
🔒 Security Features
Feature	Description	Configuration
Path Validation	Prevents directory traversal attacks	Automatic
Allowed Directories	Restricts file operations to specified paths	Via command line args
Safe Operations	Validates all file operations	Automatic
Version Control	Creates backups before modifications	Automatic
🤝 Contributing
We welcome contributions! See our Contributing Guide for details.
Development Setup

bash
# Clone repository
git clone https://github.com/axs-1553/IntelliFS.git

# Install dependencies
cd IntelliFS
npm install

# Run tests
npm test

📄 License
MIT License - View License
🙋‍♂️ Support
Platform	Contact
GitHub Issues	Report a bug
Twitter	@axs1553
Discord	axs1553
