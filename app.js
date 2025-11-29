let books = [];  // no dummy data
const STORAGE_KEY = "coffee_console_books";

let language = "en";
let isAdmin = false;
let currentUser = "guest";
let commandHistory = [];
let historyIndex = -1;

const ADMIN_USERNAME = "loaa";
const ADMIN_PASSWORD = "books!2026";

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

function addLine(text, cls) {
  const line = document.createElement("div");
  line.className = "line" + (cls ? " " + cls : "");
  line.innerHTML = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) books = JSON.parse(saved);
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function formatBookLine(book) {
  const pct = book.totalPages
    ? Math.round((book.pagesRead / book.totalPages) * 100)
    : 0;
  return `[#${book.id}] ${book.title} — ${pct}%`;
}

function updateUserLabel() {
  const role = isAdmin ? "admin" : "guest";
  userLabelEl.textContent = `${currentUser}@coffee-console (${role})`;
}

function updateSessionInfo() {
  sessionInfoEl.innerHTML =
    `role: ${isAdmin ? "admin" : "guest"}<br/>access: ${isAdmin ? "read/write" : "read-only"}`;
}

function updateClock() {
  const now = new Date();
  // Time
  const hh = now.getHours().toString().padStart(2,"0");
  const mm = now.getMinutes().toString().padStart(2,"0");
  const ss = now.getSeconds().toString().padStart(2,"0");
  clockEl.textContent = `${hh}:${mm}:${ss}`;

  // Date — now Korean format
  dateEl.textContent = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}
setInterval(updateClock, 1000);
updateClock();

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
}

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

/* ------- LANGUAGE TOGGLE ------- */

function updateUILabels() {
  if (language === "ko") {
    document.getElementById("titleLabel").textContent = "책과 커피";
    document.getElementById("statLabel").textContent = "세션 / 통계";
    document.getElementById("sessionTitle").textContent = "세션 정보";
    document.getElementById("bookshelfLabel").textContent = "책 목록";
    document.getElementById("shellLabel").textContent = "메인 셸";
    document.getElementById("activityLabel").textContent = "활동";
    document.getElementById("streakLabel").textContent = "읽기 기록";
    document.getElementById("lastUpdateLabel").textContent = "최근 업데이트";
    document.getElementById("lblBooks").textContent = "책 수";
    document.getElementById("lblFinished").textContent = "다 읽음";
    document.getElementById("lblProgress").textContent = "진행중";
    document.getElementById("lblPages").textContent = "읽은 페이지";
  } else {
    document.getElementById("titleLabel").textContent = "COFFEE WITH A BOOK";
    document.getElementById("statLabel").textContent = "SESSION / STATS";
    document.getElementById("sessionTitle").textContent = "SESSION INFO";
    document.getElementById("bookshelfLabel").textContent = "BOOKSHELF";
    document.getElementById("shellLabel").textContent = "MAIN SHELL";
    document.getElementById("activityLabel").textContent = "ACTIVITY";
    document.getElementById("streakLabel").textContent = "READING STREAK";
    document.getElementById("lastUpdateLabel").textContent = "LAST UPDATE";
    document.getElementById("lblBooks").textContent = "Books";
    document.getElementById("lblFinished").textContent = "Finished";
    document.getElementById("lblProgress").textContent = "In Progress";
    document.getElementById("lblPages").textContent = "Pages Read";
  }
}

/* ------- COMMANDS ------- */

function cmd_help() {
addLine("Commands:", "success");
addLine(" list                 — list books");
addLine(" view <id>           — view book");
addLine(" add                 — add new book (admin)");
addLine(" edit <id>           — edit book details (admin)");
addLine(" update <id> <page>  — update progress (admin)");
addLine(" comment <id> <txt>  — add comment (admin)");
addLine(" login               — admin login");
addLine(" logout              — exit admin");
addLine(" lang en|ko          — change UI language");
}

function cmd_lang(args) {
  if (!args[0]) return addLine("usage: lang en | ko");
  language = args[0];
  updateUILabels();
  addLine("Language set to " + language,"success");
}

function cmd_list() {
  if (!books.length) return addLine("No books.");
  books.forEach(book => addLine(formatBookLine(book)));
}

function cmd_view(args) {
  const id = Number(args[0]);
  const book = books.find(b => b.id === id);
  if (!book) return addLine("Book not found");
  addLine(`[#${book.id}] ${book.title}`, "success");
  addLine(`Author: ${book.author}`);
  addLine(`Pages: ${book.pagesRead}/${book.totalPages}`);
  if (book.comments.length) {
    addLine("Comments:");
    book.comments.forEach(c => addLine("• " + c));
  }
}

function cmd_login() {
  const user = prompt("username:");
  const pass = prompt("password:");
  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    isAdmin = true;
    currentUser = user;
    addLine("Admin access granted","success");
  } else {
    addLine("Access denied","error");
  }
  updateUserLabel();
  updateSessionInfo();
}

function cmd_logout() {
  isAdmin = false;
  currentUser = "guest";
  updateUserLabel();
  updateSessionInfo();
  addLine("Logged out.","success");
}

function requireAdmin() {
  if (!isAdmin) {
    addLine("Admin only.","error");
    return false;
  }
  return true;
}

function cmd_add() {
  if (!requireAdmin()) return;
  const title = prompt("Title:");
  const author = prompt("Author:");
  const totalPages = Number(prompt("Total pages:"));
  const newId = books.length + 1;
  books.push({
    id: newId,
    title,
    author,
    pagesRead: 0,
    totalPages,
    comments: [],
    lastUpdate: new Date().toISOString()
  });
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Book added.","success");
}

function cmd_edit(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const book = books.find(b => b.id === id);
  if (!book) return addLine("Book not found.");

  const newTitle = prompt("New title:", book.title);
  const newAuthor = prompt("New author:", book.author);
  const newTotal = Number(prompt("New total pages:", book.totalPages));

  book.title = newTitle || book.title;
  book.author = newAuthor || book.author;
  book.totalPages = newTotal || book.totalPages;
  book.lastUpdate = new Date().toISOString();

  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Book updated.","success");
}

function cmd_update(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const pages = Number(args[1]);
  const book = books.find(b => b.id === id);
  if (!book) return addLine("Not found.");
  book.pagesRead = pages;
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Progress updated.","success");
}

function cmd_comment(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const text = args.slice(1).join(" ");
  const book = books.find(b => b.id === id);
  book.comments.push(text);
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  addLine("Comment added.","success");
}

/* ------- COMMAND PARSER ------- */

function handleCommand(raw) {
  if (!raw.trim()) return;
  addLine("> " + raw);
  const parts = raw.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch(cmd) {
    case "help": cmd_help(); break;
    case "list": cmd_list(); break;
    case "view": cmd_view(args); break;
    case "login": cmd_login(); break;
    case "logout": cmd_logout(); break;
    case "lang": cmd_lang(args); break;
    case "add": cmd_add(); break;
    case "edit": cmd_edit(args); break;
    case "update": cmd_update(args); break;
    case "comment": cmd_comment(args); break;
    default: addLine("Unknown command");
  }
}

inputEl.addEventListener("keydown",e=>{
  if (e.key==="Enter") {
    const value = inputEl.value;
    inputEl.value="";
    handleCommand(value);
  }
});

/* INIT */
loadBooks();
refreshStats();
renderBookStrip();
updateUserLabel();
updateSessionInfo();
updateUILabels();
