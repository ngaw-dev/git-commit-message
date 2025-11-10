#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
 * Get detailed diff information for Llama prompt
 */
function getDetailedDiff() {
  try {
    const output = execSync('git diff --cached --unified=3', { encoding: 'utf8' });
    return output;
  } catch (error) {
    return '';
  }
}

/**
 * Check if local Llama server is available
 */
async function checkLlamaServer(host = 'localhost', port = '11434') {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: '/api/tags',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Generate commit message using local Llama model
 */
async function generateCommitMessageWithLlama(files, diff, options = {}) {
  const llamaAvailable = await checkLlamaServer();

  if (!llamaAvailable) {
    console.log('🤖 Local Llama server not found. Falling back to rule-based generation...\n');
    return null;
  }

  return new Promise((resolve, reject) => {
    // Create a detailed prompt for Llama
    const prompt = `You are an expert developer who writes excellent git commit messages.
Based on the following git diff information, generate a concise and descriptive commit message.

Files changed: ${files.join(', ')}

Git diff:
${diff.length > 2000 ? diff.substring(0, 2000) + '\n... (truncated)' : diff}

Guidelines:
- Keep the message under 72 characters
- Use present tense, imperative mood (e.g., "Add feature" not "Added feature")
- Start with a verb: Add, Fix, Update, Remove, Refactor, Improve, etc.
- Be specific but concise
- Focus on the "why" not just the "what"
- Don't include file names in the message unless absolutely necessary
- Don't end with a period

Generate only the commit message, nothing else:`;

    const requestData = JSON.stringify({
      model: options.llamaModel || 'llama3.2:3b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 100
      }
    });

    const ollamaOptions = {
      hostname: options.llamaHost || 'localhost',
      port: options.llamaPort || '11434',
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 15000
    };

    const req = http.request(ollamaOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.response) {
            const commitMessage = response.response.trim();
            // Clean up the response and ensure it's a good commit message
            const cleanedMessage = commitMessage
              .replace(/^["']|["']$/g, '') // Remove surrounding quotes
              .replace(/\.$/, '') // Remove trailing period
              .replace(/\n+/g, ' ') // Replace newlines with spaces
              .trim()
              .split('\n')[0]; // Take only the first line if there are multiple

            if (cleanedMessage.length > 0 && cleanedMessage.length < 100) {
              resolve(cleanedMessage);
            } else {
              console.log('🤖 Llama response was not suitable. Falling back to rule-based generation...\n');
              resolve(null);
            }
          } else {
            console.log('🤖 No response from Llama. Falling back to rule-based generation...\n');
            resolve(null);
          }
        } catch (error) {
          console.log('🤖 Error parsing Llama response. Falling back to rule-based generation...\n');
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log('🤖 Error connecting to Llama server. Falling back to rule-based generation...\n');
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('🤖 Llama request timed out. Falling back to rule-based generation...\n');
      resolve(null);
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Get available Llama models
 */
async function getAvailableModels(host = 'localhost', port = '11434') {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: '/api/tags',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.models || []);
        } catch (error) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    staged: args.includes('--staged') || args.includes('-s'),
    detailed: args.includes('--detailed') || args.includes('-d'),
    help: args.includes('--help') || args.includes('-h'),
    llama: args.includes('--llama') || args.includes('-l'),
    llamaModel: getArgValue(args, '--model') || getArgValue(args, '-m'),
    llamaHost: getArgValue(args, '--host'),
    llamaPort: getArgValue(args, '--port'),
    listModels: args.includes('--list-models')
  };

  if (options.help) {
    console.log(`
Usage: node git-commit-message.js [options]

Options:
  -v, --verbose       Show full file list in commit message
  -s, --staged        Only check staged files (default)
  -d, --detailed      Generate more detailed commit message
  -l, --llama         Use local Llama model for message generation
  -m, --model <name>  Specify Llama model (default: llama3.2:3b)
  --host <host>       Llama server host (default: localhost)
  --port <port>       Llama server port (default: 11434)
  --list-models       List available Llama models
  -h, --help          Show this help message

Examples:
  node git-commit-message.js
  node git-commit-message.js --llama
  node git-commit-message.js --llama --model llama3.2:1b
  node git-commit-message.js --verbose --llama
  node git-commit-message.js --list-models

Note: Requires Ollama with Llama models running locally.
Install Ollama: https://ollama.com/download
Start Ollama: ollama serve
Pull model: ollama pull llama3.2:3b
`);
    process.exit(0);
  }

  if (options.listModels) {
    const models = await getAvailableModels(options.llamaHost, options.llamaPort);
    if (models.length > 0) {
      console.log('\n🦙 Available Llama models:');
      models.forEach(model => {
        console.log(`  • ${model.name} (${model.size})`);
      });
      console.log('\nUse with: --model <model-name>');
    } else {
      console.log('❌ No Llama server found. Make sure Ollama is running: ollama serve');
    }
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
  const diff = getDetailedDiff();

  console.log(`🔍 Analyzing ${files.length} staged file${files.length > 1 ? 's' : ''}...`);

  let commitMessage;
  let usedLlama = false;

  // Try to generate message with Llama if requested
  if (options.llama) {
    console.log('🦙 Generating commit message with local Llama...');
    const llamaMessage = await generateCommitMessageWithLlama(files, diff, options);
    if (llamaMessage) {
      commitMessage = llamaMessage;
      usedLlama = true;
      console.log('✨ Llama-generated message ready!');
    }
  }

  // Fallback to rule-based generation
  if (!commitMessage) {
    const categories = categorizeFiles(files);
    if (options.detailed) {
      const action = getDetailedCommitMessage(options);
      const subject = generateCommitMessage(categories, options);
      commitMessage = `${action}: ${subject}`;
    } else {
      commitMessage = generateCommitMessage(categories, options);
    }
    console.log('📝 Rule-based message generated');
  }

  // Capitalize first letter
  commitMessage = commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);

  console.log(`\n📝 Generated commit message (${usedLlama ? '🦙 Llama' : '🔧 Rule-based'}):`);
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
          console.log(`✅ Commit created successfully! ${usedLlama ? '🦙' : '🔧'}`);
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

/**
 * Get argument value from command line args
 */
function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
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