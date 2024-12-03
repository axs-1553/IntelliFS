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

## 📚 Command Reference

### Core Commands

#### `intellifs-list`
- **Purpose:** List directory contents
- **Required:** `path`
- **Optional:** `recursive`
- **Example:**
  ```json
  {
    "command": "intellifs-list",
    "arguments": {
      "path": "/my/directory"
    }
  }

intellifs-read

    Purpose: Read file with line numbers
    Required: path
    Example:

    
    {
      "command": "intellifs-read",
      "arguments": {
        "path": "example.js"
      }
    }

intellifs-stream-write

    Purpose: Stream content to file
    Required: path, content
    Optional: isComplete, isResume, position
    Example:

    
    {
      "command": "intellifs-stream-write",
      "arguments": {
        "path": "example.js",
        "content": "// Code here",
        "isComplete": false
      }
    }

intellifs-commit

    Purpose: Commit changes
    Required: path
    Example:

    
    {
      "command": "intellifs-commit",
      "arguments": {
        "path": "example.js"
      }
    }

Advanced Commands
intellifs-patch

    Purpose: Replace code sections
    Required: path, startLine, endLine, newCode
    Example:

    
    {
      "command": "intellifs-patch",
      "arguments": {
        "path": "example.js",
        "startLine": 10,
        "endLine": 15,
        "newCode": "// New code here"
      }
    }

intellifs-validate-syntax

    Purpose: Validate code syntax
    Required: path, language
    Example:

    
    {
      "command": "intellifs-validate-syntax",
      "arguments": {
        "path": "example.js",
        "language": "javascript"
      }
    }

intellifs-search-content

    Purpose: Search in file contents
    Required: pattern, searchString
    Optional: recursive
    Example:

    
    {
      "command": "intellifs-search-content",
      "arguments": {
        "pattern": "*.js",
        "searchString": "function"
      }
    }

intellifs-history

    Purpose: View file history
    Required: path
    Example:

    
    {
      "command": "intellifs-history",
      "arguments": {
        "path": "example.js"
      }
    }

intellifs-restore

    Purpose: Restore previous versions
    Required: path, version
    Example:

    
    {
      "command": "intellifs-restore",
      "arguments": {
        "path": "example.js",
        "version": "1234567890"
      }
    }

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
