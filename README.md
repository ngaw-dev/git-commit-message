# Git Commit Message Generator

A Node.js script that analyzes staged file changes and automatically generates appropriate commit messages based on the types of files modified.

## Features

- 🔍 **Smart File Analysis**: Categorizes files by type (code, config, docs, tests, styles, scripts)
- 📝 **Automatic Message Generation**: Creates descriptive commit messages based on changes
- 🎯 **Staged Changes Only**: Analyzes only staged files for precise commits
- 📊 **Detailed Mode**: Optional detailed commit messages with action verbs
- 🔧 **CLI Options**: Flexible command-line interface
- 💬 **Interactive Mode**: Confirms before committing (TTY environments)

## Installation

1. Clone or download the script
2. Make sure you have Node.js installed (version 12+)
3. The script is ready to use - no external dependencies required

## Usage

### Basic Usage

```bash
# Run the script
node git-commit-message.js
```

### Command Line Options

```bash
# Show file details in commit message
node git-commit-message.js --verbose

# Generate detailed commit messages with action verbs
node git-commit-message.js --detailed

# Combine options
node git-commit-message.js --verbose --detailed

# Show help
node git-commit-message.js --help
```

### Short Options

```bash
node git-commit-message.js -v          # Same as --verbose
node git-commit-message.js -d          # Same as --detailed
node git-commit-message.js -h          # Same as --help
```

## How It Works

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

## Examples

### Example 1: Code Changes
```bash
# After staging some JavaScript and CSS files
$ git add src/app.js src/utils.js styles/main.css
$ node git-commit-message.js

📝 Generated commit message:
"Update 2 source code file, 1 stylesheet"

Use this message? (Y/n): y
✅ Commit created successfully!
```

### Example 2: Documentation Update
```bash
# After updating documentation
$ git add README.md CHANGELOG.md
$ node git-commit-message.js --verbose

📝 Generated commit message:
"Update documentation (README.md, CHANGELOG.md)"

Use this message? (Y/n): y
✅ Commit created successfully!
```

### Example 3: Detailed Mode
```bash
# After making significant additions
$ git add src/new-feature.js tests/new-feature.test.js
$ node git-commit-message.js --detailed

📝 Generated commit message:
"Add: Enhance source code file, update test file"

Use this message? (Y/n): y
✅ Commit created successfully!
```

## Integration with Git Workflow

### Git Alias (Recommended)

Add this to your `~/.gitconfig` file:

```ini
[alias]
    commit-msg = "!node /path/to/git-commit-message.js"
```

Then you can use:
```bash
git commit-msg
```

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node /path/to/git-commit-message.js --staged
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Output

The script provides:
- **Generated commit message** in quotes
- **Interactive confirmation** in TTY environments
- **Manual commit command** if cancelled
- **Success/error feedback**

## Error Handling

- Checks if you're in a git repository
- Validates that files are staged
- Handles git command failures gracefully
- Provides helpful error messages

## Requirements

- Node.js 12.0.0 or higher
- Git repository
- Staged files (use `git add` first)

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!