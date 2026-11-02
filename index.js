// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

// Initial Data & State
const defaultFiles = {
  'main.c': '#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    printf("C Language Editor-e Apnake Swagatom!\\n");\n    return 0;\n}'
};

let files = JSON.parse(localStorage.getItem('c_pwa_files')) || defaultFiles;
let currentFile = localStorage.getItem('c_pwa_current_file') || 'main.c';

// DOM Elements
const editor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const currentFilenameEl = document.getElementById('current-filename');
const fileListEl = document.getElementById('file-list');
const sidebar = document.getElementById('sidebar');
const drawerOverlay = document.getElementById('drawer-overlay');
const outputContainer = document.getElementById('output-container');
const outputTerminal = document.getElementById('output-terminal');

// Initialize Editor
function init() {
  if (!files[currentFile]) {
    currentFile = Object.keys(files)[0] || 'main.c';
  }
  editor.value = files[currentFile];
  currentFilenameEl.textContent = currentFile;
  updateLineNumbers();
  renderFileList();
}

// Save Files to Local Storage
function saveToStorage() {
  localStorage.setItem('c_pwa_files', JSON.stringify(files));
  localStorage.setItem('c_pwa_current_file', currentFile);
}

// Line Numbers Sync
function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

editor.addEventListener('input', () => {
  files[currentFile] = editor.value;
  saveToStorage();
  updateLineNumbers();
});

editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});

// Sidebar Toggle Logic
function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  drawerOverlay.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  drawerOverlay.classList.add('hidden');
}

document.getElementById('menu-btn').addEventListener('click', openSidebar);
document.getElementById('close-drawer').addEventListener('click', closeSidebar);
drawerOverlay.addEventListener('click', closeSidebar);

// Render File List in Drawer
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

// Switch File
window.switchFile = function(filename) {
  currentFile = filename;
  editor.value = files[currentFile];
  currentFilenameEl.textContent = currentFile;
  saveToStorage();
  updateLineNumbers();
  renderFileList();
  closeSidebar();
  outputContainer.classList.add('hidden'); // Close output view if open
};

// Create New File
document.getElementById('new-file-btn').addEventListener('click', () => {
  let name = prompt('নতুন ফাইলের নাম লিখুন (যেমন: test.c):');
  if (name) {
    name = name.trim();
    if (!name.endsWith('.c')) name += '.c';
    if (files[name]) {
      alert('এই নামের একটি ফাইল ইতিমধ্যে বিদ্যমান!');
      return;
    }
    files[name] = '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}';
    switchFile(name);
  }
});

// Rename File
document.getElementById('rename-btn').addEventListener('click', () => {
  let newName = prompt('নতুন নাম দিন:', currentFile);
  if (newName && newName !== currentFile) {
    newName = newName.trim();
    if (!newName.endsWith('.c')) newName += '.c';
    if (files[newName]) {
      alert('এই নামের একটি ফাইল ইতিমধ্যে আছে!');
      return;
    }
    files[newName] = files[currentFile];
    delete files[currentFile];
    switchFile(newName);
  }
});

// Delete File with Confirmation
window.deleteFile = function(event, filename) {
  event.stopPropagation();
  if (Object.keys(files).length <= 1) {
    alert('সর্বনিম্ন একটি ফাইল থাকতে হবে!');
    return;
  }
  if (confirm(`আপনি কি "${filename}" ফাইলটি মুছে ফেলতে চান?`)) {
    delete files[filename];
    if (currentFile === filename) {
      currentFile = Object.keys(files)[0];
    }
    saveToStorage();
    init();
  }
};

// C Interpreter / Runner Engine (Client-Side Simulation)
document.getElementById('run-btn').addEventListener('click', () => {
  const code = editor.value;
  let logs = [];
  
  // Custom printf parser
  const printfMatches = code.matchAll(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*(.*?))?\s*\)\s*;/g);
  
  // Basic variable tracker for simulation
  const vars = {};
  const varMatches = code.matchAll(/(int|float|double|char)\s+([a-zA-Z_]\w*)\s*=\s*([^;]+);/g);
  for (const m of varMatches) {
    vars[m[2]] = m[3].replace(/"/g, '').trim();
  }

  for (const match of printfMatches) {
    let str = match[1];
    const argsStr = match[2];
    
    // Replace \n with line breaks
    str = str.replace(/\\n/g, '\n');
    
    // Replace placeholders with simple variable values
    if (argsStr) {
      const args = argsStr.split(',').map(a => a.trim());
      args.forEach(arg => {
        if (vars[arg] !== undefined) {
          str = str.replace(/%d|%f|%s|%c/, vars[arg]);
        }
      });
    }
    logs.push(str);
  }

  if (logs.length === 0) {
    outputTerminal.textContent = "Program finished with no output. (Ensure you use printf(\"...\");)";
  } else {
    outputTerminal.textContent = logs.join('');
  }

  // Show Output Container Completely (Hides Code Editor behind)
  outputContainer.classList.remove('hidden');
});

// Hide Output and Back to Editor
document.getElementById('back-to-editor-btn').addEventListener('click', () => {
  outputContainer.classList.add('hidden');
});

// Init on Load
init();
