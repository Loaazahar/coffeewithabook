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
const weatherDataEl = document.getElementById("weatherData");
const feedOutputEl = document.getElementById("feedOutput");
const streakTextEl = document.getElementById("streakText");

const currentReadersEl = document.getElementById("currentReadersContainer");
const quoteEl = document.getElementById("quoteContainer");
const vocabEl = document.getElementById("vocabContainer");
const moodEl = document.getElementById("moodContainer");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalInput = document.getElementById("modalInput");
const modalOk = document.getElementById("modalOk");
const modalCancel = document.getElementById("modalCancel");

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
  t("weatherTitle", "WEATHER", "날씨", "天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ数");
  t("feedTitleLabel", "GLOBAL READING FEED", "전체 읽기 피드", "グローバル読書フィード");

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
    recentUpdateEl.textContent =
      language === "ko"
        ? "활동이 없습니다."
        : language === "ja"
        ? "活動はありません。"
        : "No activity yet.";
    return;
  }
  const latest = events[0];

  let text = "";
  const user = latest.user || latest.ownerUser || "unknown";

  if (latest.type === "book_add") {
    text = `${user} added "${latest.bookTitle}"`;
  } else if (latest.type === "progress") {
    text = `${user} updated "${latest.bookTitle}" ${latest.fromPages}→${latest.toPages}`;
  } else if (latest.type === "comment") {
    text = `${user} commented on "${latest.bookTitle}"`;
  } else if (latest.type === "user_add") {
    text = `${user} created user "${latest.targetUser}"`;
  } else if (latest.type === "user_remove") {
    text = `${user} removed user "${latest.targetUser}"`;
  } else if (latest.type === "book_remove") {
    text = `${user} removed book "${latest.bookTitle}"`;
  } else if (latest.type === "password_self") {
    text = `${user} updated their password`;
  } else if (latest.type === "password_admin") {
    text = `${user} reset password for "${latest.targetUser}"`;
  } else {
    text = `${user} did ${latest.type}`;
  }

  recentUpdateEl.textContent = text;
}

// ---------- STREAK ----------
function updateStreak() {
  const myEvents = currentUser === "guest" 
    ? events.filter((ev) => ev.type === "progress")
    : events.filter(
        (ev) => ev.type === "progress" && (ev.ownerUser === currentUser || ev.user === currentUser)
      );

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, date: d, pages: 0 });
  }

  myEvents.forEach((ev) => {
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

  const lines = [];
  
  const streakLabel = currentUser === "guest" 
    ? (language === "ko" ? "전체 연속 일수" : language === "ja" ? "全体の連続日数" : "Total Streak")
    : (language === "ko" ? "연속 일수" : language === "ja" ? "連続日数" : "Streak");

  if (language === "ko") {
    lines.push(`${streakLabel}: ${streak}일`);
  } else if (language === "ja") {
    lines.push(`${streakLabel}: ${streak}日`);
  } else {
    lines.push(`${streakLabel}: ${streak} day(s)`);
  }

  days.forEach((d) => {
    const dateStr = formatDateShort(d.date);
    const has = d.pages > 0;
    const mark = has ? "✔" : "✖";
    lines.push(`${dateStr}: ${mark} ${d.pages}p`);
  });

  streakTextEl.innerHTML = lines.join("<br>");
}

function formatDateShort(date) {
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

// ---------- WEATHER (DAEGU) ----------
const DAEGU_LAT = 35.8714;
const DAEGU_LON = 128.6014;

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
  const lines = [
    `<span class="accent-amber">QUOTE</span>`,
    `"本は心の窓である"`,
    `책은 마음의 창이다`,
    `<i>Books are windows of the soul</i>`
  ];
  quoteEl.innerHTML = lines.join("<br>");
}

function renderVocab() {
  const lines = [
    `<span class="accent-amber">VOCAB</span>`,
    `巡り合う（めぐりあう）`,
    `우연히 만나다`,
    `<i>to encounter by chance</i>`
  ];
  vocabEl.innerHTML = lines.join("<br>");
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

async function fetchWeather() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${DAEGU_LAT}&longitude=${DAEGU_LON}` +
      `&current_weather=true` +
      `&hourly=relativehumidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();
