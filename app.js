// --- SIMPLE DATA STORE -------------------------------------------------

let books = [
  {
    id: 1,
    title: "The Name of the Rose",
    author: "Umberto Eco",
    pagesRead: 156,
    totalPages: 552,
    comments: ["Atmosphere is dense but beautiful."],
    lastUpdate: new Date().toISOString()
  },
  {
    id: 2,
    title: "Demian",
    author: "Hermann Hesse",
    pagesRead: 120,
    totalPages: 220,
    comments: ["Reread – still hits differently."],
    lastUpdate: new Date().toISOString()
  },
  {
    id: 3,
    title: "Blindness",
    author: "José Saramago",
    pagesRead: 0,
    totalPages: 320,
    comments: [],
    lastUpdate: new Date().toISOString()
  }
];

// localStorage persistence
const STORAGE_KEY = "reading_console_books";

function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      books = JSON.parse(saved);
    } catch (e) {
      console.warn("Could not parse saved books", e);
    }
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// --- DOM REFERENCES ----------------------------------------------------

const outputEl = document.getElementById("terminalOutput");
const inputEl = document.getElementById("terminalInput");
const userLabelEl = document.getElementById("userLabel");
const bookStripEl = document.getElementById("bookStrip");
const clockEl = document.getElementById("clock");
const dateEl = document.getElementById("date");
const statBooksEl = document.getElementById("stat-books");
const statProgressEl = document.getElementById("stat-progress");
const statFinishedEl = document.getElementById("stat-finished");
const statPagesEl = document.getElementById("stat-pages");
const recentUpdateEl = document.getElementById("recentUpdate");
const sessionInfoEl = document.getElementById("sessionInfo");

// --- SESSION STATE -----------------------------------------------------

let isAdmin = false;
let currentUser = "guest";
let commandHistory = [];
let historyIndex = -1;

// change this for yourself (client-side only, for now)
const ADMIN_USERNAME = "loaa";
const ADMIN_PASSWORD = "books!2026";

// --- UTILITIES ---------------------------------------------------------

function addLine(text, cls) {
  const line = document.createElement("div");
  line.className = "line" + (cls ? " " + cls : "");
  line.innerHTML = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function formatBookLine(book) {
  const pct = book.totalPages
    ? Math.round((book.pagesRead / book.totalPages) * 100)
    : 0;
  return `[#${book.id}] ${book.title} <span class="muted">(${book.author})</span> — ${pct}%`;
}

function updateUserLabel() {
  const role = isAdmin ? "admin" : "guest";
  userLabelEl.textContent = `${currentUser}@reading-console (${role})`;
}

function updateSessionInfo() {
  const role = isAdmin ? "admin" : "guest";
  const access = isAdmin ? "read / write" : "read-only";
  sessionInfoEl.innerHTML =
    `role: ${role}<br/>access: ${access}<br/>books: ${books.length}`;
}

// --- CLOCK -------------------------------------------------------------

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}:${ss}`;
  dateEl.textContent = now.toISOString().slice(0, 10);
}
setInterval(updateClock, 1000);
updateClock();

// --- STATS PANEL -------------------------------------------------------

function refreshStats() {
  const totalBooks = books.length;
  const finished = books.filter(b => b.pagesRead >= b.totalPages && b.totalPages > 0).length;
  const inProgress = books.filter(
    b => b.pagesRead > 0 && b.pagesRead < b.totalPages
  ).length;
  const pagesRead = books.reduce((sum, b) => sum + (b.pagesRead || 0), 0);

  statBooksEl.textContent = totalBooks;
  statFinishedEl.textContent = finished;
  statProgressEl.textContent = inProgress;
  statPagesEl.textContent = pagesRead;

  const latest = [...books].sort(
    (a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)
  )[0];

  if (latest) {
    const pct = latest.totalPages
      ? Math.round((latest.pagesRead / latest.totalPages) * 100)
      : 0;
    recentUpdateEl.innerHTML =
      `[#${latest.id}] ${latest.title}<br>` +
      `${latest.pagesRead}/${latest.totalPages} pages (${pct}%)<br>` +
      `<span class="accent-amber">updated: ${new Date(latest.lastUpdate).toLocaleString()}</span>`;
  }
}

// --- BOOK STRIP --------------------------------------------------------

function renderBookStrip() {
  bookStripEl.innerHTML = "";
  books.forEach(book => {
    const pct = book.totalPages
      ? Math.round((book.pagesRead / book.totalPages) * 100)
      : 0;
    const tile = document.createElement("button");
    tile.className = "book-tile" + (pct >= 100 ? " finished" : "");
    tile.innerHTML = `
      <span class="title">${book.title}</span>
      <span class="meta">${book.author}</span>
      <span class="progress">${book.pagesRead}/${book.totalPages} (${pct}%)</span>
    `;
    tile.addEventListener("click", () => {
      cmd_view([String(book.id)]);
    });
    bookStripEl.appendChild(tile);
  });
}

// --- COMMANDS ----------------------------------------------------------

function cmd_help() {
  addLine("Available commands:", "success");
  addLine("  help                           – show this help");
  addLine("  list                           – list all books");
  addLine("  view <id>                      – view book details");
  addLine('  search "<text>"                – search by title/author');
  addLine("  stats                          – show stats");
  addLine("  login                          – admin login (you)");
  addLine("  logout                         – leave admin mode");
  addLine("  clear                          – clear terminal");
  addLine("Admin-only:", "success");
  addLine("  add                            – interactive add");
  addLine("  update <id> <pagesRead>        – update pages");
  addLine('  comment <id> "<text>"          – add comment');
}

function cmd_list() {
  if (!books.length) {
    addLine("No books in database.", "error");
    return;
  }
  books.forEach(book => {
    addLine(formatBookLine(book));
  });
}

function cmd_view(args) {
  const id = Number(args[0]);
  if (!id) {
    addLine("Usage: view <id>", "error");
    return;
  }
  const book = books.find(b => b.id === id);
  if (!book) {
    addLine(`No book with id ${id}.`, "error");
    return;
  }
  const pct = book.totalPages
    ? Math.round((book.pagesRead / book.totalPages) * 100)
    : 0;
  addLine(`[#${book.id}] ${book.title}`, "success");
  addLine(` author    : ${book.author}`);
  addLine(` progress  : ${book.pagesRead}/${book.totalPages} (${pct}%)`);
  addLine(` updated   : ${new Date(book.lastUpdate).toLocaleString()}`);
  if (book.comments && book.comments.length) {
    addLine(" comments  :");
    book.comments.slice(-3).forEach(c => addLine(`  - ${c}`));
  } else {
    addLine(" comments  : (none)");
  }
}

function cmd_search(args) {
  const query = args.join(" ").toLowerCase();
  if (!query) {
    addLine('Usage: search "<text>"', "error");
    return;
  }
  const results = books.filter(
    b =>
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query)
  );
  if (!results.length) {
    addLine("No matches.", "error");
  } else {
    results.forEach(b => addLine(formatBookLine(b)));
  }
}

function cmd_stats() {
  refreshStats();
  addLine("Stats refreshed.", "success");
}

function cmd_clear() {
  outputEl.innerHTML = "";
}

function cmd_login() {
  if (isAdmin) {
    addLine("Already logged in as admin.", "success");
    return;
  }

  const user = prompt("username:");
  const pass = prompt("password:");

  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    isAdmin = true;
    currentUser = user;
    addLine("Admin access granted.", "success");
  } else {
    isAdmin = false;
    currentUser = "guest";
    addLine("Invalid credentials.", "error");
  }
  updateUserLabel();
  updateSessionInfo();
}

function cmd_logout() {
  isAdmin = false;
  currentUser = "guest";
  updateUserLabel();
  updateSessionInfo();
  addLine("Logged out.", "success");
}

function requireAdmin() {
  if (!isAdmin) {
    addLine("Permission denied. Admin only.", "error");
    return false;
  }
  return true;
}

function cmd_add() {
  if (!requireAdmin()) return;

  const title = prompt("Title:");
  if (!title) return addLine("Aborted.", "error");
  const author = prompt("Author:");
  const totalPages = Number(prompt("Total pages:") || "0");

  const newId = books.length ? Math.max(...books.map(b => b.id)) + 1 : 1;
  const book = {
    id: newId,
    title,
    author: author || "Unknown",
    pagesRead: 0,
    totalPages,
    comments: [],
    lastUpdate: new Date().toISOString()
  };
  books.push(book);
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine(`Book added with id ${newId}.`, "success");
}

function cmd_update(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const pages = Number(args[1]);
  if (!id || isNaN(pages)) {
    addLine("Usage: update <id> <pagesRead>", "error");
    return;
  }
  const book = books.find(b => b.id === id);
  if (!book) {
    addLine(`No book with id ${id}.`, "error");
    return;
  }
  book.pagesRead = Math.min(pages, book.totalPages || pages);
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine(`Updated book #${id} to ${book.pagesRead} pages.`, "success");
}

function cmd_comment(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  if (!id) {
    addLine('Usage: comment <id> "<text>"', "error");
    return;
  }
  const book = books.find(b => b.id === id);
  if (!book) {
    addLine(`No book with id ${id}.`, "error");
    return;
  }
  const commentText = args.slice(1).join(" ");
  if (!commentText) {
    addLine("No comment text.", "error");
    return;
  }
  book.comments = book.comments || [];
  book.comments.push(commentText);
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  addLine(`Comment added to #${id}.`, "success");
}

// --- COMMAND DISPATCH --------------------------------------------------

function handleCommand(raw) {
  const input = raw.trim();
  if (!input) return;

  commandHistory.unshift(input);
  historyIndex = -1;

  addLine(`> ${input}`);

  const parts = input.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help": cmd_help(); break;
    case "list": cmd_list(); break;
    case "view": cmd_view(args); break;
    case "search": cmd_search(args); break;
    case "stats": cmd_stats(); break;
    case "clear": cmd_clear(); break;
    case "login": cmd_login(); break;
    case "logout": cmd_logout(); break;
    case "add": cmd_add(); break;
    case "update": cmd_update(args); break;
    case "comment": cmd_comment(args); break;
    default:
      addLine(`Unknown command: ${cmd}`, "error");
  }
}

// --- INPUT HANDLING ----------------------------------------------------

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const value = inputEl.value;
    inputEl.value = "";
    handleCommand(value);
  } else if (e.key === "ArrowUp") {
    if (commandHistory.length) {
      historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      inputEl.value = commandHistory[historyIndex] || "";
      setTimeout(() => inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length), 0);
    }
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    if (commandHistory.length) {
      historyIndex = Math.max(historyIndex - 1, -1);
      inputEl.value = historyIndex === -1 ? "" : commandHistory[historyIndex] || "";
      setTimeout(() => inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length), 0);
    }
    e.preventDefault();
  }
});

// --- INIT --------------------------------------------------------------

loadBooks();
refreshStats();
renderBookStrip();
updateUserLabel();
updateSessionInfo();
