if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

// Default files including C and Web Project files (.html, .css, .js)
const defaultFiles = {
  'main.c': '#include <stdio.h>\n\nint main() {\n    int age = 20;\n    printf("Age is: %d\\n", age);\n    return 0;\n}',
  'index.html': '<<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>My Web Project</h1>\n  <button id="btn">Click Me</button>\n  <script src="script.js"></script>\n</body>\n</html>',
  'style.css': 'body { font-family: sans-serif; text-align: center; margin-top: 50px; }\nh1 { color: #2563eb; }',
  'script.js': 'document.getElementById("btn").addEventListener("click", () => {\n  alert("Button clicked from project script!");\n});'
};

let files = JSON.parse(localStorage.getItem('pro_ide_files')) || defaultFiles;
let currentFile = localStorage.getItem('pro_ide_current_file') || 'main.c';

const editor = document.getElementById('code-editor');
const highlightingContent = document.getElementById('highlighting-content');
const lineNumbers = document.getElementById('line-numbers');
const currentFilenameEl = document.getElementById('current-filename');
const fileListEl = document.getElementById('file-list');
const sidebar = document.getElementById('sidebar');
const drawerOverlay = document.getElementById('drawer-overlay');
const outputContainer = document.getElementById('output-container');
const outputTerminal = document.getElementById('output-terminal');
const outputPreview = document.getElementById('output-preview');
const outputTitle = document.getElementById('output-title');

function init() {
  if (!files[currentFile]) {
    currentFile = Object.keys(files)[0] || 'main.c';
  }
  editor.value = files[currentFile];
  currentFilenameEl.textContent = currentFile;
  updateEditorView();
  renderFileList();
}

function saveToStorage() {
  localStorage.setItem('pro_ide_files', JSON.stringify(files));
  localStorage.setItem('pro_ide_current_file', currentFile);
}

// Simple Syntax Highlighting Engine for C & Web languages
function applySyntaxHighlighting(text) {
  if (!text) return '';
  // Escape HTML tags to prevent XSS in view
  let safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Highlighting rules
  return safeText
    .replace(/(\/\*[\s\S]*?\*\/|\/\/.([^\n]*))/g, '<span class="token-comment">$1</span>')
    .replace(/\b(int|float|double|char|void|include|define|if|else|for|while|return|struct)\b/g, '<span class="token-keyword">$1</span>')
    .replace(/(".*?")/g, '<span class="token-string">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')
    .replace(/\b(printf|scanf|main)\b/g, '<span class="token-function">$1</span>');
}

function updateEditorView() {
  const code = editor.value;
  highlightingContent.innerHTML = applySyntaxHighlighting(code) + '\n';
  
  // Line numbers update
  const lines = code.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

editor.addEventListener('input', () => {
  files[currentFile] = editor.value;
  saveToStorage();
  updateEditorView();
});

editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
  document.getElementById('highlighting').scrollTop = editor.scrollTop;
  document.getElementById('highlighting').scrollLeft = editor.scrollLeft;
});

// Drawer controls
function openSidebar() { sidebar.classList.remove('-translate-x-full'); drawerOverlay.classList.remove('hidden'); }
function closeSidebar() { sidebar.classList.add('-translate-x-full'); drawerOverlay.classList.add('hidden'); }
document.getElementById('menu-btn').addEventListener('click', openSidebar);
document.getElementById('close-drawer').addEventListener('click', closeSidebar);
drawerOverlay.addEventListener('click', closeSidebar);

function renderFileList() {
  fileListEl.innerHTML = '';
  Object.keys(files).forEach(filename => {
    const isActive = filename === currentFile;
    const fileItem = document.createElement('div');
    fileItem.className = `flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition ${
      isActive ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30' : 'text-slate-300 hover:bg-slate-700/50'
    }`;
    fileItem.innerHTML = `
      <div class="flex items-center gap-2 truncate flex-1" onclick="switchFile('${filename}')">
        <i class="fa-regular fa-file-code"></i>
        <span class="truncate">${filename}</span>
      </div>
      <button onclick="deleteFile(event, '${filename}')" class="text-slate-500 hover:text-red-400 p-1 rounded transition" title="Delete File">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>
    `;
    fileListEl.appendChild(fileItem);
  });
}

window.switchFile = function(filename) {
  currentFile = filename;
  editor.value = files[currentFile];
  currentFilenameEl.textContent = currentFile;
  saveToStorage();
  updateEditorView();
  renderFileList();
  closeSidebar();
  outputContainer.classList.add('hidden');
};

document.getElementById('new-file-btn').addEventListener('click', () => {
  let name = prompt('নতুন ফাইলের নাম দিন (যেমন: script.js, style.css, index.html বা test.c):');
  if (name) {
    name = name.trim();
    if (files[name]) { alert('এই নামের ফাইল ইতিমধ্যে আছে!'); return; }
    files[name] = '// New file content';
    switchFile(name);
  }
});

document.getElementById('rename-btn').addEventListener('click', () => {
  let newName = prompt('ফাইলের নতুন নাম দিন:', currentFile);
  if (newName && newName !== currentFile) {
    newName = newName.trim();
    if (files[newName]) { alert('এই নামের ফাইল ইতিমধ্যে বিদ্যমান!'); return; }
    files[newName] = files[currentFile];
    delete files[currentFile];
    switchFile(newName);
  }
});

window.deleteFile = function(event, filename) {
  event.stopPropagation();
  if (Object.keys(files).length <= 1) { alert('ন্যূনতম একটি ফাইল থাকতে হবে!'); return; }
  if (confirm(`"${filename}" ফাইলটি মুছে ফেলতে চান?`)) {
    delete files[filename];
    if (currentFile === filename) currentFile = Object.keys(files)[0];
    saveToStorage();
    init();
  }
};

// Advanced C & Web Runner Engine with Variable Checking
document.getElementById('run-btn').addEventListener('click', () => {
  const code = editor.value;
  outputContainer.classList.remove('hidden');

  // If HTML/CSS/JS project file
  if (currentFile.endsWith('.html') || currentFile.endsWith('.css') || currentFile.endsWith('.js')) {
    outputTerminal.classList.add('hidden');
    outputPreview.classList.remove('hidden');
    outputTitle.innerHTML = `<i class="fa-solid fa-globe text-blue-400"></i> Project Live Preview`;
    
    // Bundle project files into iframe preview
    let htmlContent = files['index.html'] || '<h1>No index.html found</h1>';
    let cssContent = files['style.css'] || '';
    let jsContent = files['script.js'] || '';

    // Inject styles and scripts dynamically
    let combinedDoc = htmlContent
      .replace('</head>', `<style>${cssContent}</style></head>`)
      .replace('</body>', `<script>${jsContent}<\/script></body>`);

    outputPreview.srcdoc = combinedDoc;
    return;
  }

  // For C Programming Simulation & Strict Variable Verification
  outputPreview.classList.add('hidden');
  outputTerminal.classList.remove('hidden');
  outputTitle.innerHTML = `<i class="fa-solid fa-terminal text-emerald-400"></i> C Execution Output`;

  let logs = [];
  const declaredVars = {};
  
  // Step 1: Detect declared variables (e.g., int x = 10;)
  const varRegex = /\b(int|float|double|char)\s+([a-zA-Z_]\w*)\s*=\s*([^;]+);/g;
  let match;
  while ((match = varRegex.exec(code)) !== null) {
    declaredVars[match[2]] = match[3].trim();
  }

  // Step 2: Check printf parameters and validate variables
  const printfRegex = /printf\s*\(\s*"([^"]*)"\s*(?:,\s*(.*?))?\s*\)\s*;/g;
  let pMatch;
  while ((pMatch = printfRegex.exec(code)) !== null) {
    let formatStr = pMatch[1].replace(/\\n/g, '\n');
    let argsStr = pMatch[2];

    if (argsStr) {
      let args = argsStr.split(',').map(a => a.trim());
      for (let arg of args) {
        // If variable is called without being declared, throw a strict Error!
        if (isNaN(arg) && !declaredVars[arg]) {
          outputTerminal.textContent = `Compile Error: '${arg}' undeclared (first use in this function)!`;
          return;
        }
        if (declaredVars[arg] !== undefined) {
          formatStr = formatStr.replace(/%d|%f|%s|%c/, declaredVars[arg]);
        }
      }
    }
    logs.push(formatStr);
  }

  if (logs.length === 0) {
    outputTerminal.textContent = "Program executed successfully with no output. (Use printf to print data)";
  } else {
    outputTerminal.textContent = logs.join('');
  }
});

document.getElementById('back-to-editor-btn').addEventListener('click', () => {
  outputContainer.classList.add('hidden');
});

init();
