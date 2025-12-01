// =======================
// STORAGE KEYS & STATE
// =======================
const STORAGE_KEY_LANG   = "coffee_lang";
const STORAGE_KEY_USERS  = "coffee_users";
const STORAGE_KEY_BOOKS  = "coffee_books";
const STORAGE_KEY_EVENTS = "coffee_events";

let language    = localStorage.getItem(STORAGE_KEY_LANG) || "en";
let currentUser = "guest";
let currentRole = "guest";

let users  = {};
let books  = [];
let events = [];

// Restore data EXACTLY as before
function initState() {
  const u = localStorage.getItem(STORAGE_KEY_USERS);
  if (u) users = JSON.parse(u);

  const b = localStorage.getItem(STORAGE_KEY_BOOKS);
  if (b) books = JSON.parse(b);

  const e = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (e) events = JSON.parse(e);

  if (!users["loaa"]) {
    users["loaa"] = { role: "admin", pass: "books!2026", active: true };
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }
}
initState();

// =======================
// DOM REFERENCES
// =======================
const clockEl          = document.getElementById("clock");
const dateEl           = document.getElementById("date");
const statBooksEl      = document.getElementById("stat-books");
const statProgressEl   = document.getElementById("stat-progress");
const statFinishedEl   = document.getElementById("stat-finished");
const statPagesEl      = document.getElementById("stat-pages");
const sessionInfoEl    = document.getElementById("sessionInfo");
const weatherDataEl    = document.getElementById("weatherData");
const currentReadersEl = document.getElementById("currentReaders");
const quoteTextEl      = document.getElementById("quoteText");
const vocabTextEl      = document.getElementById("vocabText");
const moodTextEl       = document.getElementById("moodText");
const terminalOutput   = document.getElementById("terminalOutput");
const terminalInput    = document.getElementById("terminalInput");
const promptUserEl     = document.getElementById("promptUser");
const recentUpdateEl   = document.getElementById("recentUpdate");
const bookStripEl      = document.getElementById("bookStrip");

// =======================
// UTILITIES
// =======================
function addLine(text, cls) {
  const div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  div.innerHTML = text;
  terminalOutput.appendChild(div);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatPercent(book) {
  if (!book.totalPages) return 0;
  return Math.round((book.pagesRead / book.totalPages) * 100);
}

function updatePromptLabel() {
  if (!promptUserEl) return;
  promptUserEl.textContent = `${currentUser}@coffee-console (${currentRole})`;
}

// =======================
// INITIAL STATE
// =======================
function initState() {
  users  = load(STORAGE_KEY_USERS, {});
  books  = load(STORAGE_KEY_BOOKS, []);
  events = load(STORAGE_KEY_EVENTS, []);

  // ensure default admin exists
  if (!users[DEFAULT_ADMIN]) {
    users[DEFAULT_ADMIN] = {
      role: "admin",
      pass: "books!2026",
      active: true,
      createdAt: new Date().toISOString(),
    };
    save(STORAGE_KEY_USERS, users);
  }

  // normalize books
  books.forEach((b) => {
    if (!b.owner) b.owner = DEFAULT_ADMIN;
    if (!b.comments) b.comments = [];
    if (!b.lastUpdate) b.lastUpdate = new Date().toISOString();
  });
}

// =======================
// CLOCK & DATE
// =======================
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;

  if (!dateEl) return;

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

// =======================
// LABELS / LANGUAGE
// =======================
function updateSessionInfo() {
  if (!sessionInfoEl) return;
  const access = currentRole === "guest" ? "read-only" : "read/write";

  if (language === "ko") {
    sessionInfoEl.innerHTML =
      `user: ${currentUser}<br>` +
      `role: ${currentRole}<br>` +
      `access: ${access}<br>` +
      `cmd: <span class="accent">help</span> 입력`;
  } else if (language === "ja") {
    sessionInfoEl.innerHTML =
      `user: ${currentUser}<br>` +
      `role: ${currentRole}<br>` +
      `access: ${access}<br>` +
      `cmd: <span class="accent">help</span> と入力`;
  } else {
    sessionInfoEl.innerHTML =
      `user: ${currentUser}<br>` +
      `role: ${currentRole}<br>` +
      `access: ${access}<br>` +
      `cmd: type <span class="accent">help</span>`;
  }
}

function updateUILabels() {
  const t = (id, en, ko, ja) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = language === "ko" ? ko : language === "ja" ? ja : en;
  };

  t("titleLabel", "COFFEE WITH A BOOK", "책과 커피", "本とコーヒー");
  t("statLabel", "SESSION / STATS", "세션 / 통계", "セッション / 統計");
  t("sessionTitle", "SESSION INFO", "세션 정보", "セッション情報");
  t("shellLabel", "MAIN SHELL", "메인 셸", "メインシェル");
  t("bookshelfLabel", "BOOKSHELF", "책 목록", "本棚");
  t("activityLabel", "ACTIVITY", "활동", "アクティビティ");
  t("weatherTitle", "WEATHER", "날씨", "天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ数");

  document.querySelectorAll(".langBtn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === language);
  });

  updateSessionInfo();
  updateClock();
  refreshStats();
  renderBookStrip();
  refreshReaders();
  renderQuoteAndVocab();
  updateActivityBox();
  fetchWeather();

  localStorage.setItem(STORAGE_KEY_LANG, language);
}

// language buttons
document.querySelectorAll(".langBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    language = btn.dataset.lang;
    updateUILabels();
  });
});

// =======================
// STATS & BOOK STRIP
// =======================
function refreshStats() {
  const totalBooks = books.length;
  const finished = books.filter(
    (b) => b.totalPages > 0 && b.pagesRead >= b.totalPages
  ).length;
  const inProgress = books.filter(
    (b) =>
      b.pagesRead > 0 &&
      b.totalPages &&
      b.pagesRead < b.totalPages
  ).length;
  const pagesRead = books.reduce(
    (sum, b) => sum + (b.pagesRead || 0),
    0
  );

  if (statBooksEl)    statBooksEl.textContent = totalBooks;
  if (statFinishedEl) statFinishedEl.textContent = finished;
  if (statProgressEl) statProgressEl.textContent = inProgress;
  if (statPagesEl)    statPagesEl.textContent = pagesRead;
}

function renderBookStrip() {
  if (!bookStripEl) return;
  bookStripEl.innerHTML = "";
  books.forEach((b) => {
    const pct = formatPercent(b);
    const tile = document.createElement("button");
    tile.className = "book-tile" + (pct >= 100 ? " finished" : "");
    tile.innerHTML = `
      <span class="title">${b.title}</span>
      <span class="meta">${b.author} • ${b.owner}</span>
      <span class="progress">${b.pagesRead}/${b.totalPages} (${pct}%)</span>
    `;
    tile.addEventListener("click", () => cmd_view([String(b.id)]));
    bookStripEl.appendChild(tile);
  });
}

// =======================
// READERS / QUOTE / VOCAB / MOOD
// =======================
function refreshReaders() {
  if (!currentReadersEl) return;
  const perUser = {};
  books.forEach((b) => {
    if (b.pagesRead > 0) {
      perUser[b.owner] = (perUser[b.owner] || 0) + b.pagesRead;
    }
  });

  const names = Object.keys(perUser);
  if (!names.length) {
    currentReadersEl.textContent =
      language === "ko"
        ? "아직 읽는 사람이 없습니다."
        : language === "ja"
        ? "まだ読んでいる人はいません。"
        : "No one is reading yet.";
    return;
  }

  const lines = names.sort().map((name) => `${name} → ${perUser[name]}p`);
  currentReadersEl.innerHTML = lines.join("<br>");
}

function renderQuoteAndVocab() {
  if (quoteTextEl) {
    quoteTextEl.innerHTML =
      `"本は心の窓である"<br>` +
      `책은 마음의 창이다<br>` +
      `<i>Books are windows of the soul</i>`;
  }

  if (vocabTextEl) {
    vocabTextEl.innerHTML =
      `巡り合う（めぐりあう）<br>` +
      `우연히 만나다<br>` +
      `<i>to encounter by chance</i>`;
  }
}

function setMoodTextFromCode(code) {
  let mood;
  switch (code) {
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
        en: "⛅ Soft sky reading — calm air for quiet stories",
        ko: "⛅ 잔잔한 하늘 독서 — 조용히 읽기 좋은 날",
        ja: "⛅ 穏やかな空の読書 — 静かな物語にぴったり",
      };
      break;
    case 3:
      mood = {
        en: "☁️ Grey day reading — perfect for introspection",
        ko: "☁️ 흐린 날 독서 — 생각이 깊어지는 시간",
        ja: "☁️ 曇りの日の読書 — 物思いにふける時間",
      };
      break;
    case 61:
    case 80:
      mood = {
        en: "🌧 Rainy reading — raindrops as background music",
        ko: "🌧 빗소리 독서 — 자연이 들려주는 BGM",
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
    default:
      mood = {
        en: "📖 Quiet reading time",
        ko: "📖 조용한 독서 시간",
        ja: "📖 静かな読書時間",
      };
  }
  if (!moodTextEl) return;
  const txt =
    language === "ko" ? mood.ko : language === "ja" ? mood.ja : mood.en;
  moodTextEl.textContent = txt;
}

// =======================
// WEATHER (DAEGU)
// =======================
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
    0: { en: "Clear",          ko: "맑음",      ja: "快晴" },
    1: { en: "Mostly clear",   ko: "대체로 맑음", ja: "おおむね晴れ" },
    2: { en: "Partly cloudy",  ko: "구름 조금", ja: "一部曇り" },
    3: { en: "Overcast",       ko: "흐림",      ja: "曇り" },
    45:{ en: "Fog",            ko: "안개",      ja: "霧" },
    48:{ en: "Foggy",          ko: "짙은 안개", ja: "濃い霧" },
    61:{ en: "Rain",           ko: "비",        ja: "雨" },
    71:{ en: "Snow",           ko: "눈",        ja: "雪" },
    80:{ en: "Rain showers",   ko: "소나기",    ja: "にわか雨" },
    95:{ en: "Thunderstorm",   ko: "뇌우",      ja: "雷雨" },
  };
  const info = base[code] || { en: "Unknown", ko: "알 수 없음", ja: "不明" };
  return language === "ko" ? info.ko : language === "ja" ? info.ja : info.en;
}

async function fetchWeather() {
  if (!weatherDataEl) return;
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

    if (!data.current_weather || !data.daily) {
      weatherDataEl.textContent =
        language === "ko"
          ? "날씨 데이터를 불러올 수 없습니다."
          : language === "ja"
          ? "天気データを取得できません。"
          : "Unable to load weather data.";
      return;
    }

    const cw    = data.current_weather;
    const temp  = Math.round(cw.temperature);
    const wCode = cw.weathercode;

    // humidity from hourly
    let humidity = null;
    if (data.hourly) {
      const idx = data.hourly.time.indexOf(cw.time);
      if (idx >= 0) humidity = data.hourly.relativehumidity_2m[idx];
    }

    const dTimes = data.daily.time;
    const dMax   = data.daily.temperature_2m_max;
    const dMin   = data.daily.temperature_2m_min;
    const dCodes = data.daily.weathercode;

    const condText = weatherCodeToText(wCode);

    let heading, todayLine, humLine, nextTitle;
    if (language === "ko") {
      heading   = "대구 날씨";
      todayLine = `오늘: ${temp}°C, ${condText}`;
      humLine   = humidity != null ? `습도: ${humidity}%` : "";
      nextTitle = "3일 예보:";
    } else if (language === "ja") {
      heading   = "大邱の天気";
      todayLine = `今日: ${temp}°C, ${condText}`;
      humLine   = humidity != null ? `湿度: ${humidity}%` : "";
      nextTitle = "3日間の予報:";
    } else {
      heading   = "DAEGU WEATHER";
      todayLine = `Today: ${temp}°C, ${condText}`;
      humLine   = humidity != null ? `Humidity: ${humidity}%` : "";
      nextTitle = "Next 3 days:";
    }

    const lines = [];
    lines.push(heading);
    lines.push(todayLine);
    if (humLine) lines.push(humLine);
    lines.push("");
    lines.push(nextTitle);

    for (let i = 1; i <= 3 && i < dTimes.length; i++) {
      const dDate = new Date(dTimes[i]);
      const wd    = getWeekdayName(dDate.getDay());
      const max   = Math.round(dMax[i]);
      const min   = Math.round(dMin[i]);
      const cTxt  = weatherCodeToText(dCodes[i]);
      lines.push(`${wd}: ${max}° / ${min}°  ${cTxt}`);
    }

    weatherDataEl.innerHTML = lines.join("<br>");
    setMoodTextFromCode(wCode);
  } catch (e) {
    console.error(e);
    weatherDataEl.textContent =
      language === "ko"
        ? "날씨 정보를 가져오는 중 오류 발생."
        : language === "ja"
        ? "天気情報の取得中にエラーが発生しました。"
        : "Error fetching weather.";
  }
}

// =======================
// EVENTS & ACTIVITY
// =======================
function logEvent(type, payload = {}) {
  const ev = {
    type,
    user: currentUser,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  events.push(ev);
  save(STORAGE_KEY_EVENTS, events);
  updateActivityBox();
}

function updateActivityBox() {
  if (!recentUpdateEl) return;
  if (!events.length) {
    recentUpdateEl.textContent =
      language === "ko"
        ? "최근 활동이 없습니다."
        : language === "ja"
        ? "最近の活動はありません。"
        : "No recent activity.";
    return;
  }
  const last = events[events.length - 1];
  let text = "";
  if (last.type === "book_add") {
    text = `${last.user} added "${last.bookTitle}"`;
  } else if (last.type === "progress") {
    text = `${last.user} updated "${last.bookTitle}" to ${last.toPages}p`;
  } else if (last.type === "comment") {
    text = `${last.user} commented on "${last.bookTitle}"`;
  } else if (last.type === "user_add") {
    text = `${last.user} created user "${last.targetUser}"`;
  } else if (last.type === "user_remove") {
    text = `${last.user} removed user "${last.targetUser}"`;
  } else if (last.type === "book_remove") {
    text = `${last.user} removed "${last.bookTitle}"`;
  } else if (last.type === "password_self") {
    text = `${last.user} changed their password`;
  } else if (last.type === "password_admin") {
    text = `${last.user} set password for "${last.targetUser}"`;
  } else {
    text = `${last.user} did ${last.type}`;
  }
  recentUpdateEl.textContent = text;
}

// =======================
// PERMISSIONS
// =======================
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

// =======================
// COMMANDS
// =======================
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
  addLine("  add                    – add new book");
  addLine("  edit <id>              – edit book meta");
  addLine("  update <id> <page>     – update pages read");
  addLine("  comment <id> <text>    – add comment");
  addLine("  remove <id>            – remove book");
}

function cmd_list(args) {
  let list = books;
  if (args[0]) {
    const u = args[0];
    list = books.filter((b) => b.owner === u);
    if (!list.length) {
      addLine("No books for user " + u, "error");
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

function cmd_login() {
  const username = prompt("username:");
  const pass     = prompt("password:");
  if (!username || !pass) {
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
  updatePromptLabel();
  updateSessionInfo();
  addLine(`Logged in as ${username} (${currentRole}).`, "success");
}

function cmd_logout() {
  currentUser = "guest";
  currentRole = "guest";
  updatePromptLabel();
  updateSessionInfo();
  addLine("Logged out.", "success");
}

function cmd_createuser(args) {
  if (!requireAdmin()) return;
  let username = args[0] || prompt("username:");
  if (!username) {
    addLine("No username.", "error");
    return;
  }
  if (users[username]) {
    addLine("User already exists.", "error");
    return;
  }
  const pass = prompt("password:");
  if (!pass) {
    addLine("No password.", "error");
    return;
  }
  users[username] = {
    role: "member",
    pass,
    active: true,
    createdAt: new Date().toISOString(),
  };
  save(STORAGE_KEY_USERS, users);
  addLine("User created: " + username, "success");
  logEvent("user_add", { targetUser: username });
}

function cmd_removeuser(args) {
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
  delete users[username];
  save(STORAGE_KEY_USERS, users);
  addLine("User removed: " + username, "success");
  logEvent("user_remove", { targetUser: username });
}

function cmd_listusers() {
  if (!requireAdmin()) return;
  const admins = Object.entries(users)
    .filter(([_, u]) => u.role === "admin")
    .map(([n]) => n);
  const members = Object.entries(users)
    .filter(([_, u]) => u.role === "member")
    .map(([n]) => n);

  addLine("Admins:", "success");
  admins.forEach((n) => addLine("  - " + n));
  addLine("Members:", "success");
  members.forEach((n) => addLine("  - " + n));
}

function cmd_add() {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const title  = prompt("Title:");
  const author = prompt("Author:");
  const total  = Number(prompt("Total pages:"));
  if (!title || !total) {
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
  books.push(book);
  save(STORAGE_KEY_BOOKS, books);
  refreshStats();
  renderBookStrip();
  refreshReaders();
  addLine(`Book added with id ${id}.`, "success");
  logEvent("book_add", { bookId: id, bookTitle: title });
}

function cmd_edit(args) {
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
  const newTitle  = prompt("New title:", book.title);
  const newAuthor = prompt("New author:", book.author);
  const newTotal  = Number(prompt("New total pages:", book.totalPages));

  if (newTitle)  book.title  = newTitle;
  if (newAuthor) book.author = newAuthor;
  if (newTotal)  book.totalPages = newTotal;
  book.lastUpdate = new Date().toISOString();
  save(STORAGE_KEY_BOOKS, books);
  refreshStats();
  renderBookStrip();
  refreshReaders();
  addLine("Book updated.", "success");
}

function cmd_update(args) {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const id    = Number(args[0]);
  const pages = Number(args[1]);
  const book  = books.find((b) => b.id === id);
  if (!book || isNaN(pages)) {
    addLine("Usage: update <id> <page>", "error");
    return;
  }
  if (!canEditBook(book)) {
    addLine("Not your book.", "error");
    return;
  }
  const from = book.pagesRead || 0;
  book.pagesRead = Math.min(pages, book.totalPages || pages);
  const to    = book.pagesRead;
  const delta = to - from;
  book.lastUpdate = new Date().toISOString();
  save(STORAGE_KEY_BOOKS, books);
  refreshStats();
  renderBookStrip();
  refreshReaders();
  addLine("Progress updated.", "success");

  logEvent("progress", {
    bookId: book.id,
    bookTitle: book.title,
    fromPages: from,
    toPages: to,
    deltaPages: delta,
  });
}

function cmd_comment(args) {
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
  save(STORAGE_KEY_BOOKS, books);
  refreshStats();
  renderBookStrip();
  refreshReaders();
  addLine("Comment added.", "success");

  logEvent("comment", {
    bookId: book.id,
    bookTitle: book.title,
    commentText: text,
  });
}

function cmd_remove(args) {
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
  books.splice(idx, 1);
  save(STORAGE_KEY_BOOKS, books);
  refreshStats();
  renderBookStrip();
  refreshReaders();
  addLine("Book removed.", "success");
  logEvent("book_remove", { bookId: book.id, bookTitle: book.title });
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

function cmd_changepass() {
  if (currentUser === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const oldp = prompt("Old password:");
  if (!oldp) return;
  if (users[currentUser].pass !== oldp) {
    addLine("Incorrect password.", "error");
    return;
  }
  const newp = prompt("New password:");
  if (!newp) {
    addLine("No new password.", "error");
    return;
  }
  users[currentUser].pass = newp;
  save(STORAGE_KEY_USERS, users);
  addLine("Password updated.", "success");
  logEvent("password_self", {});
}

function cmd_setpass(args) {
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
  const newp = prompt(`New password for ${target}:`);
  if (!newp) {
    addLine("No new password.", "error");
    return;
  }
  users[target].pass = newp;
  save(STORAGE_KEY_USERS, users);
  addLine(`Password reset for ${target}.`, "success");
  logEvent("password_admin", { targetUser: target });
}

// =======================
// COMMAND DISPATCH
// =======================
function handleCommand(input) {
  const raw = input.trim();
  if (!raw) return;
  addLine("&gt; " + raw);

  const parts = raw.split(" ");
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  switch (cmd) {
    case "help":       cmd_help(); break;
    case "list":       cmd_list(args); break;
    case "view":       cmd_view(args); break;
    case "lang":       cmd_lang(args); break;
    case "login":      cmd_login(); break;
    case "logout":     cmd_logout(); break;
    case "createuser": cmd_createuser(args); break;
    case "removeuser": cmd_removeuser(args); break;
    case "listusers":  cmd_listusers(); break;
    case "add":        cmd_add(); break;
    case "edit":       cmd_edit(args); break;
    case "update":     cmd_update(args); break;
    case "comment":    cmd_comment(args); break;
    case "remove":     cmd_remove(args); break;
    case "weather":    cmd_weather(); break;
    case "changepass": cmd_changepass(); break;
    case "setpass":    cmd_setpass(args); break;
    default:
      addLine("Unknown command: " + cmd, "error");
  }
}

// input handler
if (terminalInput) {
  terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = terminalInput.value;
      terminalInput.value = "";
      handleCommand(v);
    }
  });
}

// =======================
// INIT
// =======================
initState();
updatePromptLabel();
updateUILabels();
updateClock();
fetchWeather();

addLine(
  "Welcome to <span class='accent'>Coffee with a Book</span> ☕📖",
  "success"
);
addLine("Type <span class='accent'>help</span> for available commands.");


