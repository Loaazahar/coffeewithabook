<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Coffee With A Book</title>
  <link rel="stylesheet" href="style.css" />
</head>

<body>
  <div class="dashboard">

    <!-- ───────── LEFT PANEL ───────── -->
    <div class="panel panel-left">

      <div id="titleLabel" class="big-title">COFFEE WITH A BOOK</div>

      <div id="langButtons">
        <button class="langBtn" data-lang="en">EN</button>
        <button class="langBtn" data-lang="ko">한국어</button>
        <button class="langBtn" data-lang="ja">日本語</button>
      </div>

      <!-- TIME -->
      <div class="time-block">
        <div id="clock" class="time">00:00:00</div>
        <div id="date" class="date">---</div>
      </div>

      <!-- STATS -->
      <div class="stats-block">
        <div id="statLabel" class="stats-title">SESSION / STATS</div>
        <div class="stats-grid">
          <div class="stat-row"><span id="lblBooks">Books</span><span id="stat-books">0</span></div>
          <div class="stat-row"><span id="lblProgress">In Progress</span><span id="stat-progress">0</span></div>
          <div class="stat-row"><span id="lblFinished">Finished</span><span id="stat-finished">0</span></div>
          <div class="stat-row"><span id="lblPages">Pages Read</span><span id="stat-pages">0</span></div>
        </div>
      </div>

      <!-- SESSION INFO -->
      <div class="session-block">
        <div id="sessionTitle" class="stats-title">SESSION INFO</div>
        <div id="sessionInfo" class="session-lines"></div>
      </div>

      <!-- WEATHER -->
      <div class="weather-block">
        <div class="stats-title" id="weatherTitle">WEATHER</div>
        <div id="weatherData" class="weather-text">Loading…</div>
      </div>

      <!-- CURRENT READERS -->
      <div class="reader-block">
        <div class="stats-title">📘 CURRENT READERS</div>
        <div id="readerList" class="reader-text">---</div>
      </div>

      <!-- QUOTE -->
      <div class="quote-block">
        <div class="stats-title">QUOTE</div>
        <div id="quoteText" class="quote-text">---</div>
      </div>

      <!-- VOCAB -->
      <div class="vocab-block">
        <div class="stats-title">VOCAB</div>
        <div id="vocabText" class="vocab-text">---</div>
      </div>

      <!-- MOOD -->
      <div class="mood-block">
        <div class="stats-title">MOOD</div>
        <div id="moodText" class="mood-text">---</div>
        <pre id="fireplace" class="fireplace"></pre>
      </div>

    </div> <!-- left panel end -->



    <!-- ───────── CENTER PANEL ───────── -->
    <div class="panel terminal-area">
      <div class="terminal-header" id="shellLabel">MAIN SHELL</div>

      <!-- LIVE FEED -->
      <div id="liveFeed" class="live-feed"></div>

      <!-- TERMINAL -->
      <div id="terminalOutput" class="terminal-output"></div>
      <div class="terminal-input-bar">
        <span class="prompt-label">&gt;</span>
        <input id="terminalInput" autocomplete="off" />
      </div>
    </div>



    <!-- ───────── RIGHT PANEL ───────── -->
    <div class="panel panel-right">
      <div class="recent-block">
        <div id="activityLabel" class="stats-title">ACTIVITY</div>
        <div id="recentUpdate" class="recent-text">---</div>
      </div>
    </div>



    <!-- ───────── FOOTER ───────── -->
    <div class="footer-bar">
      <div id="bookshelfLabel" class="footer-header">BOOKSHELF</div>
      <div id="bookStrip" class="book-strip"></div>
    </div>

  </div>

<script src="script.js"></script>
</body>
</html>
