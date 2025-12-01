// =============================
//  STORAGE KEYS & GLOBAL STATE
// =============================
const STORAGE_KEY_LANG   = "coffee_console_lang";
const STORAGE_KEY_USERS  = "coffee_console_users_v1";
const STORAGE_KEY_BOOKS  = "coffee_console_books_v1";
const STORAGE_KEY_EVENTS = "coffee_console_events_v1";

const DEFAULT_ADMIN = "loaa";

let language    = localStorage.getItem(STORAGE_KEY_LANG) || "en"; // "en" | "ko" | "ja"
let currentUser = "guest";
let currentRole = "guest";  // "guest" | "admin" | "member"

let users  = {};   // username -> { role, pass, active, createdAt }
let books  = [];   // { id, owner, title, author, totalPages, pagesRead, comments, lastUpdate }
let events = [];   // log of actions

// =============================
//  DOM REFERENCES
// =============================
const langButtonsEl   = document.getElementById("langButtons");
const clockEl         = document.getElementById("clock");
const dateEl          = document.getElementById("date");

const statBooksEl     = document.getElementById("stat-books");
const statProgressEl  = document.getElementById("stat-progress");
const statFinishedEl  = document.getElementById("stat-finished");
const statPagesEl     = document.getElementById("stat-pages");

const sessionInfoEl   = document.getElementById("sessionInfo");

const weatherDataEl   = document.getElementById("weatherData");
const readerListEl    = document.getElementById("readerList");
const quoteTextEl     = document.getElementById("quoteText");
const vocabTextEl     = document.getElementById("vocabText");
const moodTextEl      = document.getElementById("moodText");
const fireplaceEl     = document.getElementById("fireplace");

const liveFeedEl      = document.getElementById("liveFeed");
const terminalOutput  = document.getElementById("terminalOutput");
const terminalInput   = document.getElementById("terminalInput");

const recentUpdateEl  = document.getElementById("recentUpdate");
const bookStripEl     = document.getElementById("bookStrip");

// =============================
//  BASIC UTILITIES
// =============================
function addLine(text, cls) {
  const div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  div.innerHTML = text;
  terminalOutput.appendChild(div);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
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
  if (!users[DEFAULT_ADMIN]) {
    users[DEFAULT_ADMIN] = {
      role: "admin",
      pass: "books!2026",
      active: true,
      createdAt: new Date().toISOString(),
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

// =============================
//  CLOCK & DATE
// =============================
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

// =============================
//  LANGUAGE / LABELS
// =============================
function updateSessionInfo() {
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
  // highlight active language button
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
  t("activityLabel", "ACTIVITY", "활동", "アクティビティ");
  t("weatherTitle", "WEATHER", "날씨", "天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ数");

  updateSessionInfo();
  updateClock();
  refreshStats();
  renderBookStrip();
  refreshReaders();
  renderQuoteAndVocab();
  renderFeed();
  updateActivityBox();
  fetchWeather();

  localStorage.setItem(STORAGE_KEY_LANG, language);
}

document.querySelectorAll(".langBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    language = btn.dataset.lang;
    updateUILabels();
  });
});

// =============================
//  STATS & BOOK STRIP
// =============================
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

  statBooksEl.textContent = totalBooks;
  statFinishedEl.textContent = finished;
  statProgressEl.textContent = inProgress;
  statPagesEl.textContent = pagesRead;
}

function renderBookStrip() {
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

// =============================
//  READERS / QUOTE / VOCAB / MOOD
// =============================
function refreshReaders() {
  const perUser = {};
  books.forEach((b) => {
    if (b.pagesRead > 0) {
      perUser[b.owner] = (perUser[b.owner] || 0) + b.pagesRead;
    }
  });

  const names = Object.keys(perUser);
  if (!names.length) {
    readerListEl.textContent =
      language === "ko"
        ? "아직 읽는 사람이 없습니다."
        : language === "ja"
        ? "まだ読んでいる人はいません。"
        : "No one is reading yet.";
    return;
  }

  const lines = names
    .sort()
    .map((name) => `${name} → ${perUser[name]}p`);
  readerListEl.innerHTML = lines.join("<br>");
}

function renderQuoteAndVocab() {
  quoteTextEl.innerHTML =
    `"本は心の窓である"<br>` +
    `책은 마음의 창이다<br>` +
    `<i>Books are windows of the soul</i>`;

  vocabTextEl.innerHTML =
    `巡り合う（めぐりあう）<br>` +
    `우연히 만나다<br>` +
    `<i>to encounter by chance</i>`;
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
  const txt =
    language === "ko" ? mood.ko : language === "ja" ? mood.ja : mood.en;
  moodTextEl.textContent = txt;
}

// =============================
//  FIREPLACE ANIMATION 🔥
// =============================
const fireplaceFrames = [
  "    (  🔥  )\n   ( 🔥🔥 )\n    (  🔥  )",
  "    ( 🔥 )\n   (🔥🔥🔥)\n    ( 🔥 )",
  "     🔥  \n   (🔥🔥🔥)\n    🔥🔥 "
];
let fireplaceIndex = 0;

setInterval(() => {
  if (!fireplaceEl) return;
  fireplaceEl.textContent = fireplaceFrames[fireplaceIndex];
  fireplaceIndex = (fireplaceIndex + 1) % fireplaceFrames.length;
}, 900);

// =============================
//  WEATHER (DAEGU)
// =============================
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
    45:{ en: "Fog", ko: "안개", ja: "霧" },
    48:{ en: "Foggy", ko: "짙은 안개", ja: "濃い霧" },
    51:{ en: "Drizzle", ko: "이슬비", ja: "霧雨" },
    61:{ en: "Rain", ko: "비", ja: "雨" },
    71:{ en: "Snow", ko: "눈", ja: "雪" },
    80:{ en: "Rain showers", ko: "소나기", ja: "にわか雨" },
    95:{ en: "Thunderstorm", ko: "뇌우", ja: "雷雨" },
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

    const cw    = data.current_weather;
    const temp  = Math.ceil(cw.temperature);
    const wCode = cw.weathercode;

    // humidity
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

    // next 3 days (ceil temps)
    for (let i = 1; i <= 3 && i < dTimes.length; i++) {
      const dDate = new Date(dTimes[i]);
      const wd    = getWeekdayName(dDate.getDay());
      const max   = Math.ceil(dMax[i]);
      const min   = Math.ceil(dMin[i]);
      const cTxt  = weatherCodeToText(dCodes[i]);
      lines.push(`${wd}: ${max}° / ${min}°  ${cTxt}`);
    }

    weatherDataEl.innerHTML = lines.join("<br>");

    // mood according to weather
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

// =============================
//  EVENTS / FEED / ACTIVITY
// =============================
function logEvent(ev) {
  ev.timestamp = ev.timestamp || new Date().toISOString();
  events.push(ev);
  saveEvents();
  renderFeed();
  updateActivityBox();
}

function renderFeed() {
  liveFeedEl.innerHTML = "";
  if (!events.length) {
    liveFeedEl.textContent =
      language === "ko"
        ? "아직 활동이 없습니다."
        : language === "ja"
        ? "まだ活動はありません。"
        : "No activity yet.";
    return;
  }

  const recent = events
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  recent.forEach((ev) => {
    const div = document.createElement("div");
    const time = new Date(ev.timestamp).toLocaleString(
      language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US",
      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    );
    const user = ev.user || ev.ownerUser || "unknown";
    let line = "";

    if (ev.type === "book_add") {
      line = `+ ${user} added "${ev.bookTitle}"`;
    } else if (ev.type === "progress") {
      line = `⬆ ${user}: "${ev.bookTitle}" ${ev.fromPages}→${ev.toPages} (+${ev.deltaPages})`;
    } else if (ev.type === "comment") {
      line = `💬 ${user} on "${ev.bookTitle}": "${ev.commentText}"`;
    } else if (ev.type === "book_remove") {
      line = `− ${user} removed "${ev.bookTitle}"`;
    } else if (ev.type === "user_add") {
      line = `👥 ${user} created user "${ev.targetUser}"`;
    } else if (ev.type === "user_remove") {
      line = `👥 ${user} removed user "${ev.targetUser}"`;
    } else if (ev.type === "password_self") {
      line = `🔑 ${user} updated their password`;
    } else if (ev.type === "password_admin") {
      line = `🔑 ${user} reset password for "${ev.targetUser}"`;
    } else {
      line = `${user} did ${ev.type}`;
    }

    div.innerHTML = `${line}<br><span class="accent-amber">${time}</span>`;
    liveFeedEl.appendChild(div);
  });
}

function updateActivityBox() {
  if (!events.length) {
    recentUpdateEl.textContent =
      language === "ko"
        ? "최근 활동이 없습니다."
        : language === "ja"
        ? "最近の活動はありません。"
        : "No recent activity.";
    return;
  }
  const last = events.slice().sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )[0];

  const user = last.user || last.ownerUser || "unknown";
  let text = "";
  if (last.type === "book_add") {
    text = `${user} added "${last.bookTitle}"`;
  } else if (last.type === "progress") {
    text = `${user} updated "${last.bookTitle}" to ${last.toPages}p`;
  } else if (last.type === "comment") {
    text = `${user} commented on "${last.bookTitle}"`;
  } else if (last.type === "user_add") {
    text = `${user} created user "${last.targetUser}"`;
  } else if (last.type === "user_remove") {
    text = `${user} removed user "${last.targetUser}"`;
  } else if (last.type === "book_remove") {
    text = `${user} removed "${last.bookTitle}"`;
  } else if (last.type === "password_self") {
    text = `${user} changed their password`;
  } else if (last.type === "password_admin") {
    text = `${user} set password for "${last.targetUser}"`;
  } else {
    text = `${user} did ${last.type}`;
  }
  recentUpdateEl.textContent = text;
}

// =============================
//  PERMISSIONS
// =============================
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

// =============================
//  COMMANDS
// =============================
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
