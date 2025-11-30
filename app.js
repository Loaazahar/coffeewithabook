// ---------- STORAGE KEYS ----------
const STORAGE_KEY_BOOKS = "coffee_console_books";
const STORAGE_KEY_LANG = "coffee_console_lang";
const STORAGE_KEY_USERS = "coffee_console_users_v1";
const STORAGE_KEY_EVENTS = "coffee_console_events_v1";

// ---------- STATE ----------
let language = localStorage.getItem(STORAGE_KEY_LANG) || "en"; // "en" | "ko" | "ja"

let users = {};          // username -> { role, pass, active }
let currentUser = "guest";
let currentRole = "guest"; // "guest" | "admin" | "member"

let books = [];          // [{ id, owner, title, author, totalPages, pagesRead, comments, lastUpdate }]
let events = [];         // activity events (for feed + streak)

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

// ---------- UTILITIES ----------
function addLine(text, cls) {
  const line = document.createElement("div");
  line.className = "line" + (cls ? " " + cls : "");
  line.innerHTML = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

function loadUsers() {
  const saved = localStorage.getItem(STORAGE_KEY_USERS);
  if (saved) {
    try {
      users = JSON.parse(saved);
    } catch {
      users = {};
    }
  } else {
    users = {};
  }
  // ensure default admin exists
  if (!users[DEFAULT_ADMIN]) {
    users[DEFAULT_ADMIN] = {
      role: "admin",
      pass: "books!2026",
      active: true,
      createdAt: new Date().toISOString()
    };
    saveUsers();
  }
}

function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
  if (saved) {
    try {
      books = JSON.parse(saved);
    } catch {
      books = [];
    }
  } else {
    books = [];
  }
  // ensure owner + defaults
  books.forEach((b) => {
    if (!b.owner) b.owner = DEFAULT_ADMIN;
    if (!b.comments) b.comments = [];
    if (!b.lastUpdate) b.lastUpdate = new Date().toISOString();
  });
}

function loadEvents() {
  const saved = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (saved) {
    try {
      events = JSON.parse(saved);
    } catch {
      events = [];
    }
  } else {
    events = [];
  }
}

function formatPercent(book) {
  if (!book.totalPages) return 0;
  return Math.round((book.pagesRead / book.totalPages) * 100);
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
    el.textContent =
      language === "ko" ? ko : language === "ja" ? ja : en;
  };

  t("titleLabel", "COFFEE WITH A BOOK", "책과 커피", "本とコーヒー");
  t("statLabel", "SESSION / STATS", "세션 / 통계", "セッション / 統計");
  t("sessionTitle", "SESSION INFO", "세션 정보", "セッション情報");
  t("bookshelfLabel", "BOOKSHELF", "책 목록", "本棚");
  t("shellLabel", "MAIN SHELL", "메인 셸", "メインシェル");
  t("activityLabel", "ACTIVITY", "활동", "アクティビティ");
  t("streakLabel", "READING STREAK", "읽기 기록", "読書記録");
  t("lastUpdateLabel", "RECENT ACTIVITY", "최근 활동", "最近のアクティビティ");
  t("weatherTitle", "WEATHER", "날씨", "天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ수");
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

// language button clicks
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

// ---------- EVENTS / FEED / ACTIVITY ----------
function logEvent(ev) {
  ev.timestamp = ev.timestamp || new Date().toISOString();
  events.push(ev);
  saveEvents();
  renderFeed();
  updateActivitySidebar();
  updateStreak();
}

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

  // group by user -> book
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
  const latest = events.slice().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )[0];

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
  } else {
    text = `${user} did ${latest.type}`;
  }

  recentUpdateEl.textContent = text;
}

// ---------- STREAK ----------
function updateStreak() {
  // streak for currentUser (progress events)
  const myEvents = events.filter(
    (ev) => ev.type === "progress" && (ev.ownerUser === currentUser || ev.user === currentUser)
  );
  if (!myEvents.length) {
    streakTextEl.textContent =
      language === "ko"
        ? "아직 읽기 기록이 없습니다."
        : language === "ja"
        ? "まだ読書記録はありません。"
        : "No reading streak yet.";
    return;
  }

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, date: d, pages: 0 });
  }

  myEvents.forEach((ev) => {
    const dayKey = ev.timestamp.slice(0, 10);
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

  // compute streak (consecutive days from today backward)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].pages > 0) streak++;
    else break;
  }

  const lines = [];
  if (language === "ko") {
    lines.push(`연속 일수: ${streak}일`);
  } else if (language === "ja") {
    lines.push(`連続日数: ${streak}日`);
  } else {
    lines.push(`Streak: ${streak} day(s)`);
  }

  days.forEach((d) => {
    const wd = getWeekdayName(d.date.getDay());
    const has = d.pages > 0;
    const mark = has ? "✔" : "✖";
    lines.push(`${wd}: ${mark} ${d.pages} pages`);
  });

  streakTextEl.innerHTML = lines.join("<br>");
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

    if (!data.current_weather || !data.daily) {
      weatherDataEl.textContent =
        language === "ko"
          ? "날씨 데이터를 불러올 수 없습니다."
          : language === "ja"
          ? "天気データを取得できません。"
          : "Unable to load weather data.";
      return;
    }

    const cw = data.current_weather;
    const temp = cw.temperature;
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

    const lines = [];

    let headingLine, todayLine, humStr, nextTitle;
    const condText = weatherCodeToText(wCode);

    if (language === "ko") {
      headingLine = "대구 날씨";
      todayLine = `오늘: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `습도: ${humidity}%` : "";
      nextTitle = "3일 예보:";
    } else if (language === "ja") {
      headingLine = "大邱の天気";
      todayLine = `今日: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `湿度: ${humidity}%` : "";
      nextTitle = "3日間の予報:";
    } else {
      headingLine = "DAEGU WEATHER";
      todayLine = `Today: ${temp}°C, ${condText}`;
      humStr = humidity != null ? `Humidity: ${humidity}%` : "";
      nextTitle = "Next 3 days:";
    }

    lines.push(headingLine);
    lines.push(todayLine);
    if (humStr) lines.push(humStr);
    lines.push("");
    lines.push(nextTitle);

    for (let i = 1; i <= 3 && i < dTimes.length; i++) {
      const dDate = new Date(dTimes[i]);
      const wd = getWeekdayName(dDate.getDay());
      const max = dMax[i];
      const min = dMin[i];
      const dCond = weatherCodeToText(dCodes[i]);
      lines.push(`${wd}: ${max}° / ${min}°  ${dCond}`);
    }

    weatherDataEl.innerHTML = lines.join("<br>");
  } catch (e) {
    weatherDataEl.textContent =
      language === "ko"
        ? "날씨 정보를 가져오는 중 오류 발생."
        : language === "ja"
        ? "天気情報の取得中にエラーが発生しました。"
        : "Error fetching weather.";
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
  addLine("  list [user]            – list books");
  addLine("  view <id>              – view one book");
  addLine("  weather                – refresh Daegu weather");
  addLine("  lang en|ko|ja          – change UI language");
  addLine("  login                  – login as user");
  addLine("  logout                 – logout");
  addLine("  changepass             – change your password");
  addLine("Admin:");
  addLine("  createuser <name>      – create user");
  addLine("  removeuser <name>      – remove user");
  addLine("  setpass <username>     – set password for a user");
  addLine("  add                    – add new book");
  addLine("  edit <id>              – edit book meta");
  addLine("  update <id> <page>     – update pages read");
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

function cmd_login() {
  const username = prompt("username:");
  const pass = prompt("password:");
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
  updateUserLabel();
  updateSessionInfo();
  addLine("Logged in as " + username + " (" + currentRole + ").", "success");
}

function cmd_logout() {
  currentUser = "guest";
  currentRole = "guest";
  updateUserLabel();
  updateSessionInfo();
  addLine("Logged out.", "success");
}

function cmd_createuser(args) {
  if (!requireAdmin()) return;
  let username = args[0];
  if (!username) {
    username = prompt("username:");
  }
  if (!username) {
    addLine("No username provided.", "error");
    return;
  }
  if (users[username]) {
    addLine("User already exists.", "error");
    return;
  }
  const pass = prompt("password:");
  if (!pass) {
    addLine("No password provided.", "error");
    return;
  }
  users[username] = {
    role: "member",
    pass,
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveUsers();
  addLine("User created: " + username, "success");
  logEvent({ type: "user_add", user: currentUser, targetUser: username });
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
  saveUsers();
  addLine("User removed: " + username, "success");
  logEvent({ type: "user_remove", user: currentUser, targetUser: username });
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

function cmd_add() {
  if (currentRole === "guest") {
    addLine("Login required to add books.", "error");
    return;
  }
  const title = prompt("Title:");
  const author = prompt("Author:");
  const total = Number(prompt("Total pages:"));
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
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine(`Book added with id ${id}.`, "success");
  logEvent({
    type: "book_add",
    user: currentUser,
    ownerUser: currentUser,
    bookId: id,
    bookTitle: title,
  });
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
  const newTitle = prompt("New title:", book.title);
  const newAuthor = prompt("New author:", book.author);
  const newTotal = Number(prompt("New total pages:", book.totalPages));

  if (newTitle) book.title = newTitle;
  if (newAuthor) book.author = newAuthor;
  if (newTotal) book.totalPages = newTotal;
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Book updated.", "success");
}

function cmd_update(args) {
  if (currentRole === "guest") {
    addLine("Login required.", "error");
    return;
  }
  const id = Number(args[0]);
  const pages = Number(args[1]);
  const book = books.find((b) => b.id === id);
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
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Progress updated.", "success");

  const to = book.pagesRead;
  const delta = to - from;
  logEvent({
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
  saveBooks();
  refreshStats();
  addLine("Comment added.", "success");

  logEvent({
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
  saveBooks();
  refreshStats();
  renderBookStrip();
  addLine("Book removed.", "success");
  logEvent({
    type: "book_remove",
    user: currentUser,
    ownerUser: book.owner,
    bookId: book.id,
    bookTitle: book.title,
  });
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
    addLine("No new password entered.", "error");
    return;
  }
  users[currentUser].pass = newp;
  saveUsers();
  addLine("Password updated.", "success");
  logEvent({
    type: "password_self",
    user: currentUser
  });
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
    addLine("No new password entered.", "error");
    return;
  }
  users[target].pass = newp;
  saveUsers();
  addLine(`Password reset for ${target}`, "success");
  logEvent({
    type: "password_admin",
    user: currentUser,
    targetUser: target
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

// ---------- COMMAND DISPATCH ----------
function handleCommand(input) {
  const raw = input.trim();
  if (!raw) return;
  addLine("> " + raw);

  const parts = raw.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help": cmd_help(); break;
    case "list": cmd_list(args); break;
    case "view": cmd_view(args); break;
    case "lang": cmd_lang(args); break;
    case "login": cmd_login(); break;
    case "logout": cmd_logout(); break;
    case "createuser": cmd_createuser(args); break;
    case "removeuser": cmd_removeuser(args); break;
    case "listusers": cmd_listusers(); break;
    case "add": cmd_add(); break;
    case "edit": cmd_edit(args); break;
    case "update": cmd_update(args); break;
    case "comment": cmd_comment(args); break;
    case "remove": cmd_remove(args); break;
    case "weather": cmd_weather(); break;
    case "changepass": cmd_changepass(); break;
    case "setpass": cmd_setpass(args); break;
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
  }
});

// ---------- INIT ----------
loadUsers();
loadBooks();
loadEvents();
updateUserLabel();
updateClock();
refreshStats();
renderBookStrip();
updateUILabels(); // also fetches weather, feed, activity, streak

