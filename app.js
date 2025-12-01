// ====== STORAGE KEYS / STATE ======
const STORAGE_KEY_LANG   = "coffee_lang";
const STORAGE_KEY_USERS  = "coffee_users";
const STORAGE_KEY_BOOKS  = "coffee_books";
const STORAGE_KEY_EVENTS = "coffee_events";

const DEFAULT_ADMIN = "loaa";

let language    = localStorage.getItem(STORAGE_KEY_LANG) || "en";
let currentUser = "guest";
let currentRole = "guest"; // guest | admin | member

let users  = {};
let books  = [];
let events = [];

// ====== DOM ======
const clockEl        = document.getElementById("clock");
const dateEl         = document.getElementById("date");
const statBooksEl    = document.getElementById("stat-books");
const statProgressEl = document.getElementById("stat-progress");
const statFinishedEl = document.getElementById("stat-finished");
const statPagesEl    = document.getElementById("stat-pages");
const sessionInfoEl  = document.getElementById("sessionInfo");
const weatherDataEl  = document.getElementById("weatherData");
const currentReadersEl = document.getElementById("currentReaders");
const quoteTextEl    = document.getElementById("quoteText");
const vocabTextEl    = document.getElementById("vocabText");
const moodTextEl     = document.getElementById("moodText");
const fireplaceEl    = document.getElementById("fireplace");
const terminalOutput = document.getElementById("terminalOutput");
const terminalInput  = document.getElementById("terminalInput");
const promptUserEl   = document.getElementById("promptUser");
const recentUpdateEl = document.getElementById("recentUpdate");
const bookStripEl    = document.getElementById("bookStrip");

// ====== UTIL ======
function addLine(text, cls) {
  const div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  div.innerHTML = text;
  terminalOutput.appendChild(div);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function save(storeKey, value) {
  localStorage.setItem(storeKey, JSON.stringify(value));
}

function load(storeKey, fallback) {
  const s = localStorage.getItem(storeKey);
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function formatPercent(book) {
  if (!book.totalPages) return 0;
  return Math.round((book.pagesRead / book.totalPages) * 100);
}

function updatePromptLabel() {
  promptUserEl.textContent = `${currentUser}@coffee-console (${currentRole})`;
}

// ====== LOAD DATA ======
function initState() {
  users  = load(STORAGE_KEY_USERS, {});
  books  = load(STORAGE_KEY_BOOKS, []);
  events = load(STORAGE_KEY_EVENTS, []);

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

// ====== CLOCK ======
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${h}:${m}:${s}`;

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

// ====== LABELS / LANGUAGE ======
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

document.querySelectorAll(".langBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    language = btn.dataset.lang;
    updateUILabels();
  });
});

// ====== STATS / BOOKSTRIP ======
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
    (s, b) => s + (b.pagesRead || 0),
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

// ====== READERS / QUOTE / VOCAB / MOOD ======
function refreshReaders() {
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
  const txt =
    language === "ko" ? mood.ko : language === "ja" ? mood.ja : mood.en;
  moodTextEl.textContent = txt;
}

// FIREPLACE animation – always on
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

// ====== WEATHER (DAEGU) ======
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

    const cw    = data.current_weather;
    const temp  = Math.round(cw.temperature);
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

// ====== EVENTS / ACTIVITY ======
function logEvent(ev) {
  ev.timestamp = ev.timestamp || new Date().toISOString();
  events.push(ev);
  save(STORAGE_KEY_EVENTS, events);
  updateActivityBox();
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
  const last = events
    .slice()
