import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import util from 'util';

// Import Ajv for JSON Schema validation
import Ajv from 'ajv';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory constants
const BACKUP_DIR = "E:\\Artificial Intelligence\\MCP\\file_change_backups";
const TEMP_DIR = path.join(BACKUP_DIR, "temp");

// Get allowed directories from command line arguments
const ALLOWED_DIRS = process.argv.slice(2).map(dir => path.resolve(dir));

// Directory descriptions
const DIRECTORY_DESCRIPTIONS = {
    "E:\\Artificial Intelligence\\MCP": "Main MCP development directory",
    "C:\\Users\\sheit\\AppData\\Roaming\\Claude": "Claude configuration directory",
    "C:\\Users\\sheit\\AppData\\Roaming\\Claude\\logs": "Claude log files",
    "E:\\ai": "AI projects directory",
    "C:\\Users\\sheit\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol": "Model Context Protocol Node Modules"
};

// Temporary file storage
const tempFiles = new Map();

// Helper Functions
async function initializeTempStorage() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    try {
        const files = await fs.readdir(TEMP_DIR);
        for (const file of files) {
            await fs.unlink(path.join(TEMP_DIR, file));
        }
    } catch (error) {
        console.error("Error cleaning temp directory:", error);
    }
}

async function createBackupPath(originalPath) {
    const fullPath = path.resolve(originalPath);
    let relativePath = null;
    for (const dir of ALLOWED_DIRS) {
        const dirResolved = path.resolve(dir);
        if (fullPath.startsWith(dirResolved)) {
            relativePath = fullPath.slice(dirResolved.length);
            if (relativePath.startsWith(path.sep)) {
                relativePath = relativePath.slice(1);
            }
            break;
        }
    }
    if (relativePath === null) {
        throw new Error("Invalid path for backup");
    }
    const backupPath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = Date.now(); // Use milliseconds since epoch
    const versionPath = `${backupPath}.${timestamp}`;
    return versionPath;
}

async function getFileHistory(filePath) {
    const fullPath = path.resolve(filePath);
    let relativePath = null;
    for (const dir of ALLOWED_DIRS) {
        const dirResolved = path.resolve(dir);
        if (fullPath.startsWith(dirResolved)) {
            relativePath = fullPath.slice(dirResolved.length);
            if (relativePath.startsWith(path.sep)) {
                relativePath = relativePath.slice(1);
            }
            break;
        }
    }
    if (relativePath === null) {
        return [];
    }
    const backupBasePath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupBasePath);
    const fileName = path.basename(backupBasePath);

    try {
        const files = await fs.readdir(backupDir);
        const backupFilenamePattern = new RegExp(`^${fileName}\\.(\\d+|\\d{4}-\\d{2}-\\d{2}T.*Z)$`);

        return files
            .map(f => {
                const match = f.match(backupFilenamePattern);
                if (!match) return null;
                const timestampStr = match[1];
                let timestamp;
                let timestampMs;

                if (/^\d+$/.test(timestampStr)) {
                    // Unix timestamp
                    timestampMs = parseInt(timestampStr, 10);
                    timestamp = new Date(timestampMs).toISOString();
                } else {
                    // ISO date string
                    timestamp = timestampStr;
                    timestampMs = Date.parse(timestamp);
                }

                return {
                    version: timestampStr,
                    timestamp: timestamp,
                    timestampMs: timestampMs,
                    path: path.join(backupDir, f)
                };
            })
            .filter(v => v !== null)
            .sort((a, b) => b.timestampMs - a.timestampMs);
    } catch (error) {
        return [];
    }
}

// Validate file path to prevent directory traversal
function validatePath(filePath) {
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    for (const dir of ALLOWED_DIRS) {
        const dirResolved = path.resolve(dir);
        const relative = path.relative(dirResolved, resolvedPath);
        if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
            return resolvedPath;
        }
    }
    return null;
}

// Load tool definitions
const TOOL_DEFINITIONS = [
    {
        name: "intellifs-list",
        description: "List files in a directory",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the directory to list" }
            }
        }
    },
    {
        name: "intellifs-read",
        description: "Read file content with line numbers and version history",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file to read" }
            },
            required: ["path"]
        }
    },
    {
        name: "intellifs-stream-write",
        description: "Stream content to a file with resume capability. Use for code editing and file modifications.",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file to write" },
                content: { type: "string", description: "Content to write to the file" },
                isComplete: { type: "boolean", description: "Whether the content streaming is complete" },
                isResume: { type: "boolean", description: "Whether to resume an incomplete write" },
                position: { type: "number", description: "Position to resume writing from" }
            },
            required: ["path", "content"]
        }
    },
    {
        name: "intellifs-patch",
        description: "Replace code between specified line numbers. Use line numbers from intellifs-read.",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file to patch" },
                startLine: { type: "number", description: "Starting line number of the code to replace" },
                endLine: { type: "number", description: "Ending line number of the code to replace" },
                newCode: { type: "string", description: "New code to insert between startLine and endLine" }
            },
            required: ["path", "startLine", "endLine", "newCode"]
        }
    },
    {
        name: "intellifs-commit",
        description: "Commit changes and finalize file write",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file to commit" }
            },
            required: ["path"]
        }
    },
    {
        name: "intellifs-info",
        description: "Get information about allowed directories, tool capabilities, and FAQs. Use the 'query' parameter to specify the type of information needed.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    enum: ["usage", "capabilities", "examples", "patterns", "faq"],
                    description: "Type of information to retrieve"
                }
            }
        }
    },
    {
        name: "intellifs-validate",
        description: "Validate command parameters and get descriptive responses.",
        inputSchema: {
            type: "object",
            properties: {
                command: { type: "string", description: "The command to validate." },
                parameters: { type: "object", description: "The parameters to validate." }
            },
            required: ["command", "parameters"]
        }
    },
    {
        name: "intellifs-help",
        description: "Provide help for a command.",
        inputSchema: {
            type: "object",
            properties: {
                command: { type: "string", description: "The command to get help for." }
            },
            required: ["command"]
        }
    },
    {
        name: "intellifs-search",
        description: "Search for files in allowed directories",
        inputSchema: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Glob pattern to search for files" },
                recursive: { type: "boolean", default: true, description: "Whether to search recursively" }
            },
            required: ["pattern"]
        }
    },
    {
        name: "intellifs-history",
        description: "View version history of a file",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" }
            },
            required: ["path"]
        }
    },
    {
        name: "intellifs-restore",
        description: "Restore a previous version of a file",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
                version: { type: "string", description: "Version identifier to restore" }
            },
            required: ["path", "version"]
        }
    },
    {
        name: "intellifs-search-content",
        description: "Search for files containing a specific string within their contents",
        inputSchema: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Glob pattern to search for files" },
                searchString: { type: "string", description: "String to search for within file contents" },
                recursive: { type: "boolean", default: true, description: "Whether to search recursively" }
            },
            required: ["pattern", "searchString"]
        }
    },
    {
        name: "intellifs-validate-syntax",
        description: "Validate the syntax of code in a file",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
                language: { type: "string", description: "Programming language of the code (e.g., 'python', 'javascript')" }
            },
            required: ["path", "language"]
        }
    }
];

// Initialize IntelliFS Server
const server = new Server({
    name: "IntelliFS",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    }
});

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS
}));

// Command Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "intellifs-list": {
                const { path: requestPath = "/" } = args;
                const fullPath = validatePath(requestPath);

                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid path within the allowed directories.");
                }

                const files = await fs.readdir(fullPath, { withFileTypes: true });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            files: files.map(file => ({
                                name: file.name,
                                type: file.isDirectory() ? "directory" : "file",
                                path: path.join(requestPath, file.name)
                            }))
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-read": {
                const { path: filePath } = args;
                if (!filePath) {
                    throw new Error("Path is required.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                // Check for pending changes
                const tempFileName = path.basename(filePath).replace(/\W/g, '_') + '.temp';
                const tempPath = path.join(TEMP_DIR, tempFileName);
                let content;

                try {
                    // If temp file exists, read from it
                    content = await fs.readFile(tempPath, "utf-8");
                } catch (error) {
                    // If no temp file, read from the actual file
                    content = await fs.readFile(fullPath, "utf-8");
                }

                const lines = content.split('\n');
                const numberedLines = lines.map((line, index) => ({
                    lineNumber: index + 1,
                    code: line
                }));
                const history = await getFileHistory(fullPath);

                // Indicate if content is from temp file
                const isPending = tempFiles.has(filePath);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            content: numberedLines,
                            versions: history.map(version => ({
                                version: version.version,
                                timestamp: version.timestamp,
                                path: version.path
                            })),
                            isPendingChanges: isPending
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-stream-write": {
                const { path: filePath, content, isComplete = false, isResume = false, position = 0 } = args;

                if (!filePath) {
                    throw new Error("Path is required.");
                }

                let fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                const tempFileName = path.basename(filePath).replace(/\W/g, '_') + '.temp';
                const tempPath = path.join(TEMP_DIR, tempFileName);

                try {
                    // Create directories if they don't exist
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });

                    // Check if the file exists; if not, create it
                    try {
                        await fs.access(fullPath);
                    } catch (err) {
                        await fs.writeFile(fullPath, '');
                    }

                    // Check for existing incomplete write
                    const incompleteWriteExists = tempFiles.has(filePath);

                    if (incompleteWriteExists && !isResume) {
                        // Read last 5 lines from temp file
                        const tempContent = await fs.readFile(tempPath, "utf-8");
                        const tempLines = tempContent.split('\n');
                        const lastLines = tempLines.slice(-5).join('\n');

                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    status: "interrupted",
                                    message: "Previous code generation was interrupted. Do you want to resume from the last point?",
                                    lastLines: lastLines,
                                    position: tempFiles.get(filePath).position,
                                    suggestedAction: "Provide 'isResume': true and 'position' to continue."
                                }, null, 2)
                            }]
                        };
                    }

                    // Handle resume or new write
                    if (isResume || incompleteWriteExists) {
                        // Append content to temp file
                        const currentPosition = tempFiles.get(filePath)?.position || 0;

                        const positionDifference = Math.abs(position - currentPosition);

                        if (positionDifference > 5) {
                            throw new Error(`Position mismatch. Expected position around ${currentPosition}, but got ${position}. Acceptable difference is 5 characters.`);
                        }

                        await fs.appendFile(tempPath, content);
                        tempFiles.get(filePath).position = currentPosition + content.length;
                    } else {
                        // Start new temp file
                        await fs.writeFile(tempPath, content);
                        tempFiles.set(filePath, {
                            position: content.length,
                            previousContent: await fs.readFile(fullPath, "utf-8")
                        });
                    }

                    if (isComplete) {
                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    status: "ready_to_commit",
                                    message: "Content complete, ready for commit",
                                    position: tempFiles.get(filePath).position
                                })
                            }]
                        };
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "in_progress",
                                position: tempFiles.get(filePath).position,
                                message: "Content streamed successfully"
                            })
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error: ${error.message}`
                        }],
                        isError: true
                    };
                }
            }

            case "intellifs-patch": {
                const { path: filePath, startLine, endLine, newCode } = args;

                if (!filePath || typeof startLine !== 'number' || typeof endLine !== 'number' || !newCode) {
                    throw new Error("Path, startLine, endLine, and newCode are required.");
                }

                if (startLine > endLine) {
                    throw new Error("startLine must be less than or equal to endLine.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                try {
                    // Read existing file content
                    const content = await fs.readFile(fullPath, "utf-8");
                    const lines = content.split('\n');

                    // Verify line numbers
                    if (startLine < 1 || endLine > lines.length) {
                        throw new Error("Line numbers out of range. Please ensure startLine and endLine are within the file's line count.");
                    }

                    // Create backup
                    const backupPath = await createBackupPath(fullPath);
                    await fs.writeFile(backupPath, content);

                    // Replace code section
                    const newLines = newCode.split('\n');
                    lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);

                    // Write updated content
                    const updatedContent = lines.join('\n');
                    await fs.writeFile(fullPath, updatedContent);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "success",
                                message: `Code replaced successfully from line ${startLine} to ${endLine}.`,
                                backup: path.basename(backupPath)
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error: ${error.message}`
                        }],
                        isError: true
                    };
                }
            }

            case "intellifs-commit": {
                const { path: filePath } = args;

                if (!filePath) {
                    throw new Error("Path is required.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                const tempFileName = path.basename(filePath).replace(/\W/g, '_') + '.temp';
                const tempPath = path.join(TEMP_DIR, tempFileName);

                try {
                    if (!tempFiles.has(filePath)) {
                        throw new Error("No pending changes to commit for this file.");
                    }

                    const fileInfo = tempFiles.get(filePath);
                    const backupPath = await createBackupPath(fullPath);
                    await fs.writeFile(backupPath, fileInfo.previousContent);

                    const content = await fs.readFile(tempPath, "utf-8");
                    await fs.writeFile(fullPath, content);

                    await fs.unlink(tempPath);
                    tempFiles.delete(filePath);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "committed",
                                message: "Changes committed successfully.",
                                backup: path.basename(backupPath)
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error: ${error.message}`
                        }],
                        isError: true
                    };
                }
            }

            case "intellifs-info": {
                const { query } = args;

                if (query === "usage") {
                    const usageInfo = TOOL_DEFINITIONS.reduce((acc, tool) => {
                        acc[tool.name] = {
                            description: tool.description,
                            parameters: tool.inputSchema.properties,
                            required: tool.inputSchema.required || []
                        };
                        return acc;
                    }, {});

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ commands: usageInfo }, null, 2)
                        }]
                    };
                } else if (query === "capabilities") {
                    const capabilities = TOOL_DEFINITIONS.map(tool => ({
                        name: tool.name,
                        description: tool.description
                    }));

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ capabilities }, null, 2)
                        }]
                    };
                } else if (query === "examples") {
                    const examples = {
                        "intellifs-read": {
                            command: "intellifs-read",
                            arguments: { path: "example.js" }
                        },
                        "intellifs-patch": {
                            command: "intellifs-patch",
                            arguments: {
                                path: "example.js",
                                startLine: 1,
                                endLine: 5,
                                newCode: "// New code here"
                            }
                        }
                    };

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ examples }, null, 2)
                        }]
                    };
                } else if (query === "patterns") {
                    const patterns = {
                        modifyCode: [
                            { step: 1, command: "intellifs-read", purpose: "Get current content with line numbers" },
                            { step: 2, command: "intellifs-patch", purpose: "Replace specific lines" },
                            { step: 3, command: "intellifs-commit", purpose: "Save changes" }
                        ]
                    };

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ patterns }, null, 2)
                        }]
                    };
                } else if (query === "faq") {
                    const faq = {
                        "Getting Started": [
                            {
                                question: "How do I read a file with line numbers?",
                                answer: "Use the 'intellifs-read' command with the 'path' parameter to get the file content along with line numbers."
                            },
                            {
                                question: "How can I list files in a directory?",
                                answer: "Use the 'intellifs-list' command with the 'path' parameter to list files and directories."
                            }
                        ],
                        "File Operations": [
                            {
                                question: "How do I replace code between specific lines?",
                                answer: "Use the 'intellifs-patch' command with 'path', 'startLine', 'endLine', and 'newCode' parameters."
                            },
                            {
                                question: "How do I commit changes after editing a file?",
                                answer: "Use the 'intellifs-commit' command with the 'path' parameter to finalize your changes."
                            },
                            {
                                question: "How can I validate the syntax of my code?",
                                answer: "Use the 'intellifs-validate-syntax' command with 'path' and 'language' parameters."
                            }
                        ],
                        "Troubleshooting": [
                            {
                                question: "I get an 'Invalid path' error. What should I do?",
                                answer: "Ensure that the 'path' parameter points to a valid location within the allowed directories."
                            },
                            {
                                question: "My line numbers seem off. How can I fix this?",
                                answer: "Make sure you've read the latest version of the file using 'intellifs-read' before patching."
                            }
                        ]
                    };

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ faq }, null, 2)
                        }]
                    };
                } else {
                    // Default behavior: provide directory info
                    const dirInfo = await Promise.all(
                        Object.entries(DIRECTORY_DESCRIPTIONS).map(async ([dirPath, description]) => {
                            try {
                                const stats = await fs.stat(dirPath);
                                return {
                                    path: dirPath,
                                    description,
                                    exists: true,
                                    isDirectory: stats.isDirectory(),
                                    size: stats.size,
                                    modified: stats.mtime
                                };
                            } catch (error) {
                                return {
                                    path: dirPath,
                                    description,
                                    exists: false,
                                    error: error.message
                                };
                            }
                        })
                    );

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(dirInfo, null, 2)
                        }]
                    };
                }
            }

            case "intellifs-validate": {
                const { command, parameters } = args;

                if (!command || !parameters) {
                    throw new Error("Command and parameters are required.");
                }

                const toolDef = TOOL_DEFINITIONS.find(tool => tool.name === command);
                if (!toolDef) {
                    throw new Error(`Unknown command: ${command}. Please use a valid command.`);
                }

                const ajv = new Ajv({ allErrors: true });
                const validate = ajv.compile(toolDef.inputSchema);
                const valid = validate(parameters);

                if (valid) {
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                valid: true,
                                message: "Parameters are valid."
                            }, null, 2)
                        }]
                    };
                } else {
                    const suggestions = validate.errors.map(err => {
                        let suggestion = "";
                        if (err.keyword === 'required') {
                            suggestion = `The parameter '${err.params.missingProperty}' is required.`;
                        } else if (err.keyword === 'type') {
                            suggestion = `The parameter '${err.instancePath.slice(1)}' should be of type '${err.params.type}'.`;
                        } else if (err.keyword === 'enum') {
                            suggestion = `The parameter '${err.instancePath.slice(1)}' should be one of: ${err.params.allowedValues.join(', ')}.`;
                        } else {
                            suggestion = err.message;
                        }
                        return suggestion;
                    });

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                valid: false,
                                errors: validate.errors,
                                suggestions: suggestions,
                                example: {
                                    command: command,
                                    arguments: toolDef.inputSchema.example || {}
                                }
                            }, null, 2)
                        }],
                        isError: true
                    };
                }
            }

            case "intellifs-help": {
                const { command } = args;

                if (!command) {
                    throw new Error("Command is required.");
                }

                const toolDef = TOOL_DEFINITIONS.find(tool => tool.name === command);
                if (!toolDef) {
                    throw new Error(`Unknown command: ${command}. Please use a valid command.`);
                }

                const helpInfo = {
                    command: command,
                    description: toolDef.description,
                    parameters: toolDef.inputSchema.properties,
                    required: toolDef.inputSchema.required || [],
                    examples: toolDef.inputSchema.example ? [toolDef.inputSchema.example] : [],
                    workflows: {
                        modifyFile: [
                            {
                                step: 1,
                                command: "intellifs-read",
                                purpose: "Get current content with line numbers"
                            },
                            {
                                step: 2,
                                command: "intellifs-patch",
                                purpose: "Modify specific lines in the file"
                            },
                            {
                                step: 3,
                                command: "intellifs-commit",
                                purpose: "Save the changes to the file"
                            }
                        ]
                    },
                    commonIssues: [
                        "Ensure all required parameters are provided.",
                        "Validate paths using 'intellifs-validate' if necessary.",
                        "Check that line numbers are within the file's line count."
                    ],
                    relatedCommands: TOOL_DEFINITIONS
                        .filter(tool => tool.name !== command)
                        .map(tool => tool.name)
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(helpInfo, null, 2)
                    }]
                };
            }

            case "intellifs-search": {
                const { pattern, recursive = true } = args;
                const results = [];

                for (const dir of ALLOWED_DIRS) {
                    try {
                        const files = await glob(pattern, {
                            cwd: dir,
                            dot: false,
                            absolute: true,
                            nodir: true,
                            strict: false
                        });

                        results.push(...files.filter(file => validatePath(file)));
                    } catch (error) {
                        console.error(`Search error in ${dir}:`, error);
                    }
                }

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            pattern,
                            matches: results,
                            count: results.length
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-history": {
                const { path: filePath } = args;
                if (!filePath) {
                    throw new Error("Path is required.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                const history = await getFileHistory(fullPath);
                const stats = {
                    totalVersions: history.length,
                    lastModified: history.length > 0 ? history[0].timestamp : null,
                    backupLocation: path.dirname(history.length > 0 ? history[0].path : "")
                };

                const actions = {
                    restore: "Use 'intellifs-restore' with 'path' and 'version' to restore a previous version.",
                    compare: "Currently, comparing versions is not supported."
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            current: fullPath,
                            history: {
                                versions: history.map(version => ({
                                    version: version.version,
                                    timestamp: version.timestamp,
                                    path: version.path
                                })),
                                stats: stats,
                                actions: actions
                            }
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-restore": {
                const { path: filePath, version } = args;
                if (!filePath || !version) {
                    throw new Error("Path and version are required.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                const history = await getFileHistory(fullPath);
                const versionFile = history.find(v => v.version === version);

                if (!versionFile) {
                    throw new Error("Version not found. Please check the available versions using 'intellifs-history'.");
                }

                const currentContent = await fs.readFile(fullPath, "utf-8");
                const backupPath = await createBackupPath(fullPath);
                await fs.writeFile(backupPath, currentContent);

                const restoredContent = await fs.readFile(versionFile.path, "utf-8");
                await fs.writeFile(fullPath, restoredContent);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            message: "File restored successfully.",
                            restoredFrom: version,
                            currentVersionBackedUp: path.basename(backupPath)
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-search-content": {
                const { pattern, searchString, recursive = true } = args;
                const results = [];

                for (const dir of ALLOWED_DIRS) {
                    const files = await glob(pattern, {
                        cwd: dir,
                        dot: false,
                        absolute: true,
                        nodir: true,
                        strict: false
                    });

                    for (const file of files) {
                        const validPath = validatePath(file);
                        if (validPath) {
                            try {
                                const content = await fs.readFile(validPath, "utf-8");
                                if (content.includes(searchString)) {
                                    results.push(validPath);
                                }
                            } catch (error) {
                                // Handle read error
                            }
                        }
                    }
                }

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            searchString,
                            matches: results,
                            count: results.length
                        }, null, 2)
                    }]
                };
            }

            case "intellifs-validate-syntax": {
                const { path: filePath, language } = args;

                if (!filePath || !language) {
                    throw new Error("Path and language are required.");
                }

                const fullPath = validatePath(filePath);
                if (!fullPath) {
                    throw new Error("Invalid path. Please provide a valid file path within the allowed directories.");
                }

                // Read the content from the temporary file if it exists
                const tempFileName = path.basename(filePath).replace(/\W/g, '_') + '.temp';
                const tempPath = path.join(TEMP_DIR, tempFileName);
                let content;

                try {
                    content = await fs.readFile(tempPath, "utf-8");
                } catch (error) {
                    content = await fs.readFile(fullPath, "utf-8");
                }

                // Write content to a temp file for syntax checking
                const tempSyntaxFile = path.join(TEMP_DIR, `syntax_check${path.extname(filePath)}`);
                await fs.writeFile(tempSyntaxFile, content);

                try {
                    let command;
                    if (language.toLowerCase() === "python") {
                        command = `python -m py_compile "${tempSyntaxFile}"`;
                    } else if (language.toLowerCase() === "javascript") {
                        command = `node --check "${tempSyntaxFile}"`;
                    } else {
                        throw new Error("Unsupported language for syntax validation. Supported languages are: python, javascript.");
                    }

                    await execAsync(command);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "valid",
                                message: "Syntax is valid."
                            })
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "invalid",
                                message: "Syntax errors found.",
                                errors: error.stderr || error.message
                            })
                        }],
                        isError: true
                    };
                } finally {
                    // Clean up the temp syntax file
                    await fs.unlink(tempSyntaxFile);
                }
            }

            default:
                throw new Error(`Unknown tool: ${name}. Please use a valid tool.`);
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error: ${error.message}`
            }],
            isError: true
        };
    }
});

// Initialize and run server
async function runServer() {
    await initializeTempStorage();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("IntelliFS Server running on stdio 🚀");
    console.error("Allowed directories:", ALLOWED_DIRS);
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
