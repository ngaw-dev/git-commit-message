#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Get staged files from git
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.error('Error getting staged files:', error.message);
    return [];
  }
}

/**
 * Get git status for all files
 */
function getGitStatus() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    console.error('Error getting git status:', error.message);
    return [];
  }
}

/**
 * Categorize files by type
 */
function categorizeFiles(files) {
  const categories = {
    code: [],
    config: [],
    docs: [],
    tests: [],
    styles: [],
    scripts: [],
    other: []
  };

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file).toLowerCase();

    // Code files
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'].includes(ext)) {
      categories.code.push(file);
    }
    // Configuration files
    else if (['.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.env', '.lock', '.md'].includes(ext) ||
             basename.includes('package') || basename.includes('config') || basename.includes('.git')) {
      categories.config.push(file);
    }
    // Documentation
    else if (['.md', '.txt', '.rst', '.adoc'].includes(ext) ||
             basename.includes('readme') || basename.includes('doc') || basename.includes('changelog')) {
      categories.docs.push(file);
    }
    // Test files
    else if (basename.includes('test') || basename.includes('spec') || ext === '.test.js' || ext === '.spec.js') {
      categories.tests.push(file);
    }
    // Style files
    else if (['.css', '.scss', '.sass', '.less', '.styl', '.vue', '.svelte'].includes(ext)) {
      categories.styles.push(file);
    }
    // Script files
    else if (['.sh', '.bash', '.zsh', '.fish', '.py', '.pl'].includes(ext)) {
      categories.scripts.push(file);
    }
    // Other
    else {
      categories.other.push(file);
    }
  });

  return categories;
}

/**
 * Generate commit message based on file categories
 */
function generateCommitMessage(categories, options = {}) {
  const messages = [];

  // Function to add category messages
  const addCategoryMessage = (category, categoryName, verb, adjective = '') => {
    if (category.length === 0) return;

    const count = category.length;
    const fileList = options.verbose ? ` (${category.join(', ')})` : '';
    const adj = adjective ? `${adjective} ` : '';

    if (count === 1) {
      messages.push(`${verb} ${adj}${categoryName}${fileList}`);
    } else {
      messages.push(`${verb} ${count} ${categoryName}${fileList}`);
    }
  };

  // Add messages for each category
  addCategoryMessage(categories.code, 'code file', 'Update', 'source');
  addCategoryMessage(categories.config, 'configuration', 'Update');
  addCategoryMessage(categories.docs, 'documentation', 'Update');
  addCategoryMessage(categories.tests, 'test', 'Update');
  addCategoryMessage(categories.styles, 'stylesheet', 'Update');
  addCategoryMessage(categories.scripts, 'script', 'Update');
  addCategoryMessage(categories.other, 'file', 'Update');

  // If no specific categories, use generic message
  if (messages.length === 0) {
    return 'Update files';
  }

  return messages.join(', ');
}

/**
 * Get more detailed commit message based on git diff
 */
function getDetailedCommitMessage(options = {}) {
  try {
    // Get commit stats
    const statsOutput = execSync('git diff --cached --stat', { encoding: 'utf8' });
    const summary = execSync('git diff --cached --shortstat', { encoding: 'utf8' }).trim();

    // Parse additions and deletions
    const match = summary.match(/(\d+)\s+insertion\(+\),?\s*(\d+)\s+deletion\(-\)?/);
    const additions = match ? parseInt(match[1]) : 0;
    const deletions = match ? parseInt(match[2]) : 0;

    let type = 'Update';
    if (additions > 0 && deletions === 0) {
      type = 'Add';
    } else if (additions === 0 && deletions > 0) {
      type = 'Remove';
    } else if (additions > deletions * 2) {
      type = 'Enhance';
    } else if (deletions > additions * 2) {
      type = 'Simplify';
    }

    return type;
  } catch (error) {
    return 'Update';
  }
}

/**
 * Check if there are staged changes
 */
function hasStagedChanges() {
  try {
    const output = execSync('git diff --cached --stat', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    staged: args.includes('--staged') || args.includes('-s'),
    detailed: args.includes('--detailed') || args.includes('-d'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
Usage: node git-commit-message.js [options]

Options:
  -v, --verbose    Show full file list in commit message
  -s, --staged     Only check staged files (default)
  -d, --detailed   Generate more detailed commit message
  -h, --help       Show this help message

Examples:
  node git-commit-message.js
  node git-commit-message.js --verbose
  node git-commit-message.js --detailed
  node git-commit-message.js --verbose --detailed
`);
    process.exit(0);
  }

  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Not in a git repository');
    process.exit(1);
  }

  // Check for staged changes
  if (!hasStagedChanges()) {
    console.log('No staged changes found. Please stage some files first.');
    console.log('Use "git add <files>" to stage changes.');
    process.exit(1);
  }

  const files = getStagedFiles();
  const categories = categorizeFiles(files);

  let commitMessage;

  if (options.detailed) {
    const action = getDetailedCommitMessage(options);
    const subject = generateCommitMessage(categories, options);
    commitMessage = `${action}: ${subject}`;
  } else {
    commitMessage = generateCommitMessage(categories, options);
  }

  // Capitalize first letter
  commitMessage = commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);

  console.log('\n📝 Generated commit message:');
  console.log(`"${commitMessage}"\n`);

  // Ask if user wants to use this message
  if (process.stdout.isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Use this message? (Y/n): ', (answer) => {
      if (answer.toLowerCase() === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
          console.log('✅ Commit created successfully!');
        } catch (error) {
          console.error('❌ Error creating commit:', error.message);
        }
      } else {
        console.log('Commit cancelled. You can use the message manually:');
        console.log(`git commit -m "${commitMessage}"`);
      }
      rl.close();
    });
  } else {
    // Non-interactive mode - just show the message
    console.log('To commit with this message, run:');
    console.log(`git commit -m "${commitMessage}"`);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getStagedFiles,
  categorizeFiles,
  generateCommitMessage,
  getDetailedCommitMessage,
  hasStagedChanges
};