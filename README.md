# Git Commit Message Generator

A Node.js script that analyzes staged file changes and automatically generates appropriate commit messages using AI (local Ollama models) or rule-based approaches.

## Features

- 🦙 **AI-Powered Messages**: Generate natural commit messages using local AI models via Ollama
- 🔍 **Smart File Analysis**: Categorizes files by type (code, config, docs, tests, styles, scripts)
- 📝 **Automatic Message Generation**: Creates descriptive commit messages based on changes
- 🎯 **Staged Changes Only**: Analyzes only staged files for precise commits
- 📊 **Detailed Mode**: Optional detailed commit messages with action verbs
- 🔧 **CLI Options**: Flexible command-line interface
- 💬 **Interactive Mode**: Confirms before committing (TTY environments)
- 🔄 **Fallback System**: Automatically falls back to rule-based generation if AI is unavailable
- 🎛️ **Model Selection**: Choose from available local Ollama models

## Installation

### Prerequisites

1. **Node.js** (version 12+)
2. **Ollama** (for AI-powered messages) - [Download Ollama](https://ollama.com/download)

### Ollama Setup (for AI features)

```bash
# Install Ollama (follow instructions at https://ollama.com/download)

# Start Ollama server
ollama serve

# Pull an AI model (recommended options)
ollama pull deepseek-r1:latest
ollama pull gemma3n:latest
ollama pull llama2:latest

# List available models
ollama list
```

### Script Setup

1. Clone or download the script
2. Make sure you have Node.js installed (version 12+)
3. The script is ready to use - no external npm dependencies required

## Usage

### Basic Usage

```bash
# Run with rule-based generation
node git-commit-message.js

# Run with AI-powered generation (requires Ollama)
node git-commit-message.js --ollama

# List available Ollama models
node git-commit-message.js --list-models
```

### Command Line Options

```bash
# Rule-based options
node git-commit-message.js --verbose          # Show file details
node git-commit-message.js --detailed         # Detailed messages
node git-commit-message.js --verbose --detailed

# AI-powered options
node git-commit-message.js --ollama            # Use local Ollama model
node git-commit-message.js --ollama --model gemma3n:latest  # Specific model
node git-commit-message.js --ollama --host localhost        # Custom host
node git-commit-message.js --ollama --port 11434          # Custom port

# Utility
node git-commit-message.js --list-models      # List available models
node git-commit-message.js --help             # Show help
```

### Short Options

```bash
node git-commit-message.js -v          # Same as --verbose
node git-commit-message.js -d          # Same as --detailed
node git-commit-message.js -o          # Same as --ollama
node git-commit-message.js -m <model>  # Same as --model
node git-commit-message.js -h          # Same as --help
```

## How It Works

### Rule-Based Generation
1. **File Detection**: Scans for staged files using `git diff --cached --name-only`
2. **Categorization**: Groups files by type:
   - **Code**: `.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.java`, `.cpp`, `.c`, etc.
   - **Config**: `.json`, `.yml`, `.yaml`, `.toml`, `.env`, package files, etc.
   - **Docs**: `.md`, `.txt`, `.rst`, README files, etc.
   - **Tests**: Files containing "test" or "spec" in their name
   - **Styles**: `.css`, `.scss`, `.sass`, `.less`, `.vue`, `.svelte`
   - **Scripts**: `.sh`, `.bash`, `.zsh`, `.fish`, executable files
   - **Other**: Files that don't fit other categories

3. **Message Generation**: Creates commit messages like:
   - "Update 3 code files, 2 configuration files"
   - "Update documentation, test file"
   - "Add: Enhance source code file, update stylesheet"

### AI-Powered Generation (Ollama)
1. **Diff Analysis**: Extracts detailed diff content using `git diff --cached --unified=3`
2. **Context Prompting**: Creates a structured prompt with:
   - File list
   - Git diff content (truncated if too long)
   - Commit message guidelines
3. **AI Processing**: Sends prompt to local AI model via Ollama API
4. **Response Cleaning**: Processes and validates the AI response
5. **Quality Check**: Ensures message meets length and format requirements

### Fallback System
- Automatically falls back to rule-based generation if:
  - Ollama server is not running
  - Network connection fails
  - AI response is invalid or too long
  - Request times out

## Examples

### Example 1: Code Changes (Rule-based)
```bash
# After staging some JavaScript and CSS files
$ git add src/app.js src/utils.js styles/main.css
$ node git-commit-message.js

🔍 Analyzing 3 staged files...
📝 Rule-based message generated

📝 Generated commit message (🔧 Rule-based):
"Update 2 source code file, 1 stylesheet"

Use this message? (Y/n): y
✅ Commit created successfully! 🔧
```

### Example 2: AI-Powered Generation
```bash
# After implementing a new feature
$ git add src/user-auth.js tests/auth.test.js
$ node git-commit-message.js --ollama

🔍 Analyzing 2 staged files...
🦙 Generating commit message with local Ollama...
✨ Ollama-generated message ready!

📝 Generated commit message (🦙 Ollama):
"Add user authentication with comprehensive test coverage"

Use this message? (Y/n): y
✅ Commit created successfully! 🦙
```

### Example 3: Documentation Update
```bash
# After updating documentation
$ git add README.md CHANGELOG.md
$ node git-commit-message.js --verbose

🔍 Analyzing 2 staged files...
📝 Rule-based message generated

📝 Generated commit message (🔧 Rule-based):
"Update documentation (README.md, CHANGELOG.md)"

Use this message? (Y/n): y
✅ Commit created successfully! 🔧
```

### Example 4: Model Selection
```bash
# List available models
$ node git-commit-message.js --list-models

🦙 Available Ollama models:
  • deepseek-r1:latest (5.2 GB)
  • gemma3n:latest (7.5 GB)

Use with: --model <model-name>

# Use specific model
$ git add src/api.js
$ node git-commit-message.js --ollama --model llama2:latest

🔍 Analyzing 1 staged file...
🦙 Generating commit message with local Ollama...
✨ Ollama-generated message ready!

📝 Generated commit message (🦙 Ollama):
"Implement REST API endpoints for data management"

Use this message? (Y/n): y
✅ Commit created successfully! 🦙
```

### Example 5: Fallback Behavior
```bash
# When Ollama is not running
$ git add package.json
$ node git-commit-message.js --ollama

🔍 Analyzing 1 staged file...
🦙 Generating commit message with local Ollama...
🤖 Ollama server not found. Falling back to rule-based generation...
📝 Rule-based message generated

📝 Generated commit message (🔧 Rule-based):
"Update configuration"

Use this message? (Y/n): y
✅ Commit created successfully! 🔧
```

## Integration with Git Workflow

### Git Alias (Recommended)

Add this to your `~/.gitconfig` file:

```ini
[alias]
    commit-msg = "!node /path/to/git-commit-message.js"
    commit-ai = "!node /path/to/git-commit-message.js --ollama"
    commit-verbose = "!node /path/to/git-commit-message.js --verbose"
```

Then you can use:
```bash
git commit-msg          # Rule-based
git commit-ai           # AI-powered
git commit-verbose      # Verbose rule-based
```

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "commit": "node git-commit-message.js",
    "commit-ai": "node git-commit-message.js --ollama",
    "commit-detailed": "node git-commit-message.js --detailed --ollama"
  }
}
```

Usage:
```bash
npm run commit
npm run commit-ai
npm run commit-detailed
```

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Generating AI commit message..."
node /path/to/git-commit-message.js --ollama
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### VS Code Integration

Add to your `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Git Commit (AI)",
      "type": "shell",
      "command": "node",
      "args": ["/path/to/git-commit-message.js", "--ollama"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

## Troubleshooting

### Ollama Issues

**Ollama server not running:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

**No models available:**
```bash
# Pull recommended models
ollama pull deepseek-r1:latest
ollama pull gemma3n:latest
ollama pull llama2:latest

# List available models
ollama list
```

**Port conflicts:**
```bash
# Use custom port
node git-commit-message.js --ollama --port 11435
```

### Script Issues

**Permission denied:**
```bash
chmod +x git-commit-message.js
```

**Node.js not found:**
```bash
# Install Node.js from https://nodejs.org/
# or use package manager:
brew install node  # macOS
sudo apt install nodejs npm  # Ubuntu
```

## Performance Tips

1. **Model Selection**: Use smaller models (`gemma3n:latest`) for faster responses
2. **Diff Size**: Large diffs are truncated to 2000 characters for performance
3. **Fallback**: Rule-based generation is always faster than AI generation
4. **Network**: Ensure Ollama server is responsive for best AI performance

## Output

The script provides:
- **🔍 File analysis progress** with file count
- **🦙 AI generation status** with model used
- **📝 Generated commit message** with method indicator
- **✅ Success feedback** with AI/Rule-based emoji indicator
- **🤖 Fallback notifications** when AI is unavailable

## Error Handling

- Checks if you're in a git repository
- Validates that files are staged
- Handles git command failures gracefully
- Provides helpful error messages
- Automatic fallback to rule-based generation
- Network timeout handling (15 seconds)
- AI response validation and cleaning

## Requirements

### Minimum Requirements
- Node.js 12.0.0 or higher
- Git repository
- Staged files (use `git add` first)

### For AI Features
- Ollama installed and running
- At least one AI model pulled
- Sufficient RAM for model (varies by model size)

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!

### Development
```bash
# Clone the repository
git clone https://github.com/yourusername/git-commit-message-generator.git
cd git-commit-message-generator

# Test the script
node git-commit-message.js --help
node git-commit-message.js --list-models
```