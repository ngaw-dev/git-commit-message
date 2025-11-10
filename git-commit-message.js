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
 * Generate commit message based on code analysis and file categories
 */
function generateCommitMessage(categories, codeAnalysis, options = {}) {
  // If we have code analysis patterns, use them for more specific messages
  if (codeAnalysis.patterns.length > 0) {
    const primaryPattern = codeAnalysis.patterns[0];

    // Combine with file category information
    const categoryParts = [];

    if (categories.code.length > 0 && codeAnalysis.functions.length > 0) {
      categoryParts.push(`${codeAnalysis.functions.length} function${codeAnalysis.functions.length > 1 ? 's' : ''}`);
    }
    if (categories.tests.length > 0 && codeAnalysis.tests.length > 0) {
      categoryParts.push(`${codeAnalysis.tests.length} test${codeAnalysis.tests.length > 1 ? 's' : ''}`);
    }
    if (codeAnalysis.imports.length > 0) {
      categoryParts.push('new imports');
    }
    if (codeAnalysis.types.length > 0) {
      categoryParts.push(`${codeAnalysis.types.length} type${codeAnalysis.types.length > 1 ? 's' : ''}`);
    }

    // Remove "Add" prefix from pattern action if we have specifics to add
    let action = primaryPattern.action;
    if (action.startsWith('Add ') && categoryParts.length > 0) {
      action = action.replace('Add ', '');
    }

    if (categoryParts.length > 0) {
      return `${action} with ${categoryParts.join(', ')}`;
    } else {
      return action;
    }
  }

  // Fallback to original category-based generation
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
 * Get detailed diff information for Ollama prompt
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
 * Analyze code changes in files
 */
function analyzeCodeChanges(files, diff) {
  const analysis = {
    patterns: [],
    functions: [],
    imports: [],
    tests: [],
    configs: [],
    types: [],
    summary: ''
  };

  // Analyze each file for specific patterns
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file).toLowerCase();

    // Function/method analysis
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c'].includes(ext)) {
      const functionPattern = diff.match(new RegExp(`[-+].*function\\s+(\\w+)\\s*\\(|[-+].*const\\s+(\\w+)\\s*=\\s*(?:\\([^)]*\\)\\s*=>|async\\s+\\([^)]*\\)\\s*=>)|[-+].*class\\s+(\\w+)|[-+].*def\\s+(\\w+)\\s*\\(`, 'g'));
      if (functionPattern) {
        functionPattern.forEach(match => {
          const funcMatch = match.match(/(?:function|const|class|def)\s+(\w+)/);
          if (funcMatch && !analysis.functions.includes(funcMatch[1])) {
            analysis.functions.push(funcMatch[1]);
          }
        });
      }
    }

    // Import/require analysis
    if (['.js', '.jsx', '.ts', '.tsx', '.py'].includes(ext)) {
      const importPattern = diff.match(new RegExp(`[-+].*(?:import|require|from)\\s+['"][^'"]+['"]|[-+].*import\\s+.*from\\s+['"][^'"]+['"]`, 'g'));
      if (importPattern) {
        importPattern.forEach(match => {
          if (match.startsWith('+')) {
            analysis.imports.push(match.replace(/^\+\s*/, ''));
          }
        });
      }
    }

    // Test pattern analysis
    if (basename.includes('test') || basename.includes('spec')) {
      const testPattern = diff.match(/\+.*(?:test|it|describe|expect)\s*\(/g);
      if (testPattern) {
        analysis.tests.push(...testPattern.map(m => m.replace(/^\+\s*/, '')));
      }
    }

    // Configuration analysis
    if (['.json', '.yml', '.yaml', '.toml', '.env'].includes(ext) || basename.includes('config')) {
      const configPattern = diff.match(/\+.*"[^"]+"\s*:\s*[^,}]+/g);
      if (configPattern) {
        analysis.configs.push(...configPattern.map(m => m.replace(/^\+\s*/, '').substring(0, 50)));
      }
    }

    // Type analysis (TypeScript)
    if (['.ts', '.tsx'].includes(ext)) {
      const typePattern = diff.match(/\+.*(?:interface|type|enum)\s+\w+/g);
      if (typePattern) {
        analysis.types.push(...typePattern.map(m => m.replace(/^\+\s*/, '')));
      }
    }
  });

  // Detect common patterns
  const patterns = [
    { pattern: /\+.*console\.log|console\.debug|console\.info/, type: 'debugging', action: 'Add debug logging' },
    { pattern: /\+.*TODO|FIXME|HACK/, type: 'todos', action: 'Add TODO comments' },
    { pattern: /\+.*export\s+(?:default\s+)?(?:class|function|const|var|let)/, type: 'exports', action: 'Add exports' },
    { pattern: /-.*console\.log|console\.debug|console\.info/, type: 'debugging', action: 'Remove debug logging' },
    { pattern: /\+.*eslint|prettier|stylelint/, type: 'linting', action: 'Add linting rules' },
    { pattern: /\+.*test|spec|describe|it|expect/, type: 'tests', action: 'Add test cases' },
    { pattern: /-.*test|spec|describe|it|expect/, type: 'tests', action: 'Remove test cases' },
    { pattern: /\+.*catch|try|throw\s+new\s+Error/, type: 'error-handling', action: 'Add error handling' },
    { pattern: /\+.*async|await|Promise|\.then\(|\.catch\(/
, type: 'async', action: 'Add async functionality' },
    { pattern: /\+.*fetch|axios|XMLHttpRequest|http\./, type: 'api', action: 'Add API calls' },
    { pattern: /\+.*useState|useEffect|useContext|useReducer/, type: 'react-hooks', action: 'Add React hooks' },
    { pattern: /\+.*Component|extends.*Component|React\.Component/, type: 'react-components', action: 'Add React components' },
    { pattern: /\+.*router|route|\/api\//, type: 'routing', action: 'Add routing' },
    { pattern: /\+.*mongoose|sequelize|prisma|sql/, type: 'database', action: 'Add database operations' },
    { pattern: /\+.*auth|jwt|bcrypt|passport/, type: 'authentication', action: 'Add authentication' },
    { pattern: /\+.*validation|validate|joi|yup/, type: 'validation', action: 'Add validation' }
  ];

  patterns.forEach(({ pattern, type, action }) => {
    if (pattern.test(diff)) {
      if (!analysis.patterns.find(p => p.type === type)) {
        analysis.patterns.push({ type, action });
      }
    }
  });

  // Generate summary
  const parts = [];
  if (analysis.functions.length > 0) {
    parts.push(`${analysis.functions.length} function${analysis.functions.length > 1 ? 's' : ''}`);
  }
  if (analysis.imports.length > 0) {
    parts.push(`${analysis.imports.length} import${analysis.imports.length > 1 ? 's' : ''}`);
  }
  if (analysis.tests.length > 0) {
    parts.push(`${analysis.tests.length} test${analysis.tests.length > 1 ? 's' : ''}`);
  }
  if (analysis.configs.length > 0) {
    parts.push('configuration changes');
  }
  if (analysis.types.length > 0) {
    parts.push(`${analysis.types.length} type${analysis.types.length > 1 ? 's' : ''}`);
  }

  analysis.summary = parts.length > 0 ? parts.join(', ') : 'code changes';

  return analysis;
}

/**
 * Check if local Ollama server is available and get available models
 */
async function checkOllamaServer(host = 'http://127.0.0.1', port = '11434') {
  return new Promise((resolve) => {
    // Handle null/undefined host and extract hostname from URL if it includes protocol
    const safeHost = host || 'http://127.0.0.1';
    const hostname = safeHost.includes('://') ? new URL(safeHost).hostname : safeHost;

    const options = {
      hostname: hostname,
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
          resolve({
            available: res.statusCode === 200,
            models: response.models || []
          });
        } catch (error) {
          resolve({ available: false, models: [] });
        }
      });
    });

    req.on('error', () => {
      resolve({ available: false, models: [] });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ available: false, models: [] });
    });

    req.end();
  });
}

/**
 * Generate commit message using local Ollama server
 */
async function generateCommitMessageWithOllama(files, diff, codeAnalysis, options = {}) {
  const ollamaStatus = await checkOllamaServer(options.ollamaHost, options.ollamaPort);

  if (!ollamaStatus.available) {
    console.log('🤖 Ollama server not found. Falling back to rule-based generation...\n');
    return null;
  }

  // Check if we have any compatible models
  const defaultModels = ['llama2:latest', 'gemma3n:latest', 'deepseek-r1:latest', 'gpt-oss:20b'];
  const availableModelNames = ollamaStatus.models.map(m => m.name);

  let model = options.ollamaModel;
  if (!model) {
    // Find first available model from our preferred list
    model = defaultModels.find(m => availableModelNames.includes(m)) || availableModelNames[0];
  }

  if (!model) {
    console.log('🤖 No compatible models found in Ollama. Falling back to rule-based generation...\n');
    return null;
  }

  console.log(`🦙 Using Ollama model: ${model}`);

  return new Promise((resolve, reject) => {
    // Create a concise prompt for Ollama for faster response
    const changes = files.join(', ');
    const mainAction = codeAnalysis.patterns.length > 0 ? codeAnalysis.patterns[0].action : 'Update';

    const prompt = `Git commit message for: ${changes}

Main change: ${mainAction}

Format: present tense, imperative mood, under 50 characters, no period.

Commit message:`;

    const requestData = JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 20,
        num_predict: 20,
        repeat_penalty: 1.1,
        seed: 42
      }
    });

    const ollamaOptions = {
      hostname: options.ollamaHost || 'localhost',
      port: options.ollamaPort || '11434',
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 45000
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
              .replace(/^(?:Sure! Here is(?: a potential)? commit message for the changes you described:|Here's a commit message:|Git commit message:)/i, '') // Remove AI prefixes
              .replace(/\s+-\s+[Ll]og$/, '') // Remove artifacts like " - log"
              .trim()
              .split('\n')[0]; // Take only the first line if there are multiple

            if (cleanedMessage.length > 0 && cleanedMessage.length < 100) {
              resolve(cleanedMessage);
            } else {
              console.log('🤖 Ollama response was not suitable. Falling back to rule-based generation...\n');
              resolve(null);
            }
          } else {
            console.log('🤖 No response from Ollama. Falling back to rule-based generation...\n');
            resolve(null);
          }
        } catch (error) {
          console.log('🤖 Error parsing Ollama response. Falling back to rule-based generation...\n');
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log('🤖 Error connecting to Ollama server. Falling back to rule-based generation...\n');
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('🤖 Ollama request timed out. Falling back to rule-based generation...\n');
      resolve(null);
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Get available Ollama models
 */
async function getAvailableModels(host = 'localhost', port = '11434') {
  const ollamaStatus = await checkOllamaServer(host, port);
  return ollamaStatus.models;
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
    ollama: args.includes('--ollama') || args.includes('-o'),
    ollamaModel: getArgValue(args, '--model') || getArgValue(args, '-m'),
    ollamaHost: getArgValue(args, '--host') || undefined,
    ollamaPort: getArgValue(args, '--port') || undefined,
    listModels: args.includes('--list-models')
  };

  if (options.help) {
    console.log(`
Usage: node git-commit-message.js [options]

Options:
  -v, --verbose       Show full file list in commit message
  -s, --staged        Only check staged files (default)
  -d, --detailed      Generate more detailed commit message
  -o, --ollama        Use local Ollama model for message generation
  -m, --model <name>  Specify Ollama model (default: auto-detect)
  --host <host>       Ollama server host (default: localhost)
  --port <port>       Ollama server port (default: 11434)
  --list-models       List available Ollama models
  -h, --help          Show this help message

Examples:
  node git-commit-message.js
  node git-commit-message.js --ollama
  node git-commit-message.js --ollama --model gemma3n:latest
  node git-commit-message.js --verbose --ollama
  node git-commit-message.js --list-models

Note: Requires Ollama server running locally with models.
Install Ollama: https://ollama.com/download

Quick setup:
  ollama serve                 # Start Ollama server
  ollama pull llama3.2:3b     # Pull recommended model
  ollama pull llama3.2:1b     # Or pull faster model

The script automatically detects available models and uses the best one.
`);
    process.exit(0);
  }

if (options.listModels) {
    const models = await getAvailableModels(options.ollamaHost, options.ollamaPort);
    if (models.length > 0) {
      console.log('\n🦙 Available Ollama models:');
      models.forEach(model => {
        console.log(`  • ${model.name} (${model.size})`);
      });
      console.log('\nDefault model order: llama2:latest > gemma3n:latest > deepseek-r1:latest');
      console.log('Use with: --model <model-name>');
    } else {
      console.log('❌ Ollama server not found. Make sure Ollama is running:');
      console.log('  ollama serve');
      console.log('\nThen pull a model:');
      console.log('  ollama pull llama3.2:3b  # Recommended');
      console.log('  ollama pull llama3.2:1b  # Faster');
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
  const codeAnalysis = analyzeCodeChanges(files, diff);

  console.log(`🔍 Analyzing ${files.length} staged file${files.length > 1 ? 's' : ''}...`);

  // Show analysis details
  if (codeAnalysis.patterns.length > 0) {
    console.log(`📊 Detected patterns: ${codeAnalysis.patterns.map(p => p.action).join(', ')}`);
  }
  if (codeAnalysis.functions.length > 0) {
    console.log(`🔧 Functions: ${codeAnalysis.functions.join(', ')}`);
  }
  if (codeAnalysis.imports.length > 0) {
    console.log(`📦 New imports: ${codeAnalysis.imports.length}`);
  }
  if (codeAnalysis.tests.length > 0) {
    console.log(`🧪 Tests: ${codeAnalysis.tests.length}`);
  }

  let commitMessage;
  let usedOllama = false;

  // Try to generate message with Ollama if requested
  if (options.ollama) {
    console.log('🦙 Generating commit message with local Ollama...');
    const ollamaMessage = await generateCommitMessageWithOllama(files, diff, codeAnalysis, options);
    if (ollamaMessage) {
      commitMessage = ollamaMessage;
      usedOllama = true;
      console.log('✨ Ollama-generated message ready!');
    }
  }

  // Fallback to rule-based generation with code analysis
  if (!commitMessage) {
    const categories = categorizeFiles(files);
    if (options.detailed) {
      const action = getDetailedCommitMessage(options);
      const subject = generateCommitMessage(categories, codeAnalysis, options);
      commitMessage = `${action}: ${subject}`;
    } else {
      commitMessage = generateCommitMessage(categories, codeAnalysis, options);
    }
    console.log('📝 Smart rule-based message generated');
  }

  // Capitalize first letter
  commitMessage = commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);

  console.log(`\n📝 Generated commit message (${usedOllama ? '🦙 Ollama' : '🔧 Rule-based'}):`);
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
          console.log(`✅ Commit created successfully! ${usedOllama ? '🦙' : '🔧'}`);
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
  hasStagedChanges,
  analyzeCodeChanges,
  generateCommitMessageWithOllama
};
