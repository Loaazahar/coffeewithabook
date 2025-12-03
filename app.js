// ---------- STORAGE KEYS (for migration check + language) ----------
const STORAGE_KEY_BOOKS = "coffee_console_books";
const STORAGE_KEY_LANG = "coffee_console_lang";
const STORAGE_KEY_USERS = "coffee_console_users_v1";
const STORAGE_KEY_EVENTS = "coffee_console_events_v1";
const STORAGE_KEY_MIGRATED = "coffee_console_migrated_v1";

// ---------- STATE ----------
let language = localStorage.getItem(STORAGE_KEY_LANG) || "en";

let users = {};
let currentUser = "guest";
let currentRole = "guest";

let books = [];
let events = [];

let commandHistory = [];
let historyIndex = -1;

// ---------- CONSTANTS ----------
const DEFAULT_ADMIN = "loaa";

// ---------- DOM ELEMENTS ----------
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
const weatherDataDaeguEl = document.getElementById("weatherDataDaegu");
const weatherDataKansaiEl = document.getElementById("weatherDataKansai");
const feedOutputEl = document.getElementById("feedOutput");
const streakTextEl = document.getElementById("streakText");
const streakGraphEl = document.getElementById("streakGraph");
const streakUserSelectEl = document.getElementById("streakUserSelect");

let selectedStreakUser = "all";

const currentReadersEl = document.getElementById("currentReadersContainer");
const quoteEl = document.getElementById("quoteContainer");
const vocabEl = document.getElementById("vocabContainer");
const moodEl = document.getElementById("moodContainer");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalInput = document.getElementById("modalInput");
const modalOk = document.getElementById("modalOk");
const modalCancel = document.getElementById("modalCancel");

const bookSelectorOverlay = document.getElementById("bookSelectorOverlay");
const bookSelectorTitle = document.getElementById("bookSelectorTitle");
const bookSelectorList = document.getElementById("bookSelectorList");
const bookSelectorCancel = document.getElementById("bookSelectorCancel");

// ---------- CUSTOM MODAL PROMPT ----------
function customPrompt(title, isPassword = false) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalInput.type = isPassword ? "password" : "text";
    modalInput.value = "";
    modalOverlay.classList.add("active");
    modalInput.focus();

    function cleanup() {
      modalOverlay.classList.remove("active");
      modalOk.removeEventListener("click", onOk);
      modalCancel.removeEventListener("click", onCancel);
      modalInput.removeEventListener("keydown", onKey);
      inputEl.focus();
    }

    function onOk() {
      const val = modalInput.value;
      cleanup();
      resolve(val || null);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === "Enter") onOk();
      if (e.key === "Escape") onCancel();
    }

    modalOk.addEventListener("click", onOk);
    modalCancel.addEventListener("click", onCancel);
    modalInput.addEventListener("keydown", onKey);
  });
}

// ---------- BOOK SELECTOR MODAL ----------
function selectBook(filterFn) {
  return new Promise((resolve) => {
    const myBooks = books.filter(filterFn);
    
    bookSelectorList.innerHTML = "";
    
    if (myBooks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "book-selector-empty";
      empty.textContent = language === "ko" 
        ? "선택할 책이 없습니다." 
        : language === "ja"
        ? "選択できる本がありません。"
        : "No books available.";
      bookSelectorList.appendChild(empty);
    } else {
      myBooks.forEach((book) => {
        const item = document.createElement("div");
        item.className = "book-selector-item";
        
        const pct = formatPercent(book);
        
        item.innerHTML = `
          <div class="book-title">${book.title}</div>
          <div class="book-author">${book.author}</div>
          <div class="book-progress">${book.pagesRead} / ${book.totalPages} pages (${pct}%)</div>
        `;
        
        item.addEventListener("click", () => {
          cleanup();
          resolve(book);
        });
        
        bookSelectorList.appendChild(item);
      });
    }
    
    bookSelectorOverlay.classList.add("active");

    function cleanup() {
      bookSelectorOverlay.classList.remove("active");
      bookSelectorCancel.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      inputEl.focus();
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }

    bookSelectorCancel.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
  });
}

// ---------- UTILITIES ----------
function addLine(text, cls) {
  const line = document.createElement("div");
  line.className = "line" + (cls ? " " + cls : "");
  line.innerHTML = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function formatPercent(book) {
  if (!book.totalPages) return 0;
  return Math.round((book.pagesRead / book.totalPages) * 100);
}

// ---------- FIREBASE OPERATIONS ----------
async function loadUsersFromFirebase() {
  const snapshot = await db.collection("users").get();
  users = {};
  snapshot.forEach((doc) => {
    users[doc.id] = doc.data();
  });
}

async function loadBooksFromFirebase() {
  const snapshot = await db.collection("books").orderBy("id").get();
  books = [];
  snapshot.forEach((doc) => {
    const book = doc.data();
    book.docId = doc.id;
    if (!book.owner) book.owner = DEFAULT_ADMIN;
    if (!book.comments) book.comments = [];
    if (!book.lastUpdate) book.lastUpdate = new Date().toISOString();
    books.push(book);
  });
}

async function loadEventsFromFirebase() {
  const snapshot = await db.collection("events").orderBy("timestamp", "desc").limit(200).get();
  events = [];
  snapshot.forEach((doc) => {
    events.push({ ...doc.data(), docId: doc.id });
  });
}

async function saveUserToFirebase(username, userData) {
  await db.collection("users").doc(username).set(userData);
  users[username] = userData;
}

async function deleteUserFromFirebase(username) {
  await db.collection("users").doc(username).delete();
  delete users[username];
}

async function saveBookToFirebase(book) {
  if (book.docId) {
    await db.collection("books").doc(book.docId).set(book);
  } else {
    const docRef = await db.collection("books").add(book);
    book.docId = docRef.id;
  }
}

async function deleteBookFromFirebase(book) {
  if (book.docId) {
    await db.collection("books").doc(book.docId).delete();
  }
}

async function logEventToFirebase(ev) {
  ev.timestamp = ev.timestamp || new Date().toISOString();
  const docRef = await db.collection("events").add(ev);
  ev.docId = docRef.id;
  events.unshift(ev);
  renderFeed();
  updateActivitySidebar();
  updateStreak();
}

// ---------- MIGRATION: localStorage -> Firebase ----------
async function migrateToFirebase() {
  const alreadyMigrated = localStorage.getItem(STORAGE_KEY_MIGRATED);
  if (alreadyMigrated) {
    return false;
  }

  addLine("Checking for local data to migrate...", "success");

  const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "{}");
  const localBooks = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKS) || "[]");
  const localEvents = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || "[]");

  const hasLocalData = Object.keys(localUsers).length > 0 || localBooks.length > 0 || localEvents.length > 0;

  if (!hasLocalData) {
    addLine("No local data found.", "success");
    localStorage.setItem(STORAGE_KEY_MIGRATED, "true");
    return false;
  }

  addLine(`Found: ${Object.keys(localUsers).length} users, ${localBooks.length} books, ${localEvents.length} events`, "success");
  addLine("Migrating to cloud...", "success");

  try {
    for (const [username, userData] of Object.entries(localUsers)) {
      const existing = await db.collection("users").doc(username).get();
      if (!existing.exists) {
        await db.collection("users").doc(username).set(userData);
        addLine(`  ✓ User: ${username}`, "success");
      }
    }

    for (const book of localBooks) {
      const bookCopy = { ...book };
      delete bookCopy.docId;
      const snapshot = await db.collection("books").where("id", "==", book.id).get();
      if (snapshot.empty) {
        await db.collection("books").add(bookCopy);
        addLine(`  ✓ Book: ${book.title}`, "success");
      }
    }

    for (const event of localEvents) {
      const eventCopy = { ...event };
      delete eventCopy.docId;
      await db.collection("events").add(eventCopy);
    }
    if (localEvents.length > 0) {
      addLine(`  ✓ ${localEvents.length} events migrated`, "success");
    }

    localStorage.setItem(STORAGE_KEY_MIGRATED, "true");
    addLine("Migration complete! Data now syncs across devices.", "success");
    return true;
  } catch (e) {
    console.error("Migration error:", e);
    addLine("Migration error: " + e.message, "error");
    return false;
  }
}

// ---------- REALTIME LISTENERS ----------
function setupRealtimeListeners() {
  db.collection("books").orderBy("id").onSnapshot((snapshot) => {
    books = [];
    snapshot.forEach((doc) => {
      const book = doc.data();
      book.docId = doc.id;
      if (!book.owner) book.owner = DEFAULT_ADMIN;
      if (!book.comments) book.comments = [];
      if (!book.lastUpdate) book.lastUpdate = new Date().toISOString();
      books.push(book);
    });
    refreshStats();
    renderBookStrip();
    renderCurrentReaders();
  });

  db.collection("events").orderBy("timestamp", "desc").limit(200).onSnapshot((snapshot) => {
    events = [];
    snapshot.forEach((doc) => {
      events.push({ ...doc.data(), docId: doc.id });
    });
    renderFeed();
    updateActivitySidebar();
    updateStreak();
  });

  db.collection("users").onSnapshot((snapshot) => {
    users = {};
    snapshot.forEach((doc) => {
      users[doc.id] = doc.data();
    });
  });
}

// ---------- CLOCK & DATE ----------
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}:${ss}`;

  if (language === "ko") {
    dateEl.textContent = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } else if (language === "ja") {
    dateEl.textContent = now.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } else {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }
}
setInterval(updateClock, 1000);

// ---------- SESSION / USER LABEL ----------
function updateUserLabel() {
  userLabelEl.textContent = `${currentUser}@coffee-console (${currentRole})`;
}

function updateSessionInfo() {
  const access = currentRole === "admin" ? "read/write" :
                 currentRole === "member" ? "read/write" : "read-only";
  if (language === "ko") {
    sessionInfoEl.innerHTML =
      `사용자: ${currentUser}<br/>역할: ${currentRole}<br/>권한: ${access}<br/>cmd: <span class="accent">help</span>`;
  } else if (language === "ja") {
    sessionInfoEl.innerHTML =
      `ユーザー: ${currentUser}<br/>ロール: ${currentRole}<br/>権限: ${access}<br/>cmd: <span class="accent">help</span>`;
  } else {
    sessionInfoEl.innerHTML =
      `user: ${currentUser}<br/>role: ${currentRole}<br/>access: ${access}<br/>cmd: type <span class="accent">help</span>`;
  }
}

// ---------- LANGUAGE LABELS ----------
function updateUILabels() {
  document.querySelectorAll(".langBtn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === language);
  });

  const t = (id, en, ko, ja) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = language === "ko" ? ko : language === "ja" ? ja : en;
  };

  t("titleLabel", "COFFEE WITH A BOOK", "책과 커피", "本とコーヒー");
  t("statLabel", "SESSION / STATS", "세션 / 통계", "セッション / 統計");
  t("sessionTitle", "SESSION INFO", "세션 정보", "セッション情報");
  t("bookshelfLabel", "BOOKSHELF", "책 목록", "本棚");
  t("shellLabel", "MAIN SHELL", "메인 셸", "メインシェル");
  t("streakLabel", "READING STREAK", "읽기 기록", "読書記録");
  t("lastUpdateLabel", "RECENT ACTIVITY", "최근 활동", "最近のアクティビティ");
  t("weatherTitleDaegu", "DAEGU WEATHER", "대구 날씨", "大邱の天気");
  t("weatherTitleKansai", "KANSAI WEATHER", "간사이 날씨", "関西の天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ数");
  t("feedTitleLabel", "GLOBAL READING FEED", "전체 읽기 피드", "グローバル読書フィード");
  t("bookSelectorTitle", "Select a Book", "책 선택", "本を選択");

  updateSessionInfo();
  updateClock();
  refreshStats();
  renderFeed();
  updateActivitySidebar();
  updateStreak();
  fetchWeather();

  localStorage.setItem(STORAGE_KEY_LANG, language);
}

document.querySelectorAll(".langBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    language = btn.dataset.lang;
    updateUILabels();
  });
});

// ---------- STATS ----------
function refreshStats() {
  const totalBooks = books.length;
  const finished = books.filter(
    (b) => b.totalPages > 0 && b.pagesRead >= b.totalPages
  ).length;
  const inProgress = books.filter(
    (b) => b.pagesRead > 0 && b.totalPages && b.pagesRead < b.totalPages
  ).length;
  const pagesRead = books.reduce((sum, b) => sum + (b.pagesRead || 0), 0);

  statBooksEl.textContent = totalBooks;
  statFinishedEl.textContent = finished;
  statProgressEl.textContent = inProgress;
  statPagesEl.textContent = pagesRead;
}

// ---------- BOOK STRIP ----------
function renderBookStrip() {
  bookStripEl.innerHTML = "";
  books.forEach((book) => {
    const pct = formatPercent(book);
    const tile = document.createElement("button");
    tile.className = "book-tile" + (pct >= 100 ? " finished" : "");
    const progressText = `${book.pagesRead}/${book.totalPages} (${pct}%)`;
    tile.innerHTML = `
      <span class="title">${book.title}</span>
      <span class="meta">${book.author} • ${book.owner}</span>
      <span class="progress">${progressText}</span>
    `;
    tile.addEventListener("click", () => {
      cmd_view([String(book.id)]);
    });
    bookStripEl.appendChild(tile);
  });
}

// ---------- FEED / ACTIVITY ----------
function renderFeed() {
  feedOutputEl.innerHTML = "";
  const relevant = events.filter((ev) =>
    ["progress", "comment", "book_add"].includes(ev.type)
  );
  if (!relevant.length) {
    const line = document.createElement("div");
    line.className = "line";
    line.textContent =
      language === "ko"
        ? "아직 활동이 없습니다."
        : language === "ja"
        ? "まだ活動はありません。"
        : "No activity yet.";
    feedOutputEl.appendChild(line);
    return;
  }

  const grouped = {};
  relevant.forEach((ev) => {
    const user = ev.ownerUser || ev.user || "unknown";
    if (!grouped[user]) grouped[user] = {};
    const key = ev.bookId ? `${ev.bookId}::${ev.bookTitle}` : ev.bookTitle || "-";
    if (!grouped[user][key]) grouped[user][key] = [];
    grouped[user][key].push(ev);
  });

  const usersSorted = Object.keys(grouped).sort();

  usersSorted.forEach((user) => {
    const userDiv = document.createElement("div");
    userDiv.className = "feed-user";

    const userName = document.createElement("div");
    userName.className = "feed-user-name";
    userName.textContent = user;
    userDiv.appendChild(userName);

    const booksMap = grouped[user];
    const bookKeys = Object.keys(booksMap);

    bookKeys.forEach((bKey) => {
      const eventsForBook = booksMap[bKey].slice().sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      const sample = eventsForBook[0];
      const bookTitle = sample.bookTitle || "(no title)";
      const bookDiv = document.createElement("div");
      bookDiv.className = "feed-book";

      const titleLine = document.createElement("div");
      titleLine.className = "feed-book-title";
      titleLine.textContent = `📕 ${bookTitle}`;
      bookDiv.appendChild(titleLine);

      eventsForBook.slice(0, 3).forEach((ev) => {
        const eventDiv = document.createElement("div");
        eventDiv.className = "feed-event";

        const from = ev.fromPages ?? null;
        const to = ev.toPages ?? null;
        const delta = typeof ev.deltaPages === "number" ? ev.deltaPages : null;

        const lines = [];
        lines.push(`👤 ${user}`);

        if (from !== null && to !== null) {
          lines.push(`⬆️ ${from} → ${to}${delta ? ` (+${delta})` : ""}`);
        }

        if (ev.type === "comment" && ev.commentText) {
          lines.push(`💬 "${ev.commentText}"`);
        }

        const time = new Date(ev.timestamp);
        const timeStr = time.toLocaleString(
          language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US",
          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
        );
        lines.push(`🕒 ${timeStr}`);

        eventDiv.innerHTML = lines.join("<br>");
        bookDiv.appendChild(eventDiv);
      });

      userDiv.appendChild(bookDiv);
    });

    feedOutputEl.appendChild(userDiv);
  });
}

function updateActivitySidebar() {
  if (!events.length) {
    recentUpdateEl.innerHTML =
      language === "ko"
        ? "활동이 없습니다."
        : language === "ja"
        ? "活動はありません。"
        : "No activity yet.";
    return;
  }

  const grouped = {};
  
  events.slice(0, 50).forEach((ev) => {
    const evDate = new Date(ev.timestamp);
    const dayKey = evDate.toISOString().slice(0, 10);
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(ev);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const lines = [];

  sortedDays.slice(0, 7).forEach((dayKey) => {
    const dayDate = new Date(dayKey + "T00:00:00");
    const dayLabel = dayDate.toLocaleDateString(
      language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US",
      { month: "short", day: "numeric", weekday: "short" }
    );
    
    lines.push(`<div class="activity-day-header">${dayLabel}</div>`);

    grouped[dayKey].slice(0, 5).forEach((ev) => {
      const user = ev.user || ev.ownerUser || "unknown";
      let text = "";

      if (ev.type === "book_add") {
        text = `${user} added "${ev.bookTitle}"`;
      } else if (ev.type === "progress") {
        text = `${user}: "${ev.bookTitle}" ${ev.fromPages}→${ev.toPages}`;
      } else if (ev.type === "comment") {
        text = `${user} commented on "${ev.bookTitle}"`;
      } else if (ev.type === "user_add") {
        text = `${user} created "${ev.targetUser}"`;
      } else if (ev.type === "user_remove") {
        text = `${user} removed "${ev.targetUser}"`;
      } else if (ev.type === "book_remove") {
        text = `${user} removed "${ev.bookTitle}"`;
      } else if (ev.type === "password_self") {
        text = `${user} updated password`;
      } else if (ev.type === "password_admin") {
        text = `${user} reset pw for "${ev.targetUser}"`;
      } else {
        text = `${user}: ${ev.type}`;
      }

      const time = new Date(ev.timestamp);
      const timeStr = time.toLocaleTimeString(
        language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US",
        { hour: "2-digit", minute: "2-digit" }
      );

      lines.push(`<div class="activity-item"><span class="activity-time">${timeStr}</span> ${text}</div>`);
    });
  });

  recentUpdateEl.innerHTML = lines.join("");
}

// ---------- STREAK ----------
function updateStreak() {
  populateStreakUserSelector();
  
  const targetUser = selectedStreakUser;
  
  let filteredEvents;
  if (targetUser === "all") {
    filteredEvents = events.filter((ev) => ev.type === "progress");
  } else {
    filteredEvents = events.filter(
      (ev) => ev.type === "progress" && (ev.ownerUser === targetUser || ev.user === targetUser)
    );
  }

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, date: d, pages: 0 });
  }

  filteredEvents.forEach((ev) => {
    const evDate = new Date(ev.timestamp);
    const dayKey = evDate.toISOString().slice(0, 10);
    
    let delta = ev.deltaPages;
    if (typeof delta !== "number") {
      const from = ev.fromPages ?? 0;
      const to = ev.toPages ?? from;
      delta = to - from;
    }
    
    days.forEach((d) => {
      if (d.key === dayKey) d.pages += Math.max(delta, 0);
    });
  });

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].pages > 0) streak++;
    else break;
  }

  renderStreakGraph(days);

  const totalPages = days.reduce((sum, d) => sum + d.pages, 0);
  const avgPages = Math.round(totalPages / 7);
  
  const lines = [];
  
  const streakLabel = language === "ko" ? "연속" : language === "ja" ? "連続" : "Streak";
  const totalLabel = language === "ko" ? "총" : language === "ja" ? "合計" : "Total";
  const avgLabel = language === "ko" ? "평균" : language === "ja" ? "平均" : "Avg";

  if (language === "ko") {
    lines.push(`${streakLabel}: ${streak}일 | ${totalLabel}: ${totalPages}p | ${avgLabel}: ${avgPages}p/일`);
  } else if (language === "ja") {
    lines.push(`${streakLabel}: ${streak}日 | ${totalLabel}: ${totalPages}p | ${avgLabel}: ${avgPages}p/日`);
  } else {
    lines.push(`${streakLabel}: ${streak}d | ${totalLabel}: ${totalPages}p | ${avgLabel}: ${avgPages}p/d`);
  }

  streakTextEl.innerHTML = lines.join("<br>");
}

function populateStreakUserSelector() {
  const allUsers = new Set();
  
  events.forEach((ev) => {
    if (ev.type === "progress") {
      if (ev.ownerUser) allUsers.add(ev.ownerUser);
      if (ev.user) allUsers.add(ev.user);
    }
  });
  
  books.forEach((b) => {
    if (b.owner) allUsers.add(b.owner);
  });

  const currentOptions = Array.from(streakUserSelectEl.options).map(o => o.value);
  const newUsers = ["all", ...Array.from(allUsers).sort()];
  
  if (JSON.stringify(currentOptions) !== JSON.stringify(newUsers)) {
    const previousValue = streakUserSelectEl.value;
    streakUserSelectEl.innerHTML = "";
    
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = language === "ko" ? "전체" : language === "ja" ? "全員" : "All Readers";
    streakUserSelectEl.appendChild(allOption);
    
    allUsers.forEach((user) => {
      const option = document.createElement("option");
      option.value = user;
      option.textContent = user;
      streakUserSelectEl.appendChild(option);
    });
    
    if (newUsers.includes(previousValue)) {
      streakUserSelectEl.value = previousValue;
    }
  }
}

function renderStreakGraph(days) {
  const maxPages = Math.max(...days.map(d => d.pages), 1);
  
  streakGraphEl.innerHTML = "";
  
  days.forEach((d) => {
    const wrapper = document.createElement("div");
    wrapper.className = "streak-bar-wrapper";
    
    const pagesLabel = document.createElement("div");
    pagesLabel.className = "streak-bar-pages";
    pagesLabel.textContent = d.pages > 0 ? d.pages : "";
    
    const bar = document.createElement("div");
    bar.className = "streak-bar" + (d.pages === 0 ? " empty" : "");
    const heightPercent = d.pages > 0 ? Math.max((d.pages / maxPages) * 100, 8) : 8;
    bar.style.height = heightPercent + "%";
    
    const label = document.createElement("div");
    label.className = "streak-bar-label";
    label.textContent = formatDateShort(d.date);
    
    wrapper.appendChild(pagesLabel);
    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    streakGraphEl.appendChild(wrapper);
  });
}

streakUserSelectEl.addEventListener("change", (e) => {
  selectedStreakUser = e.target.value;
  updateStreak();
});

function formatDateShort(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  if (language === "ko") {
    return `${day}`;
  } else if (language === "ja") {
    return `${day}`;
  } else {
    return `${day}`;
  }
}

function formatDateFull(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  if (language === "ko") {
    return `${month + 1}월 ${day}일`;
  } else if (language === "ja") {
    return `${month + 1}月${day}日`;
  } else {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month]} ${day}`;
  }
}

// ---------- WEATHER COORDINATES ----------
const DAEGU_LAT = 35.8714;
const DAEGU_LON = 128.6014;

const KANSAI_LAT = 34.6937;
const KANSAI_LON = 135.5023;

// ---------- QUOTES POOL ----------
const QUOTES_POOL = [
  {
    en: "A reader lives a thousand lives before he dies.",
    ko: "독서가는 죽기 전에 천 개의 삶을 산다.",
    ja: "読書家は死ぬ前に千の人生を生きる。",
    author: "George R.R. Martin"
  },
  {
    en: "Books are a uniquely portable magic.",
    ko: "책은 휴대할 수 있는 유일한 마법이다.",
    ja: "本は持ち運べる唯一の魔法だ。",
    author: "Stephen King"
  },
  {
    en: "There is no friend as loyal as a book.",
    ko: "책만큼 충실한 친구는 없다.",
    ja: "本ほど忠実な友はいない。",
    author: "Ernest Hemingway"
  },
  {
    en: "Reading is dreaming with open eyes.",
    ko: "독서는 눈을 뜨고 꾸는 꿈이다.",
    ja: "読書は目を開けて見る夢だ。",
    author: "Anissa Trisdianty"
  },
  {
    en: "A book is a dream you hold in your hands.",
    ko: "책은 손에 쥔 꿈이다.",
    ja: "本は手に持つ夢だ。",
    author: "Neil Gaiman"
  },
  {
    en: "One must always be careful of books.",
    ko: "책은 항상 조심해야 한다.",
    ja: "本には常に気をつけなければならない。",
    author: "Cassandra Clare"
  },
  {
    en: "Books are mirrors: you only see in them what you already have inside you.",
    ko: "책은 거울이다: 이미 내 안에 있는 것만 보인다.",
    ja: "本は鏡だ：自分の中にあるものだけが見える。",
    author: "Carlos Ruiz Zafón"
  },
  {
    en: "We read to know we are not alone.",
    ko: "우리는 혼자가 아님을 알기 위해 읽는다.",
    ja: "私たちは孤独でないことを知るために読む。",
    author: "C.S. Lewis"
  },
  {
    en: "The more that you read, the more things you will know.",
    ko: "더 많이 읽을수록 더 많이 알게 된다.",
    ja: "読めば読むほど、知ることが増える。",
    author: "Dr. Seuss"
  },
  {
    en: "Reading brings us unknown friends.",
    ko: "독서는 우리에게 알지 못하는 친구를 데려다준다.",
    ja: "読書は未知の友をもたらす。",
    author: "Honoré de Balzac"
  },
  {
    en: "A room without books is like a body without a soul.",
    ko: "책이 없는 방은 영혼 없는 육체와 같다.",
    ja: "本のない部屋は魂のない体のようだ。",
    author: "Cicero"
  },
  {
    en: "Books are the quietest and most constant of friends.",
    ko: "책은 가장 조용하고 변함없는 친구다.",
    ja: "本は最も静かで変わらない友だ。",
    author: "Charles W. Eliot"
  }
];

// ---------- VOCAB POOL ----------
const VOCAB_POOL = [
  {
    word: { en: "Serendipity", ko: "세렌디피티", ja: "セレンディピティ" },
    reading: { en: "", ko: "", ja: "" },
    meaning: {
      en: "Finding something good without looking for it",
      ko: "뜻밖의 행운을 발견하는 것",
      ja: "思いがけない幸運を見つけること"
    }
  },
  {
    word: { en: "Ephemeral", ko: "덧없는", ja: "儚い" },
    reading: { en: "", ko: "", ja: "はかない" },
    meaning: {
      en: "Lasting for a very short time",
      ko: "아주 짧은 시간 동안 지속되는",
      ja: "ほんの短い間だけ続く"
    }
  },
  {
    word: { en: "Petrichor", ko: "페트리코", ja: "ペトリコール" },
    reading: { en: "", ko: "", ja: "" },
    meaning: {
      en: "The smell of earth after rain",
      ko: "비 온 뒤 흙냄새",
      ja: "雨上がりの土の匂い"
    }
  },
  {
    word: { en: "Mellifluous", ko: "감미로운", ja: "甘美な" },
    reading: { en: "", ko: "", ja: "かんびな" },
    meaning: {
      en: "Sweet-sounding, pleasant to hear",
      ko: "달콤하게 들리는, 듣기 좋은",
      ja: "甘く響く、聞いて心地よい"
    }
  },
  {
    word: { en: "Wanderlust", ko: "방랑벽", ja: "放浪癖" },
    reading: { en: "", ko: "", ja: "ほうろうへき" },
    meaning: {
      en: "A strong desire to travel",
      ko: "여행에 대한 강한 욕구",
      ja: "旅への強い欲求"
    }
  },
  {
    word: { en: "Sonder", ko: "손더", ja: "ソンダー" },
    reading: { en: "", ko: "", ja: "" },
    meaning: {
      en: "Realizing everyone has a life as vivid as your own",
      ko: "모든 사람이 나만큼 생생한 삶을 산다는 깨달음",
      ja: "誰もが自分と同じく鮮やかな人生を持つという気づき"
    }
  },
  {
    word: { en: "Komorebi", ko: "코모레비", ja: "木漏れ日" },
    reading: { en: "", ko: "", ja: "こもれび" },
    meaning: {
      en: "Sunlight filtering through leaves",
      ko: "나뭇잎 사이로 비치는 햇빛",
      ja: "葉の間から差し込む日光"
    }
  },
  {
    word: { en: "Hygge", ko: "휘게", ja: "ヒュッゲ" },
    reading: { en: "", ko: "", ja: "" },
    meaning: {
      en: "A cozy, contented mood",
      ko: "아늑하고 만족스러운 기분",
      ja: "居心地よく満ち足りた気分"
    }
  },
  {
    word: { en: "Tsundoku", ko: "쓴도쿠", ja: "積読" },
    reading: { en: "", ko: "", ja: "つんどく" },
    meaning: {
      en: "Buying books and letting them pile up unread",
      ko: "책을 사서 읽지 않고 쌓아두는 것",
      ja: "本を買って読まずに積んでおくこと"
    }
  },
  {
    word: { en: "Wabi-sabi", ko: "와비사비", ja: "侘寂" },
    reading: { en: "", ko: "", ja: "わびさび" },
    meaning: {
      en: "Finding beauty in imperfection",
      ko: "불완전함에서 아름다움을 찾는 것",
      ja: "不完全さの中に美を見出すこと"
    }
  },
  {
    word: { en: "Natsukashii", ko: "그리운", ja: "懐かしい" },
    reading: { en: "", ko: "", ja: "なつかしい" },
    meaning: {
      en: "Nostalgic longing for the past",
      ko: "과거에 대한 향수",
      ja: "過去への懐かしさ"
    }
  },
  {
    word: { en: "Jeong", ko: "정", ja: "情" },
    reading: { en: "", ko: "", ja: "じょう" },
    meaning: {
      en: "Deep emotional bond between people",
      ko: "사람들 사이의 깊은 정서적 유대",
      ja: "人々の間の深い情緒的な絆"
    }
  }
];

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

let currentQuoteIndex = getDayOfYear() % QUOTES_POOL.length;
let currentVocabIndex = getDayOfYear() % VOCAB_POOL.length;

function getWeekdayName(dayIndex) {
  if (language === "ko") {
    return ["일", "월", "화", "수", "목", "금", "토"][dayIndex];
  } else if (language === "ja") {
    return ["日", "月", "火", "水", "木", "金", "土"][dayIndex];
  } else {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];
  }
}

function weatherCodeToText(code) {
  const base = {
    0: { en: "Clear", ko: "맑음", ja: "快晴" },
    1: { en: "Mostly clear", ko: "대체로 맑음", ja: "おおむね晴れ" },
    2: { en: "Partly cloudy", ko: "구름 조금", ja: "一部曇り" },
    3: { en: "Overcast", ko: "흐림", ja: "曇り" },
    45: { en: "Fog", ko: "안개", ja: "霧" },
    48: { en: "Foggy", ko: "짙은 안개", ja: "濃い霧" },
    51: { en: "Drizzle", ko: "이슬비", ja: "霧雨" },
    61: { en: "Rain", ko: "비", ja: "雨" },
    71: { en: "Snow", ko: "눈", ja: "雪" },
    80: { en: "Rain showers", ko: "소나기", ja: "にわか雨" },
    95: { en: "Thunderstorm", ko: "뇌우", ja: "雷雨" },
  };
  const info = base[code] || { en: "Unknown", ko: "알 수 없음", ja: "不明" };
  return language === "ko" ? info.ko : language === "ja" ? info.ja : info.en;
}

function renderCurrentReaders() {
  const readers = books
    .filter(b => b.pagesRead > 0)
    .map(b => `${b.owner} → ${b.pagesRead}p`);

  if (readers.length) {
    const lines = [`<span class="accent-amber">📖 CURRENT READERS</span>`];
    lines.push(...readers);
    currentReadersEl.innerHTML = lines.join("<br>");
  } else {
    currentReadersEl.innerHTML = "";
  }
}

function renderQuote() {
  const quote = QUOTES_POOL[currentQuoteIndex];
  const quoteText = quote[language] || quote.en;
  
  const label = language === "ko" ? "명언" : language === "ja" ? "名言" : "QUOTE";
  
  const lines = [
    `<span class="accent-amber">${label}</span>`,
    `"${quoteText}"`,
    `<i>— ${quote.author}</i>`
  ];
  quoteEl.innerHTML = lines.join("<br>");
}

function rotateQuote() {
  currentQuoteIndex = (currentQuoteIndex + 1) % QUOTES_POOL.length;
  renderQuote();
}

function renderVocab() {
  const vocab = VOCAB_POOL[currentVocabIndex];
  const word = vocab.word[language] || vocab.word.en;
  const reading = vocab.reading[language] || "";
  const meaning = vocab.meaning[language] || vocab.meaning.en;
  
  const label = language === "ko" ? "어휘" : language === "ja" ? "語彙" : "VOCAB";
  
  const lines = [`<span class="accent-amber">${label}</span>`];
  
  if (reading) {
    lines.push(`${word}（${reading}）`);
  } else {
    lines.push(word);
  }
  
  lines.push(`<i>${meaning}</i>`);
  
  vocabEl.innerHTML = lines.join("<br>");
}

function rotateVocab() {
  currentVocabIndex = (currentVocabIndex + 1) % VOCAB_POOL.length;
  renderVocab();
}

function renderMood(moodText) {
  const lines = [
    `<span class="accent-amber">MOOD</span>`,
    moodText || (
      language === "ko"
        ? "📖 조용한 독서 시간"
        : language === "ja"
        ? "📖 静かな読書時間"
        : "📖 Quiet reading time"
    )
  ];
  moodEl.innerHTML = lines.join("<br>");
}

async function fetchWeatherForCity(lat, lon, targetEl, cityName) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&hourly=relativehumidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.current_weather || !data.daily) {
      targetEl.textContent =
        language === "ko"
          ? "날씨 데이터를 불러올 수 없습니다."
          : language === "ja"
          ? "天気データを取得できません。"
          : "Unable to load weather data.";
      return null;
    }

    const cw = data.current_weather;
    const temp = Math.ceil(cw.temperature);
    const wCode = cw.weathercode;

    let humidity = null;
    if (data.hourly) {
      const tIndex = data.hourly.time.indexOf(cw.time);
      if (tIndex >= 0) {
        humidity = data.hourly.relativehumidity_2m[tIndex];
      }
    }

    const dTimes = data.daily.time;
    const dMax = data.daily.temperature_2m_max;
    const dMin = data.daily.temperature_2m_min;
    const dCodes = data.daily.weathercode;

    const condText = weatherCodeToText(wCode);

    const lines = [];

    let todayLine, humStr, nextTitle;

    if (language === "ko") {
      todayLine = `오늘: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `습도: ${humidity}%` : "";
      nextTitle = "3일 예보:";
    } else if (language === "ja") {
      todayLine = `今日: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `湿度: ${humidity}%` : "";
      nextTitle = "3日間の予報:";
    } else {
      todayLine = `Today: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `Humidity: ${humidity}%` : "";
      nextTitle = "Next 3 days:";
    }

    lines.push(todayLine);
    if (humStr) lines.push(humStr);
    lines.push("");
    lines.push(nextTitle);

    for (let i = 1; i <= 3 && i < dTimes.length; i++) {
      const dDate = new Date(dTimes[i]);
      const wd = getWeekdayName(dDate.getDay());
      const max = Math.ceil(dMax[i]);
      const min = Math.ceil(dMin[i]);
      const dCond = weatherCodeToText(dCodes[i]);
      lines.push(`${wd}: ${max}° / ${min}°  ${dCond}`);
    }

    targetEl.innerHTML = lines.join("<br>");
    
    return wCode;
  } catch (e) {
    targetEl.textContent =
      language === "ko"
        ? "날씨 정보를 가져오는 중 오류 발생."
        : language === "ja"
        ? "天気情報の取得中にエラーが発生しました。"
        : "Error fetching weather.";
    return null;
  }
}

function getMoodFromWeatherCode(wCode) {
  let mood;
  switch (wCode) {
    case 0:
    case 1:
      mood = {
        en: "☀️ Sunshine reading — pages feel lighter today",
        ko: "☀️ 햇살 독서 — 마음도 환해지는 느낌",
        ja: "☀️ 陽だまり読書 — 心がぽかぽか",
      };
      break;
    case 2:
      mood = {
        en: "⛅ Soft sky reading — a calm atmosphere for stories",
        ko: "⛅ 잔잔한 하늘 독서 — 이야기 듣기 좋은 날씨",
        ja: "⛅ 雲間読書 — 静かな読書時間",
      };
      break;
    case 3:
      mood = {
        en: "☁️ Grey day reading — perfect for introspection",
        ko: "☁️ 차분한 흐림 독서 — 생각이 깊어지는 시간",
        ja: "☁️ 曇り読書 — 静かに読み込む雰囲気",
      };
      break;
    case 45:
    case 48:
      mood = {
        en: "🌫 Misty reading — imagination moves softly",
        ko: "🌫 안개 독서 — 상상이 천천히 흘러가요",
        ja: "🌫 霧の読書 — 思考がふわっと広がる",
      };
      break;
    case 61:
    case 80:
      mood = {
        en: "🌧 Rainy reading — the raindrops are our background music",
        ko: "🌧 빗소리 독서 — 자연의 ASMR",
        ja: "🌧 雨音読書 — 雨がBGMになる",
      };
      break;
    case 71:
      mood = {
        en: "❄️ Snowy reading — pages feel warmer in your hands",
        ko: "❄️ 눈 내리는 독서 — 손안의 책이 더 따뜻해져요",
        ja: "❄️ 雪の読書 — 本が手の中で温かい",
      };
      break;
    case 95:
      mood = {
        en: "⚡ Stormy reading — dramatic weather suits dramatic stories",
        ko: "⚡ 폭우 독서 — 감정이 더 짙어지는 시간",
        ja: "⚡ 雷雨読書 — 雰囲気が物語を深める",
      };
      break;
    default:
      mood = {
        en: "📖 Quiet reading time",
        ko: "📖 조용한 독서 시간",
        ja: "📖 静かな読書時間",
      };
  }
  return language === "ko" ? mood.ko : language === "ja" ? mood.ja : mood.en;
}

async function fetchWeather() {
  const daeguCode = await fetchWeatherForCity(DAEGU_LAT, DAEGU_LON, weatherDataDaeguEl, "Daegu");
  await fetchWeatherForCity(KANSAI_LAT, KANSAI_LON, weatherDataKansaiEl, "Kansai");
  
  renderCurrentReaders();
  renderQuote();
  renderVocab();
  
  if (daeguCode !== null) {
    const moodText = getMoodFromWeatherCode(daeguCode);
    renderMood(moodText);
  } else {
    renderMood(null);
  }
}

// ---------- PERMISSIONS ----------
function requireAdmin() {
  if (currentRole !== "admin") {
    addLine("Admin only.", "error");
    return false;
  }
  return true;
}

function canEditBook(book) {
  return currentRole === "admin" || book.owner === currentUser;
}

// ---------- COMMANDS ----------
function cmd_help() {
  addLine("Commands:", "success");
  addLine("  help                   – show this help");
  addLine("  list [user]            – list books (all or by user)");
  addLine("  view <id>              – view one book");
  addLine("  weather                – refresh Daegu weather");
  addLine("  lang en|ko|ja          – change UI language");
  addLine("  login                  – login as user");
  addLine("  logout                 – logout to guest");
  addLine("  changepass             – change your password");
  addLine("Admin:", "success");
  addLine("  createuser <name>      – create member");
  addLine("  removeuser <name>      – remove user");
  addLine("  listusers              – list users");
  addLine("  setpass <username>     – set password for a user");
  addLine("  add                    – add new book (for you)");
  addLine("  edit <id>              – edit book meta");
  addLine("  update                 – update pages read");
  addLine("  comment <id> <text>    – add comment");
  addLine("  remove <id>            – remove book");
}

function cmd_list(args) {
  let targetUser = args[0];
  let list = books;
  if (targetUser) {
    list = books.filter((b) => b.owner === targetUser);
    if (!list.length) {
      addLine("No books for user " + targetUser, "error");
      return;
    }
  }
  if (!list.length) {
    addLine("No books.", "error");
    return;
  }
  list.forEach((b) => {
    const pct = formatPercent(b);
    addLine(
      `[#${b.id}] ${b.title} — ${pct}% (${b.pagesRead}/${b.totalPages}) • ${b.owner}`
    );
  });
}

function cmd_view(args) {
  const id = Number(args[0]);
  const book = books.find((b) => b.id === id);
  if (!book) {
    addLine("Book not found.", "error");
    return;
  }
  const pct = formatPercent(book);
  addLine(`[#${book.id}] ${book.title}`, "success");
  addLine(`Author: ${book.author}`);
  addLine(`Owner: ${book.owner}`);
  addLine(`Progress: ${book.pagesRead}/${book.totalPages} (${pct}%)`);
  if (book.comments && book.comments.length) {
    addLine("Comments:");
    book.comments.forEach((c) => {
      const ts = new Date(c.timestamp).toLocaleString(
        language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US"
      );
      addLine(
        ` • [${c.user}] @${c.pagesAt}p "${c.text}" (${ts})`
      );
    });
  }
}

function cmd_lang(args) {
  const v = args[0];
  if (!v || !["en", "ko", "ja"].includes(v)) {
    addLine("Usage: lang en|ko|ja", "error");
    return;
  }
  language = v;
  updateUILabels();
  addLine("Language set to " + v, "success");
}

async function cmd_login() {
  const username = await customPrompt("Username:");
  if (!username) {
    addLine("Login cancelled.", "error");
    return;
  }
  const pass = await customPrompt("Password:", true);
  if (!pass) {
    addLine("Login cancelled.", "error");
    return;
  }
  const u = users[username];
  if (!u || !u.active || u.pass !== pass) {
    addLine("Invalid credentials.", "error");
    return;
  }
  currentUser = username;
  currentRole = u.role;
  updateUserLabel();
  updateSessionInfo();
  updateStreak();
  addLine("Logged in as " + username + " (" + currentRole + ").", "success");
}

function cmd_logout() {
  currentUser = "guest";
  currentRole = "guest";
  updateUserLabel();
  updateSessionInfo();
  updateStreak();
  addLine("Logged out.", "success");
}

async function cmd_createuser(args) {
  if (!requireAdmin()) return;
  let username = args[0];
  if (!username) {
    username = await customPrompt("Username:");
  }
  if (!username) {
    addLine("No username provided.", "error");
    return;
  }
  if (users[username]) {
    addLine("User already exists.", "error");
    return;
  }
  const pass = await customPrompt("Password:", true);
  if (!pass) {
    addLine("No password provided.", "error");
    return;
  }
  const userData = {
    role: "member",
    pass,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await saveUserToFirebase(username, userData);
  addLine("User created: " + username, "success");
  await logEventToFirebase({ type: "user_add", user: currentUser, targetUser: username });
}

async function cmd_removeuser(args) {
  if (!requireAdmin()) return;
  const username = args[0];
  if (!username) {
    addLine("Usage: removeuser <username>", "error");
    return;
  }
  if (username === DEFAULT_ADMIN) {
    addLine("Cannot remove default admin.", "error");
    return;
  }
  if (!users[username]) {
    addLine("User not found.", "error");
    return;
  }
  await deleteUserFromFirebase(username);
  addLine("User removed: " + username, "success");
  await logEventToFirebase({ type: "user_remove", user: currentUser, targetUser: username });
}

function cmd_listusers() {
  if (!requireAdmin()) return;
  const admins = Object.entries(users)
    .filter(([_, u]) => u.role === "admin")
    .map(([name]) => name);
  const members = Object.entries(users)
    .filter(([_, u]) => u.role === "member")
    .map(([name]) => name);

  addLine("Admins:", "success");
  admins.forEach((n) => addLine("  - " + n));
  addLine("Members:", "success");
  members.forEach((n) => addLine("  - " + n));
}

async function cmd_add() {
  if (currentRole === "guest") {
    addLine("Login required to add books.", "error");
    return;
  }
  const title = await customPrompt("Title:");
  if (!title) {
    addLine("Aborted.", "error");
    return;
  }
  const author = await customPrompt("Author:");
  const totalStr = await customPrompt("Total pages:");
  const total = Number(totalStr);
  if (!total) {
    addLine("Aborted.", "error");
    return;
  }
  const id = books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1;
  const book = {
    id,
    owner: currentUser,
    title,
    author: author || "Unknown",
    pagesRead: 0,
    totalPages: total,
    comments: [],
    lastUpdate: new Date().toISOString(),
  };
  await saveBookToFirebase(book);
  addLine(`Book added: "${title}"`, "success");
  await logEventToFirebase({
    type: "book_add",
    user: currentUser,
    ownerUser: currentUser,
    bookId: id,
    bookTitle: title,
  });
}

async function cmd_edit(args) {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const id = Number(args[0]);
  const book = books.find((b) => b.id === id);
  if (!book) {
    addLine("Book not found.", "error");
    return;
  }
  if (!canEditBook(book)) {
    addLine("Not your book.", "error");
    return;
  }
  const newTitle = await customPrompt(`New title (current: ${book.title}):`);
  const newAuthor = await customPrompt(`New author (current: ${book.author}):`);
  const newTotalStr = await customPrompt(`New total pages (current: ${book.totalPages}):`);
  const newTotal = Number(newTotalStr);

  if (newTitle) book.title = newTitle;
  if (newAuthor) book.author = newAuthor;
  if (newTotal) book.totalPages = newTotal;
  book.lastUpdate = new Date().toISOString();
  await saveBookToFirebase(book);
  addLine("Book updated.", "success");
}

async function cmd_update() {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  
  const book = await selectBook((b) => canEditBook(b));
  
  if (!book) {
    addLine("Cancelled.", "error");
    return;
  }
  
  const promptText = language === "ko" 
    ? `현재 ${book.pagesRead}페이지. 새 페이지:`
    : language === "ja"
    ? `現在 ${book.pagesRead}ページ。新しいページ数:`
    : `Currently at page ${book.pagesRead}. New page:`;
  
  const pagesStr = await customPrompt(promptText);
  const pages = Number(pagesStr);
  
  if (!pagesStr || isNaN(pages)) {
    addLine("Cancelled.", "error");
    return;
  }
  
  const from = book.pagesRead || 0;
  book.pagesRead = Math.min(pages, book.totalPages || pages);
  book.lastUpdate = new Date().toISOString();
  await saveBookToFirebase(book);
  
  const pct = formatPercent(book);
  addLine(`Updated "${book.title}" → ${book.pagesRead}/${book.totalPages} (${pct}%)`, "success");

  const to = book.pagesRead;
  const delta = to - from;
  await logEventToFirebase({
    type: "progress",
    user: currentUser,
    ownerUser: book.owner,
    bookId: book.id,
    bookTitle: book.title,
    fromPages: from,
    toPages: to,
    deltaPages: delta,
  });
}

async function cmd_comment(args) {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const id = Number(args[0]);
  if (!id) {
    addLine("Usage: comment <id> <text>", "error");
    return;
  }
  const book = books.find((b) => b.id === id);
  if (!book) {
    addLine("Book not found.", "error");
    return;
  }
  const text = args.slice(1).join(" ");
  if (!text) {
    addLine("No comment text.", "error");
    return;
  }
  const comment = {
    user: currentUser,
    text,
    pagesAt: book.pagesRead || 0,
    timestamp: new Date().toISOString(),
  };
  book.comments.push(comment);
  book.lastUpdate = comment.timestamp;
  await saveBookToFirebase(book);
  addLine("Comment added.", "success");

  await logEventToFirebase({
    type: "comment",
    user: currentUser,
    ownerUser: book.owner,
    bookId: book.id,
    bookTitle: book.title,
    fromPages: book.pagesRead,
    toPages: book.pagesRead,
    deltaPages: 0,
    commentText: text,
  });
}

async function cmd_remove(args) {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const id = Number(args[0]);
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) {
    addLine("Book not found.", "error");
    return;
  }
  const book = books[idx];
  if (!canEditBook(book)) {
    addLine("Not your book.", "error");
    return;
  }
  await deleteBookFromFirebase(book);
  addLine("Book removed.", "success");
  await logEventToFirebase({
    type: "book_remove",
    user: currentUser,
    ownerUser: book.owner,
    bookId: book.id,
    bookTitle: book.title,
  });
}

function cmd_weather() {
  addLine(
    language === "ko"
      ? "대구 날씨를 새로고침합니다."
      : language === "ja"
      ? "大邱の天気を更新します。"
      : "Refreshing Daegu weather…",
    "success"
  );
  fetchWeather();
}

async function cmd_changepass() {
  if (currentUser === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const oldp = await customPrompt("Old password:", true);
  if (!oldp) return;
  if (users[currentUser].pass !== oldp) {
    addLine("Incorrect password.", "error");
    return;
  }
  const newp = await customPrompt("New password:", true);
  if (!newp) {
    addLine("No new password entered.", "error");
    return;
  }
  users[currentUser].pass = newp;
  await saveUserToFirebase(currentUser, users[currentUser]);
  addLine("Password updated.", "success");
  await logEventToFirebase({
    type: "password_self",
    user: currentUser
  });
}

async function cmd_setpass(args) {
  if (!requireAdmin()) return;
  const target = args[0];
  if (!target) {
    addLine("Usage: setpass <username>", "error");
    return;
  }
  if (!users[target]) {
    addLine("User not found.", "error");
    return;
  }
  const newp = await customPrompt(`New password for ${target}:`, true);
  if (!newp) {
    addLine("No new password entered.", "error");
    return;
  }
  users[target].pass = newp;
  await saveUserToFirebase(target, users[target]);
  addLine(`Password reset for ${target}`, "success");
  await logEventToFirebase({
    type: "password_admin",
    user: currentUser,
    targetUser: target
  });
}

// ---------- COMMAND DISPATCH ----------
async function handleCommand(input) {
  const raw = input.trim();
  if (!raw) return;
  
  commandHistory.push(raw);
  historyIndex = commandHistory.length;
  
  addLine("> " + raw);

  const parts = raw.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help": cmd_help(); break;
    case "list": cmd_list(args); break;
    case "view": cmd_view(args); break;
    case "lang": cmd_lang(args); break;
    case "login": await cmd_login(); break;
    case "logout": cmd_logout(); break;
    case "createuser": await cmd_createuser(args); break;
    case "removeuser": await cmd_removeuser(args); break;
    case "listusers": cmd_listusers(); break;
    case "add": await cmd_add(); break;
    case "edit": await cmd_edit(args); break;
    case "update": await cmd_update(); break;
    case "comment": await cmd_comment(args); break;
    case "remove": await cmd_remove(args); break;
    case "weather": cmd_weather(); break;
    case "changepass": await cmd_changepass(); break;
    case "setpass": await cmd_setpass(args); break;
    default:
      addLine("Unknown command: " + cmd, "error");
  }
}

// ---------- INPUT HANDLER ----------
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const v = inputEl.value;
    inputEl.value = "";
    handleCommand(v);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (commandHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      inputEl.value = commandHistory[historyIndex];
      setTimeout(() => inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length), 0);
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      inputEl.value = commandHistory[historyIndex];
      setTimeout(() => inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length), 0);
    } else {
      historyIndex = commandHistory.length;
      inputEl.value = "";
    }
  }
});

// ---------- INIT ----------
async function init() {
  try {
    await loadUsersFromFirebase();
    
    if (!users[DEFAULT_ADMIN]) {
      await saveUserToFirebase(DEFAULT_ADMIN, {
        role: "admin",
        pass: "books!2026",
        active: true,
        createdAt: new Date().toISOString()
      });
    }
    
    await loadBooksFromFirebase();
    await loadEventsFromFirebase();
    
    setupRealtimeListeners();
    
    updateUserLabel();
    updateClock();
    refreshStats();
    renderBookStrip();
    updateUILabels();
  } catch (e) {
    console.error("Init error:", e);
  }
}

init();
