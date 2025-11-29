// ------------ STATE & STORAGE -------------

let books = []; // start empty; you will add via console
const STORAGE_KEY_BOOKS = "coffee_console_books";
const STORAGE_KEY_LANG = "coffee_console_lang";

let language = localStorage.getItem(STORAGE_KEY_LANG) || "en"; // "en", "ko", "ja"
let isAdmin = false;
let currentUser = "guest";

const ADMIN_USERNAME = "loaa";
const ADMIN_PASSWORD = "books!2026";

// ------------ DOM ELEMENTS -------------

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

// ------------ UTILITIES -------------

function addLine(text, cls) {
  const line = document.createElement("div");
  line.className = "line" + (cls ? " " + cls : "");
  line.innerHTML = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
  if (saved) {
    try {
      books = JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse books", e);
      books = [];
    }
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
}

function formatPercent(book) {
  if (!book.totalPages) return 0;
  return Math.round((book.pagesRead / book.totalPages) * 100);
}

function formatBookLine(book) {
  const pct = formatPercent(book);
  return `[#${book.id}] ${book.title} — ${pct}%`;
}

function updateUserLabel() {
  const role = isAdmin ? "admin" : "guest";
  userLabelEl.textContent = `${currentUser}@coffee-console (${role})`;
}

function updateSessionInfo() {
  const role = isAdmin ? "admin" : "guest";
  const access = isAdmin ? "read/write" : "read-only";
  if (language === "ko") {
    sessionInfoEl.innerHTML =
      `역할: ${role}<br/>권한: ${access}<br/>cmd: <span class="accent">help</span>`;
  } else if (language === "ja") {
    sessionInfoEl.innerHTML =
      `ロール: ${role}<br/>権限: ${access}<br/>cmd: <span class="accent">help</span>`;
  } else {
    sessionInfoEl.innerHTML =
      `role: ${role}<br/>access: ${access}<br/>cmd: type <span class="accent">help</span>`;
  }
}

// ------------ CLOCK & DATE -------------

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

// ------------ STATS & ACTIVITY -------------

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

  updateActivityFromBooks();
}

function updateActivityFromBooks() {
  if (!books.length) {
    recentUpdateEl.textContent =
      language === "ko"
        ? "업데이트가 없습니다."
        : language === "ja"
        ? "更新はありません。"
        : "No updates yet.";
    return;
  }
  const latest = [...books].sort(
    (a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)
  )[0];
  const pct = formatPercent(latest);

  const timeStr = new Date(latest.lastUpdate).toLocaleString(
    language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US"
  );

  if (language === "ko") {
    recentUpdateEl.innerHTML =
      `[#${latest.id}] ${latest.title}<br>` +
      `${latest.pagesRead}/${latest.totalPages} 페이지 (${pct}%)<br>` +
      `<span class="accent-amber">업데이트: ${timeStr}</span>`;
  } else if (language === "ja") {
    recentUpdateEl.innerHTML =
      `[#${latest.id}] ${latest.title}<br>` +
      `${latest.pagesRead}/${latest.totalPages} ページ (${pct}%)<br>` +
      `<span class="accent-amber">更新: ${timeStr}</span>`;
  } else {
    recentUpdateEl.innerHTML =
      `[#${latest.id}] ${latest.title}<br>` +
      `${latest.pagesRead}/${latest.totalPages} pages (${pct}%)<br>` +
      `<span class="accent-amber">updated: ${timeStr}</span>`;
  }
}

function setActivityCustom(messageEn, messageKo, messageJa) {
  if (language === "ko" && messageKo) {
    recentUpdateEl.textContent = messageKo;
  } else if (language === "ja" && messageJa) {
    recentUpdateEl.textContent = messageJa;
  } else {
    recentUpdateEl.textContent = messageEn;
  }
}

// ------------ BOOK STRIP -------------

function renderBookStrip() {
  bookStripEl.innerHTML = "";
  books.forEach((book) => {
    const pct = formatPercent(book);
    const tile = document.createElement("button");
    tile.className = "book-tile" + (pct >= 100 ? " finished" : "");
    const progressText = `${book.pagesRead}/${book.totalPages} (${pct}%)`;
    tile.innerHTML = `
      <span class="title">${book.title}</span>
      <span class="meta">${book.author}</span>
      <span class="progress">${progressText}</span>
    `;
    tile.addEventListener("click", () => {
      cmd_view([String(book.id)]);
    });
    bookStripEl.appendChild(tile);
  });
}

// ------------ LANGUAGE LABELS -------------

function updateUILabels() {
  // highlight active button
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
  t("lastUpdateLabel", "LAST UPDATE", "최근 업데이트", "最新更新");
  t("weatherTitle", "WEATHER", "날씨", "天気");
  t("lblBooks", "Books", "책 수", "冊数");
  t("lblFinished", "Finished", "다 읽음", "読了");
  t("lblProgress", "In Progress", "진행중", "進行中");
  t("lblPages", "Pages Read", "읽은 페이지", "読んだページ数");

  updateSessionInfo();
  updateClock();
  refreshStats();
  fetchWeather(); // re-render weather text in new language
  localStorage.setItem(STORAGE_KEY_LANG, language);
}

// ------------ LANGUAGE BUTTON EVENTS -------------

document.querySelectorAll(".langBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    language = btn.dataset.lang;
    updateUILabels();
  });
});

// ------------ WEATHER (DAEGU) -------------

// Daegu coords
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

    // find humidity from hourly
    let humidity = null;
    if (data.hourly) {
      const tIndex = data.hourly.time.indexOf(cw.time);
      if (tIndex >= 0) {
        humidity = data.hourly.relativehumidity_2m[tIndex];
      }
    }

    // daily forecast (index 0 = today)
    const dTimes = data.daily.time;
    const dMax = data.daily.temperature_2m_max;
    const dMin = data.daily.temperature_2m_min;
    const dCodes = data.daily.weathercode;

    let lines = [];

    // Today line
    const condText = weatherCodeToText(wCode);
    let todayLine, feelsStr, humStr, headingLine, nextTitle;

    if (language === "ko") {
      headingLine = "대구 날씨";
      todayLine = `오늘: ${temp}°C, ${condText}`;
      feelsStr = ""; // open-meteo doesn't give feels-like; skip
      humStr = humidity != null ? `습도: ${humidity}%` : "";
      nextTitle = "3일 예보:";
    } else if (language === "ja") {
      headingLine = "大邱の天気";
      todayLine = `今日: ${temp}°C, ${condText}`;
      feelsStr = "";
      humStr = humidity != null ? `湿度: ${humidity}%` : "";
      nextTitle = "3日間の予報:";
    } else {
      headingLine = "DAEGU WEATHER";
      todayLine = `Today: ${temp}°C, ${condText}`;
      feelsStr = "";
      humStr = humidity != null ? `Humidity: ${humidity}%` : "";
      nextTitle = "Next 3 days:";
    }

    lines.push(headingLine);
    lines.push(todayLine);
    if (feelsStr) lines.push(feelsStr);
    if (humStr) lines.push(humStr);
    lines.push("");
    lines.push(nextTitle);

    // next 3 days (1,2,3)
    for (let i = 1; i <= 3 && i < dTimes.length; i++) {
      const dDate = new Date(dTimes[i]);
      const wd = getWeekdayName(dDate.getDay());
      const max = dMax[i];
      const min = dMin[i];
      const dCond = weatherCodeToText(dCodes[i]);

      if (language === "ko") {
        lines.push(`${wd}: ${max}° / ${min}°  ${dCond}`);
      } else if (language === "ja") {
        lines.push(`${wd}: ${max}° / ${min}°  ${dCond}`);
      } else {
        lines.push(`${wd}: ${max}° / ${min}°  ${dCond}`);
      }
    }

    weatherDataEl.innerHTML = lines.join("<br>");
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

// ------------ COMMANDS -------------

function cmd_help() {
  addLine("Commands:", "success");
  addLine("  help                 – show this help");
  addLine("  list                 – list books");
  addLine("  view <id>            – view one book");
  addLine("  weather              – refresh Daegu weather");
  addLine("  login                – admin login");
  addLine("  logout               – logout admin");
  addLine("Admin:");
  addLine("  add                  – add new book");
  addLine("  edit <id>            – edit book meta");
  addLine("  update <id> <page>   – update pages read");
  addLine("  comment <id> <text>  – add comment");
  addLine("Language:");
  addLine("  lang en|ko|ja        – change UI language (or click buttons)");
}

function cmd_list() {
  if (!books.length) {
    addLine("No books.", "error");
    return;
  }
  books.forEach((b) => addLine(formatBookLine(b)));
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
  addLine(`Progress: ${book.pagesRead}/${book.totalPages} (${pct}%)`);
  if (book.comments && book.comments.length) {
    addLine("Comments:");
    book.comments.forEach((c) => addLine(" • " + c));
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
  const user = prompt("username:");
  const pass = prompt("password:");
  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    isAdmin = true;
    currentUser = user;
    addLine("Admin access granted.", "success");
  } else {
    addLine("Access denied.", "error");
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
    addLine("Admin only.", "error");
    return false;
  }
  return true;
}

function cmd_add() {
  if (!requireAdmin()) return;
  const title = prompt("Title:");
  const author = prompt("Author:");
  const total = Number(prompt("Total pages:"));
  if (!title || !total) {
    addLine("Aborted.", "error");
    return;
  }
  const id = books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1;
  books.push({
    id,
    title,
    author: author || "Unknown",
    pagesRead: 0,
    totalPages: total,
    comments: [],
    lastUpdate: new Date().toISOString(),
  });
  saveBooks();
  refreshStats();
  renderBookStrip();
  setActivityCustom(
    `Added book: ${title}`,
    `책 추가: ${title}`,
    `本を追加: ${title}`
  );
  addLine(`Book added with id ${id}.`, "success");
}

function cmd_edit(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const book = books.find((b) => b.id === id);
  if (!book) {
    addLine("Book not found.", "error");
    return;
  }
  const newTitle = prompt("New title:", book.title);
  const newAuthor = prompt("New author:", book.author);
  const newTotal = Number(prompt("New total pages:", book.totalPages));

  book.title = newTitle || book.title;
  book.author = newAuthor || book.author;
  if (newTotal) book.totalPages = newTotal;
  book.lastUpdate = new Date().toISOString();

  saveBooks();
  refreshStats();
  renderBookStrip();
  setActivityCustom(
    `Edited book #${id}`,
    `책 #${id} 수정`,
    `本 #${id} を編集`
  );
  addLine("Book updated.", "success");
}

function cmd_update(args) {
  if (!requireAdmin()) return;
  const id = Number(args[0]);
  const pages = Number(args[1]);
  const book = books.find((b) => b.id === id);
  if (!book || isNaN(pages)) {
    addLine("Usage: update <id> <page>", "error");
    return;
  }
  book.pagesRead = Math.min(pages, book.totalPages || pages);
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  renderBookStrip();
  setActivityCustom(
    `Updated #${id} to ${book.pagesRead}/${book.totalPages}`,
    `#${id}: ${book.pagesRead}/${book.totalPages}페이지`,
    `#${id}: ${book.pagesRead}/${book.totalPages}ページ`
  );
  addLine("Progress updated.", "success");
}

function cmd_comment(args) {
  if (!requireAdmin()) return;
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
  book.comments.push(text);
  book.lastUpdate = new Date().toISOString();
  saveBooks();
  refreshStats();
  setActivityCustom(
    `Comment added on #${id}`,
    `#${id}에 댓글 추가`,
    `#${id} にコメント追加`
  );
  addLine("Comment added.", "success");
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

// ------------ COMMAND DISPATCH -------------

function handleCommand(input) {
  const raw = input.trim();
  if (!raw) return;
  addLine("> " + raw);

  const parts = raw.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help": cmd_help(); break;
    case "list": cmd_list(); break;
    case "view": cmd_view(args); break;
    case "lang": cmd_lang(args); break;
    case "login": cmd_login(); break;
    case "logout": cmd_logout(); break;
    case "add": cmd_add(); break;
    case "edit": cmd_edit(args); break;
    case "update": cmd_update(args); break;
    case "comment": cmd_comment(args); break;
    case "weather": cmd_weather(); break;
    default:
      addLine("Unknown command: " + cmd, "error");
  }
}

// ------------ INPUT HANDLER -------------

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const v = inputEl.value;
    inputEl.value = "";
    handleCommand(v);
  }
});

// ------------ INIT -------------

loadBooks();
updateUserLabel();
updateClock();
refreshStats();
renderBookStrip();
updateUILabels(); // also fetches weather
