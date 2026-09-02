const START_DATE = "2026-04-03";
const MEMBERS = [
  "逢田珠里依", "天野香乃愛", "市原愛弓", "江角怜音", "大信田美月", "大西葵",
  "小澤愛実", "髙橋舞", "藤沢莉子", "村山結香", "山田杏佳", "山野愛月"
];

let DATA = { subscribers: [], videos: [], updatedAt: null };
let subsChart, newSubsChart;
let rangeDays = 30;
let rangeOffset = 0;

const $ = id => document.getElementById(id);
const fmt = n => Number(n ?? 0).toLocaleString("ja-JP");
const dateObj = s => new Date(`${s}T00:00:00+09:00`);
const jpDate = s => s ? s.replace(/-/g, "/") : "—";
const monthDay = s => {
  if (!s) return "—";
  const [, m, d] = s.split("-");
  return `${Number(m)}/${Number(d)}`;
};

function todayJST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function daysSinceStart() {
  const start = dateObj(START_DATE);
  const today = dateObj(todayJST());
  return Math.max(0, Math.floor((today - start) / 86400000));
}

function updateHeader() {
  const today = todayJST();
  $("periodText").textContent = `${jpDate(START_DATE)}～${today.replace(/-/g, "/")}`;
  $("dayCount").textContent = `（${daysSinceStart()}日）`;
  if (DATA.updatedAt) {
    const d = new Date(DATA.updatedAt);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(d);
    const get = type => parts.find(p => p.type === type)?.value || "";
    const desktopText = `${get("year")}/${Number(get("month"))}/${Number(get("day"))} ${get("hour")}:${get("minute")}`;
    const mobileText = `${get("year")}/${Number(get("month"))}/${Number(get("day"))}`;
    $("updatedAtDesktop").textContent = desktopText;
    $("updatedAtMobile").textContent = mobileText;
  }
}

function detectTags(video) {
  return MEMBERS.filter(m => `${video.title || ""} ${video.description || ""}`.includes(m));
}

function normalizeVideos() {
  DATA.videos = (DATA.videos || []).map(v => ({
    ...v,
    tags: Array.isArray(v.tags) && v.tags.length ? v.tags : detectTags(v)
  }));
}

function sortedSubscribers() {
  return [...(DATA.subscribers || [])].sort((a, b) => a.date.localeCompare(b.date));
}

function latestRecord() {
  return sortedSubscribers().at(-1);
}

function previousRecord(date) {
  return sortedSubscribers().filter(x => x.date < date).at(-1);
}

function newSubscriberForDate(date) {
  const row = sortedSubscribers().find(x => x.date === date);
  if (!row) return 0;
  const prev = previousRecord(date);
  return prev ? row.count - prev.count : 0;
}

function renderSummary() {
  const latest = latestRecord();
  const current = DATA.currentSubscriberCount ?? latest?.count ?? 0;
  $("currentSubs").textContent = `${fmt(current)}人`;

  if (latest) {
    const diff = newSubscriberForDate(latest.date);
    $("latestNew").textContent = `${diff >= 0 ? "+" : ""}${fmt(diff)}人`;
    $("latestDate").textContent = `最新日：${jpDate(latest.date)}`;
  }

  const rows = sortedSubscribers();
  const diffs = rows.slice(1).map((row, i) => row.count - rows[i].count);
  const avg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  $("avgNew").textContent = avg.toFixed(1);
  $("videoCount").textContent = `${fmt(DATA.videos.length)}本`;
}

function buildRolling() {
  const videos = [...DATA.videos];
  if (!videos.length) {
    [0, 1, 2].forEach(i => { $(`lane${i}`).innerHTML = ""; });
    return;
  }
  const shuffled = videos.sort(() => Math.random() - 0.5);
  const lanes = [[], [], []];
  shuffled.forEach((video, i) => lanes[i % 3].push(video));
  lanes.forEach((arr, i) => {
    const twice = [...arr, ...arr];
    $(`lane${i}`).innerHTML = twice.map(v =>
      `<img class="thumb-roll" src="${v.thumbnail}" alt="" loading="lazy">`
    ).join("");
  });
}

function renderTags() {
  $("tagSelect").innerHTML = '<option value="">すべてのメンバー</option>' +
    MEMBERS.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
}

function durationNum(v) { return Number(v.durationSeconds || 0); }

function renderVideos() {
  const sort = $("sortSelect").value;
  const tag = $("tagSelect").value;
  const list = DATA.videos.filter(v => !tag || (v.tags || detectTags(v)).includes(tag));

  list.sort((a, b) => {
    if (sort === "popular") return Number(b.viewCount || 0) - Number(a.viewCount || 0);
    if (sort === "newest") return String(b.date).localeCompare(String(a.date));
    if (sort === "oldest") return String(a.date).localeCompare(String(b.date));
    if (sort === "longest") return durationNum(b) - durationNum(a);
    return durationNum(a) - durationNum(b);
  });

  $("videoGrid").innerHTML = list.map(v => `
    <article class="video-card">
      <img src="${v.thumbnail}" alt="" loading="lazy">
      <div class="video-info">
        <div class="video-title">${escapeHtml(v.title || "")}</div>
        <div class="video-meta">${fmt(v.viewCount)}回　・　${jpDate(v.date)}　・　${v.duration || ""}</div>
        <div class="tags">${(v.tags || detectTags(v)).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    </article>`).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getChartRows() {
  const rows = sortedSubscribers();
  if (rangeDays === "all") return rows;
  const latest = rows.at(-1)?.date || START_DATE;
  const end = dateObj(latest);
  end.setDate(end.getDate() + rangeOffset * Number(rangeDays));
  const start = new Date(end);
  start.setDate(start.getDate() - Number(rangeDays) + 1);
  return rows.filter(r => {
    const d = dateObj(r.date);
    return d >= start && d <= end;
  });
}

function chartVideoTitles(date) {
  return DATA.videos.filter(v => v.date === date).map(v => v.title);
}

function fixedSubscriberScale(rows) {
  const values = rows.map(r => Number(r.count || 0));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  return {
    min: Math.floor(min / 10) * 10,
    max: Math.max(10, Math.ceil((max + 10) / 10) * 10)
  };
}

function fixedNewSubscriberScale() {
  const rows = sortedSubscribers();
  const values = rows.slice(1).map((r, i) => r.count - rows[i].count);
  if (!values.length) return { min: 0, max: 10 };
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(5, max - min);
  const pad = Math.max(2, Math.ceil(span * 0.12));
  return {
    min: min >= 0 ? 0 : Math.floor((min - pad) / 5) * 5,
    max: Math.max(5, Math.ceil((max + pad) / 5) * 5)
  };
}

function baseChartOptions(scale) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => items[0] ? monthDay(items[0].label) : "",
          afterBody: items => {
            if (!items.length) return [];
            const titles = chartVideoTitles(sortedSubscribers()[items[0].dataIndex]?.date);
            return titles.length ? ["", ...titles.map(t => `🎬 ${t}`)] : [];
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { display: false }
      },
      y: {
        min: scale.min,
        max: scale.max,
        ticks: { callback: value => fmt(value) }
      }
    }
  };
}

function renderCharts() {
  const rows = getChartRows();
  if (!rows.length) return;

  const allRows = sortedSubscribers();
  const subScale = fixedSubscriberScale(allRows);
  const newScale = fixedNewSubscriberScale();
  const labels = rows.map(r => monthDay(r.date));
  const videoDates = rows.map(r => chartVideoTitles(r.date).length);
  const pointColors = videoDates.map(hasVideo => hasVideo ? "#FF3030" : "#FFF36A");

  if (subsChart) subsChart.destroy();
  subsChart = new Chart($("subsChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: rows.map(r => r.count),
        borderColor: "#E7D400",
        backgroundColor: "#E7D400",
        pointBackgroundColor: pointColors,
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.28,
        borderWidth: 2.5
      }]
    },
    options: {
      ...baseChartOptions(subScale),
      plugins: {
        ...baseChartOptions(subScale).plugins,
        tooltip: {
          callbacks: {
            title: items => items[0] ? monthDay(rows[items[0].dataIndex].date) : "",
            label: ctx => ` 登録者数：${fmt(ctx.raw)}人`,
            afterBody: items => {
              const titles = chartVideoTitles(rows[items[0].dataIndex].date);
              return titles.length ? ["", ...titles.map(t => `🎬 ${t}`)] : [];
            }
          }
        }
      }
    }
  });

  const newVals = rows.map(r => newSubscriberForDate(r.date));
  const periodTotal = newVals.reduce((a, b) => a + b, 0);
  const periodAverage = newVals.length ? periodTotal / newVals.length : 0;
  $("periodAverage").textContent = `平均：${periodAverage.toFixed(1)}人/日`;
  $("periodTotal").textContent = `累計：${periodTotal >= 0 ? "+" : ""}${fmt(periodTotal)}人`;

  if (newSubsChart) newSubsChart.destroy();
  newSubsChart = new Chart($("newSubsChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: newVals,
        backgroundColor: videoDates.map(hasVideo => hasVideo ? "#FF3030" : "#FFF36A"),
        borderWidth: 0,
        borderColor: "transparent",
        borderRadius: 2
      }]
    },
    options: {
      ...baseChartOptions(newScale),
      plugins: {
        ...baseChartOptions(newScale).plugins,
        tooltip: {
          callbacks: {
            title: items => items[0] ? monthDay(rows[items[0].dataIndex].date) : "",
            label: ctx => ` 新規登録者数：${ctx.raw >= 0 ? "+" : ""}${fmt(ctx.raw)}人`,
            afterBody: items => {
              const titles = chartVideoTitles(rows[items[0].dataIndex].date);
              return titles.length ? ["", ...titles.map(t => `🎬 ${t}`)] : [];
            }
          }
        }
      }
    }
  });

  $("rangeLabel").textContent = `${monthDay(rows[0].date)} – ${monthDay(rows.at(-1).date)}`;
}

function getHistoricalAverage() {
  const rows = sortedSubscribers();
  if (rows.length < 2) return 0;
  const first = dateObj(rows[0].date);
  const last = dateObj(rows.at(-1).date);
  const days = Math.max(1, Math.round((last - first) / 86400000));
  return (rows.at(-1).count - rows[0].count) / days;
}

function getWindowStats(n, endIndex = null) {
  const rows = sortedSubscribers();
  if (!rows.length) return null;
  const end = endIndex == null ? rows.length : endIndex;
  const arr = rows.slice(Math.max(0, end - n), end);
  if (!arr.length) return null;
  const startIndex = Math.max(0, end - n);
  const startCount = startIndex > 0 ? rows[startIndex - 1].count : arr[0].count;
  const total = arr.at(-1).count - startCount;
  return { n: arr.length, total, avg: total / Math.max(1, arr.length), start: arr[0].date, end: arr.at(-1).date };
}

function compareWindow(n) {
  const rows = sortedSubscribers();
  const end = rows.length;
  const recent = getWindowStats(n, end);
  const previous = getWindowStats(n, Math.max(0, end - n));
  if (!recent || !previous || previous.total === 0) return null;
  return { recent, previous, rate: (recent.total - previous.total) / Math.abs(previous.total) * 100 };
}

function bestWindow(n) {
  const rows = sortedSubscribers();
  if (rows.length < n) return null;
  let best = null;
  for (let end = n; end <= rows.length; end++) {
    const w = getWindowStats(n, end);
    if (!best || w.total > best.total) best = w;
  }
  return best;
}

function getLatestVideo() {
  return DATA.videos?.length
    ? [...DATA.videos].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
    : null;
}

function getIncreaseAfterVideo(date, n) {
  const rows = sortedSubscribers();
  const start = dateObj(date);
  const end = new Date(start);
  end.setDate(end.getDate() + n);
  const before = rows.filter(x => dateObj(x.date) < start).at(-1);
  const after = rows.filter(x => dateObj(x.date) <= end).at(-1);
  return before && after ? after.count - before.count : null;
}

function generateTrendAnalysis() {
  const len = DATA.subscribers?.length || 0;
  if (len < 2) return "登録者データがまだ少ないため、今後のデータからチャンネルの傾向を分析します。";

  const w7 = getWindowStats(Math.min(7, len));
  const hist = getHistoricalAverage();
  const c7 = compareWindow(Math.min(7, Math.floor(len / 2)));
  let text = "";

  if (w7 && w7.avg > hist * 1.5 && w7.avg > 2) text = "🚀 最近は登録者の伸びが大きく加速しています。";
  else if (w7 && w7.avg > hist * 1.15) text = "📈 最近は歴代平均を上回るペースで登録者が増えています。";
  else if (w7 && w7.avg < hist * 0.65 && hist > 1) text = "📉 最近は登録者の増加ペースがやや落ち着いています。";
  else text = "➡️ 最近は大きな変動なく、比較的安定したペースで登録者が増えています。";

  if (c7) {
    if (c7.rate >= 50) text += ` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間より${Math.abs(c7.rate).toFixed(0)}%増加しています。`;
    else if (c7.rate <= -30) text += ` 直近${w7.n}日間の平均は＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間から${Math.abs(c7.rate).toFixed(0)}%減少しています。`;
    else text += ` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日のペースです。`;
  }

  const best = bestWindow(7);
  if (best && w7 && best.total === w7.total && best.total > 0) text += " 過去の7日間と比べても最高ペースです。";

  const latestVideo = getLatestVideo();
  if (latestVideo) {
    const after = getIncreaseAfterVideo(latestVideo.date, 7);
    if (after !== null && after > 0) text += ` 🎬 ${jpDate(latestVideo.date)}の動画投稿後7日間で＋${fmt(after)}人増加しています。`;
  }
  return text;
}

function renderTrendAnalysis() {
  const el = $("trendAnalysis");
  if (el) el.textContent = generateTrendAnalysis();
}

function openCollage() {
  $("collageModal").classList.add("open");
  $("collageModal").setAttribute("aria-hidden", "false");
  buildCollagePages();
}
function closeCollage() {
  $("collageModal").classList.remove("open");
  $("collageModal").setAttribute("aria-hidden", "true");
}
function buildCollagePages() {
  const pages = Math.max(1, Math.ceil(DATA.videos.length / 100));
  $("collagePages").innerHTML = Array.from({ length: pages }, (_, i) =>
    `<button class="page-btn ${i === 0 ? "active" : ""}" data-page="${i}">${i * 100 + 1}〜${Math.min((i + 1) * 100, DATA.videos.length)}</button>`
  ).join("");
  document.querySelectorAll(".page-btn").forEach(b => b.onclick = () => renderCollage(Number(b.dataset.page)));
  renderCollage(0);
}
function renderCollage(page) {
  document.querySelectorAll(".page-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.page) === page));
  const list = DATA.videos.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(page * 100, page * 100 + 100);
  $("collageGrid").innerHTML = Array.from({ length: 100 }, (_, i) =>
    list[i]
      ? `<img src="${list[i].thumbnail}" alt="" crossorigin="anonymous">`
      : `<div style="aspect-ratio:16/9;background:#fff"></div>`
  ).join("");
  $("downloadCollage").dataset.page = page;
}
async function downloadCollage() {
  const page = Number($("downloadCollage").dataset.page || 0);
  const list = DATA.videos.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(page * 100, page * 100 + 100);
  const cellW = 320, cellH = 180;
  const canvas = document.createElement("canvas");
  canvas.width = cellW * 10; canvas.height = cellH * 10;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < list.length; i++) {
    try {
      const img = await loadImage(list[i].thumbnail);
      ctx.drawImage(img, (i % 10) * cellW, Math.floor(i / 10) * cellH, cellW, cellH);
    } catch (e) { console.warn("thumbnail skipped", list[i].thumbnail); }
  }
  canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `thumbnail-collection-${page * 100 + 1}-${Math.min(page * 100 + 100, DATA.videos.length)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function setupRange() {
  document.querySelectorAll(".preset-group button").forEach(b => b.onclick = () => {
    const v = b.dataset.range;
    rangeDays = v === "all" ? "all" : Number(v);
    rangeOffset = 0;
    document.querySelectorAll(".preset-group button").forEach(x => x.classList.toggle("selected", x === b));
    renderCharts();
  });
  $("prevRange").onclick = () => {
    if (rangeDays !== "all") { rangeOffset--; renderCharts(); }
  };
  $("nextRange").onclick = () => {
    if (rangeDays !== "all" && rangeOffset < 0) { rangeOffset++; renderCharts(); }
  };
}
function setupNav() {
  document.querySelectorAll(".switch-btn").forEach(b => b.onclick = () => {
    document.querySelectorAll(".switch-btn").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    $(`${b.dataset.page === "videos" ? "videos" : "analytics"}Page`).classList.add("active");
    if (b.dataset.page === "analytics") renderCharts();
  });
}

async function init() {
  try {
    const r = await fetch("data.json?ts=" + Date.now(), { cache: "no-store" });
    DATA = await r.json();
  } catch (e) {
    console.error(e);
    return;
  }
  normalizeVideos();
  updateHeader();
  renderSummary();
  renderTags();
  renderVideos();
  buildRolling();
  renderTrendAnalysis();
  setupRange();
  setupNav();
  $("sortSelect").onchange = renderVideos;
  $("tagSelect").onchange = renderVideos;
  $("openCollage").onclick = openCollage;
  $("closeCollage").onclick = closeCollage;
  $("downloadCollage").onclick = downloadCollage;
  $("collageModal").onclick = e => { if (e.target.id === "collageModal") closeCollage(); };
}
init();
