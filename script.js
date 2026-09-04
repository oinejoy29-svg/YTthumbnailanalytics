const START_DATE = "2026-04-03";
const MEMBERS = [
"逢田珠里依", "天野香乃愛", "市原愛弓", "江角怜音", "大信田美月", "大西葵",
"小澤愛実", "髙橋舞", "藤沢莉子", "村山結香", "山田杏佳", "山野愛月"
];
const SUBSCRIBER_OVERRIDES_KEY = "joySubscriberOverrides";
let DATA = {
subscribers: [],
videos: [],
updatedAt: null
};
let subsChart = null;
let newSubsChart = null;
let rangeDays = 7;
let rangeOffset = 0;
const SUBSCRIBER_HISTORY_INITIAL_LIMIT = 5;
const SUBSCRIBER_HISTORY_STEP = 10;
let subscriberHistoryLimit =
SUBSCRIBER_HISTORY_INITIAL_LIMIT;
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
timeZone: "Asia/Tokyo",
year: "numeric",
month: "2-digit",
day: "2-digit"
}).format(new Date());
}

function daysSinceStart() {
const start = dateObj(START_DATE);
const today = dateObj(todayJST());
return Math.max(
0,
Math.floor((today - start) / 86400000)
);
}

/* =========================================================
Subscriber overrides
========================================================= */

function getSubscriberOverrides() {
try {
return JSON.parse(
localStorage.getItem(
SUBSCRIBER_OVERRIDES_KEY
) || "{}"
);
} catch {
return {};
}
}

function saveSubscriberOverride(
date,
count
) {
const overrides =
getSubscriberOverrides();
overrides[date] =
Number(count);
localStorage.setItem(
SUBSCRIBER_OVERRIDES_KEY,
JSON.stringify(overrides)
);
}

function clearSubscriberOverride(
date
) {
const overrides =
getSubscriberOverrides();
delete overrides[date];
localStorage.setItem(
SUBSCRIBER_OVERRIDES_KEY,
JSON.stringify(overrides)
);
}

function applySubscriberOverrides(
rows
) {
const overrides =
getSubscriberOverrides();

return rows.map(row => {
if (
Object.prototype.hasOwnProperty.call(
overrides,
row.date
)
) {
return {
...row,
count:
Number(
overrides[row.date]
)
};
}

return {
...row,
count:
Number(
row.count || 0
)
};
});
}

/* =========================================================
Video tags
========================================================= */

function detectTags(video) {
return MEMBERS.filter(
member =>
String(video.title || "")
.includes(member)
);
}

function normalizeVideos() {
DATA.videos =
(DATA.videos || []).map(
video => ({
...video,

tags:
Array.isArray(video.tags) &&
video.tags.length
? video.tags
: detectTags(video)
})
);
}

/* =========================================================
Subscriber data
========================================================= */

function sortedSubscribers() {
return applySubscriberOverrides(
[
...(DATA.subscribers || [])
].sort(
(a, b) =>
String(a.date)
.localeCompare(
String(b.date)
)
)
);
}

function latestRecord() {
return (
sortedSubscribers()
.at(-1) || null
);
}

function previousRecord(date) {
return (
sortedSubscribers()
.filter(
row =>
row.date < date
)
.at(-1) || null
);
}

function newSubscriberForDate(
date
) {
const rows =
sortedSubscribers();

const index =
rows.findIndex(
row =>
row.date === date
);

if (index <= 0) {
return 0;
}

return (
Number(
rows[index].count
) -
Number(
rows[index - 1].count
)
);
}

/*
 * 「今日の新規登録者数」
 *
 * 今日のデータがdata.jsonに存在する場合
 * → 今日 - 前日
 *
 * 今日のデータがまだ存在しない場合
 * → 現在の登録者数 - data.json最後の日
 *
 * これにより、APIが現在値を持っている限り
 * 「最新日の新規登録者数」は今日基準になる。
 */

function getTodayNewSubscribers() {
const today =
todayJST();

const rows =
sortedSubscribers();

const todayRow =
rows.find(
row =>
row.date === today
);

if (todayRow) {
const prev =
previousRecord(today);

if (prev) {
return (
Number(
todayRow.count
) -
Number(
prev.count
)
);
}

return 0;
}

const current =
Number(
DATA.currentSubscriberCount ??
latestRecord()?.count ??
0
);

const latest =
latestRecord();

if (!latest) {
return 0;
}

return (
current -
Number(
latest.count
)
);
}

/* =========================================================
Summary
========================================================= */

function renderSummary() {
const rows =
sortedSubscribers();

const latest =
latestRecord();

const current =
Number(
DATA.currentSubscriberCount ??
latest?.count ??
0
);

$("currentSubs").textContent =
`${fmt(current)}人`;

const todayNew =
getTodayNewSubscribers();

$("latestNew").textContent =
`${todayNew >= 0 ? "+" : ""}${fmt(todayNew)}人`;

$("latestDate").textContent =
`最新日：${jpDate(todayJST())}`;

const diffs =
rows
.slice(1)
.map(
(row, index) =>
Number(row.count) -
Number(
rows[index].count
)
);

const avg =
diffs.length
? diffs.reduce(
(a, b) =>
a + b,
0
) /
diffs.length
: 0;

$("avgNew").textContent =
avg.toFixed(1);

$("videoCount").textContent =
`${fmt(DATA.videos.length)}本`;
}

/* =========================================================
Rolling thumbnails
========================================================= */

function buildRolling() {
const videos =
[...DATA.videos];

if (!videos.length) {
[0, 1, 2]
.forEach(i => {
$(`lane${i}`).innerHTML =
"";
});

return;
}

const shuffled =
videos.sort(
() =>
Math.random() - 0.5
);

const lanes =
[[], [], []];

shuffled.forEach(
(video, index) => {
lanes[
index % 3
].push(video);
}
);

lanes.forEach(
(arr, index) => {
const twice =
[...arr, ...arr];

$(`lane${index}`)
.innerHTML =
twice
.map(
video => `
<img
class="thumb-roll"
src="${escapeHtml(video.thumbnail || "")}"
alt=""
loading="lazy"
>
`
)
.join("");
}
);
}

/* =========================================================
Video list
========================================================= */

function renderTags() {
$("tagSelect").innerHTML =
'<option value="">すべてのメンバー</option>' +
MEMBERS
.map(
member =>
`<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`
)
.join("");
}

function durationNum(video) {
return Number(
video.durationSeconds || 0
);
}

const POPULAR_RANK_SEEN_KEY =
  "popularRankingSignalSeenAt";

function isNewBadgeVideo(video) {
  const detectedAt =
    new Date(
      video.firstDetectedAt ||
      ""
    );

  if (
    Number.isNaN(
      detectedAt.getTime()
    )
  ) {
    return false;
  }

  const elapsed =
    Date.now() -
    detectedAt.getTime();

  return (
    elapsed >= 0 &&
    elapsed <
      24 * 60 * 60 * 1000
  );
}

function isPopularRankUpEligible(video) {
  const publishedAt =
    new Date(
      video.publishedAt ||
      ""
    );

  if (
    Number.isNaN(
      publishedAt.getTime()
    )
  ) {
    return false;
  }

  return (
    Date.now() -
    publishedAt.getTime()
  ) >=
    4 * 24 * 60 * 60 * 1000;
}

function popularRankUpAmount(video) {
  if (
    !isPopularRankUpEligible(video)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Number(
      video.popularRankChange ||
      0
    )
  );
}

function ensureSortUpdateDot() {
  const select =
    $("sortSelect");

  if (!select) {
    return null;
  }

  let wrap =
    select.closest(
      ".sort-select-wrap"
    );

  if (!wrap) {
    wrap =
      document.createElement(
        "span"
      );

    wrap.className =
      "sort-select-wrap";

    select.parentNode
      .insertBefore(
        wrap,
        select
      );

    wrap.appendChild(
      select
    );
  }

  let dot =
    wrap.querySelector(
      ".sort-update-dot"
    );

  if (!dot) {
    dot =
      document.createElement(
        "span"
      );

    dot.className =
      "sort-update-dot";

    dot.setAttribute(
      "aria-label",
      "人気順に順位変動があります"
    );

    dot.title =
      "人気順に順位変動があります";

    wrap.appendChild(
      dot
    );
  }

  return dot;
}

function refreshSortUpdateDot() {
  const dot =
    ensureSortUpdateDot();

  if (!dot) {
    return;
  }

  const signal =
    String(
      DATA.popularRankingSignalAt ||
      ""
    );

  const seen =
    localStorage.getItem(
      POPULAR_RANK_SEEN_KEY
    ) ||
    "";

  dot.hidden = !(
    signal &&
    signal !== seen
  );
}

function markPopularRankingAsSeen() {
  const signal =
    String(
      DATA.popularRankingSignalAt ||
      ""
    );

  if (signal) {
    localStorage.setItem(
      POPULAR_RANK_SEEN_KEY,
      signal
    );
  }

  refreshSortUpdateDot();
}

function renderVideos() {
  const sort =
    $("sortSelect").value;

  const tag =
    $("tagSelect").value;

  const list =
    DATA.videos.filter(
      video =>
        !tag ||
        (
          video.tags ||
          detectTags(video)
        ).includes(tag)
    );

  list.sort(
    (a, b) => {
      if (
        sort ===
        "popular"
      ) {
        return (
          Number(
            b.viewCount || 0
          ) -
          Number(
            a.viewCount || 0
          )
        );
      }

      if (
        sort ===
        "newest"
      ) {
        return String(
          b.date
        ).localeCompare(
          String(a.date)
        );
      }

      if (
        sort ===
        "oldest"
      ) {
        return String(
          a.date
        ).localeCompare(
          String(b.date)
        );
      }

      if (
        sort ===
        "longest"
      ) {
        return (
          durationNum(b) -
          durationNum(a)
        );
      }

      return (
        durationNum(a) -
        durationNum(b)
      );
    }
  );

  $("videoGrid").innerHTML =
    list
      .map(
        video => {
          const newBadge =
            isNewBadgeVideo(video);

          const upAmount =
            sort === "popular"
              ? popularRankUpAmount(
                  video
                )
              : 0;

          const sticker =
            newBadge
              ? `
                <span
                  class="video-status-sticker video-status-new"
                >
                  NEW
                </span>
              `
              : upAmount > 0
                ? `
                  <span
                    class="video-status-sticker video-status-up"
                  >
                    ↑${fmt(upAmount)} UP
                  </span>
                `
                : "";

          return `
            <article
              class="video-card"
              data-video-id="${escapeHtml(video.id || "")}"
              tabindex="0"
              role="button"
              aria-label="動画詳細を開く"
            >
              ${sticker}

              <img
                src="${escapeHtml(video.thumbnail || "")}"
                alt=""
                loading="lazy"
              >

              <div class="video-info">

                <div class="video-title">
                  ${escapeHtml(video.title || "")}
                </div>

                <div class="video-meta">
                  <div class="video-view-row">
                    <span class="video-view-count">
                      ${fmt(video.viewCount)}回
                    </span>

                    <span class="video-view-increase">
                      ↑${fmt(video.viewCountIncrease || 0)}回
                    </span>
                  </div>

                  <span class="video-date">
                    ${jpDate(video.date)}
                  </span>
                </div>

              </div>
            </article>
          `;
        }
      )
      .join("");

  document
    .querySelectorAll(
      ".video-card"
    )
    .forEach(card => {
      const open = () => {
        const video =
          DATA.videos.find(
            item =>
              String(item.id) ===
              String(
                card.dataset.videoId
              )
          );

        if (video) {
          openVideoDetail(
            video
          );
        }
      };

      card.addEventListener(
        "click",
        open
      );

      card.addEventListener(
        "keydown",
        event => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            event.preventDefault();
            open();
          }
        }
      );
    });
}

/* =========================================================
Video detail modal
========================================================= */

function hasCompletedSevenDayForecast(video) {
const forecast =
video?.sevenDayForecast;

if (!forecast) {
return false;
}

const predicted =
Number(
forecast.predictedViews
);

const actual =
Number(
video.sevenDayViews ??
forecast.actualViews
);

return (
(
forecast.status ===
"completed" ||
Number.isFinite(
Number(video.sevenDayViews)
)
) &&
Number.isFinite(predicted) &&
predicted > 0 &&
Number.isFinite(actual)
);
}

function sevenDayForecastResult(video) {
if (
!hasCompletedSevenDayForecast(
video
)
) {
return null;
}

const predicted =
Number(
video.sevenDayForecast
.predictedViews
);

const actual =
Number(
video.sevenDayViews ??
video.sevenDayForecast
.actualViews
);

const difference =
actual - predicted;

const differencePercent =
predicted > 0
? difference / predicted * 100
: 0;

let label =
"ほぼ的中";

if (
differencePercent >= 5
) {
label = "上振れ";
}

else if (
differencePercent <= -5
) {
label = "下振れ";
}

return {
predicted,
actual,
difference,
differencePercent,
label
};
}

function signedNumber(value) {
const number =
Number(value || 0);

return (
`${number >= 0 ? "+" : ""}${fmt(number)}`
);
}

function signedPercent(value) {
const number =
Number(value || 0);

return (
`${number >= 0 ? "+" : ""}${number.toFixed(1)}%`
);
}

function renderSevenDayForecastResult(
video
) {
const result =
sevenDayForecastResult(
video
);

const panel =
$("sevenDayForecastResult");

if (
!result ||
!panel
) {
return;
}

panel.innerHTML = `
<div class="seven-day-result-head">
<span class="section-kicker">
7-DAY FORECAST
</span>
<h4>一週間予測</h4>
</div>

<div class="seven-day-result-grid">
<div class="seven-day-result-item">
<span>予測</span>
<strong>${fmt(result.predicted)}回</strong>
</div>

<div class="seven-day-result-item">
<span>実績</span>
<strong>${fmt(result.actual)}回</strong>
</div>
</div>

<div class="seven-day-result-summary">
<span>${escapeHtml(result.label)}</span>
<strong>
${signedNumber(result.difference)}回（${signedPercent(result.differencePercent)}）
</strong>
</div>
`;

panel.hidden = false;

const button =
$("openSevenDayForecast");

if (button) {
button.setAttribute(
"aria-expanded",
"true"
);
}
}
function openVideoDetail(
  video
) {
  const tags =
    video.tags ||
    detectTags(video);

  const canShowForecast =
    hasCompletedSevenDayForecast(
      video
    );

  $("videoDetailContent").innerHTML =
    `
      <div class="video-detail-layout">

        <div class="video-detail-thumbnail">
          <img
            src="${escapeHtml(video.thumbnail || "")}"
            alt=""
          >
        </div>

        <div class="video-detail-info">

          <h3 class="video-detail-title">
            ${escapeHtml(video.title || "")}
          </h3>

          <div class="video-detail-meta">

            <div>
              <span>投稿日</span>
              <strong>
                ${jpDate(video.date)}
              </strong>
            </div>

            <div>
              <span>再生回数</span>
              <strong>
                ${fmt(video.viewCount)}回
              </strong>
            </div>

            <div>
              <span>動画時間</span>
              <strong>
                ${escapeHtml(video.duration || "—")}
              </strong>
            </div>

          </div>

          <div class="video-detail-tags">
            ${
              tags.length
                ? tags
                    .map(
                      tag =>
                        `<span class="tag">${escapeHtml(tag)}</span>`
                    )
                    .join("")
                : `
                  <span class="no-tags">
                    タグなし
                  </span>
                `
            }
          </div>

          <div class="video-detail-actions">
            <button
              type="button"
              class="primary-btn edit-video-tags-btn"
              id="editVideoTags"
            >
              タグを編集
            </button>

            ${
              canShowForecast
                ? `
                  <button
                    type="button"
                    class="forecast-result-btn"
                    id="openSevenDayForecast"
                    aria-expanded="false"
                  >
                    一週間予測
                  </button>
                `
                : ""
            }
          </div>

          ${
            canShowForecast
              ? `
                <div
                  id="sevenDayForecastResult"
                  class="seven-day-result-panel"
                  hidden
                ></div>
              `
              : ""
          }

        </div>
      </div>
    `;

  $("videoDetailModal")
    .classList
    .add("open");

  $("videoDetailModal")
    .setAttribute(
      "aria-hidden",
      "false"
    );

  $("editVideoTags").onclick =
    () =>
      editVideoTags(video);

  if (canShowForecast) {
    $("openSevenDayForecast")
      .onclick =
      () =>
        renderSevenDayForecastResult(
          video
        );
  }
}

function openRequestedVideoFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const videoId =
    params.get("video");

  if (!videoId) {
    return;
  }

  const video =
    DATA.videos.find(
      item =>
        String(item.id) ===
        String(videoId)
    );

  if (!video) {
    return;
  }

  openVideoDetail(
    video
  );
}

function closeVideoDetail() {
  $("videoDetailModal")
    .classList
    .remove("open");

  $("videoDetailModal")
    .setAttribute(
      "aria-hidden",
      "true"
    );
}

function editVideoTags(
  video
) {
  const currentTags =
    Array.isArray(
      video.tags
    )
      ? video.tags
      : detectTags(video);

  const input =
    prompt(
      "タグを編集してください。\n\nメンバー名を「、」で区切って入力してください。",
      currentTags.join("、")
    );

  if (
    input === null
  ) {
    return;
  }

  const tags =
    input
      .split(/[、,，]/)
      .map(
        tag =>
          tag.trim()
      )
      .filter(Boolean)
      .filter(
        tag =>
          MEMBERS.includes(
            tag
          )
      );

  video.tags = tags;

  renderVideos();

  openVideoDetail(
    video
  );
}

/* =========================================================
   HTML escaping
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );
}

/* =========================================================
   Charts
========================================================= */

function getChartRows() {
  const rows =
    sortedSubscribers();

  if (
    rangeDays ===
    "all"
  ) {
    return rows;
  }

  if (
    !rows.length
  ) {
    return [];
  }

  const latest =
    rows.at(-1)?.date ||
    START_DATE;

  const end =
    dateObj(latest);

  end.setDate(
    end.getDate() +
    rangeOffset *
      Number(rangeDays)
  );

  const start =
    new Date(end);

  start.setDate(
    start.getDate() -
    Number(rangeDays) +
    1
  );

  return rows.filter(
    row => {
      const d =
        dateObj(
          row.date
        );

      return (
        d >= start &&
        d <= end
      );
    }
  );
}

function chartVideoTitles(
  date
) {
  return DATA.videos
    .filter(
      video =>
        video.date === date
    )
    .map(
      video =>
        video.title
    );
}

function fixedSubscriberScale(
  rows
) {
  const values =
    rows.map(
      row =>
        Number(
          row.count || 0
        )
    );

  if (
    !values.length
  ) {
    return {
      min: 0,
      max: 10
    };
  }

  const min =
    Math.min(
      ...values,
      0
    );

  const max =
    Math.max(
      ...values,
      0
    );

  return {
    min:
      Math.floor(
        min / 10
      ) * 10,

    max:
      Math.max(
        10,
        Math.ceil(
          (max + 10) /
          10
        ) * 10
      )
  };
}

function fixedNewSubscriberScale() {
  const rows =
    sortedSubscribers();

  const values =
    rows
      .slice(1)
      .map(
        (row, index) =>
          Number(
            row.count
          ) -
          Number(
            rows[index].count
          )
      );

  if (
    !values.length
  ) {
    return {
      min: 0,
      max: 10
    };
  }

  const min =
    Math.min(
      ...values,
      0
    );

  const max =
    Math.max(
      ...values,
      0
    );

  const span =
    Math.max(
      5,
      max - min
    );

  const pad =
    Math.max(
      2,
      Math.ceil(
        span * 0.12
      )
    );

  return {
    min:
      min >= 0
        ? 0
        : Math.floor(
            (min - pad) /
            5
          ) * 5,

    max:
      Math.max(
        5,
        Math.ceil(
          (max + pad) /
          5
        ) * 5
      )
  };
}

function baseChartOptions(
  scale
) {
  return {
    responsive: true,

    maintainAspectRatio:
      false,

    interaction: {
      mode: "index",
      intersect: false
    },

    plugins: {
      legend: {
        display: false
      },

      tooltip: {
        callbacks: {
          title: items =>
            items[0]
              ? monthDay(
                  items[0].label
                )
              : "",

          afterBody:
            items => {
              if (
                !items.length
              ) {
                return [];
              }

              const date =
                sortedSubscribers()[
                  items[0]
                    .dataIndex
                ]?.date;

              const titles =
                chartVideoTitles(
                  date
                );

              return titles.length
                ? [
                    "",
                    ...titles.map(
                      title =>
                        `🎬 ${title}`
                    )
                  ]
                : [];
            }
        }
      }
    },

    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        },

        grid: {
          display: false
        }
      },

      y: {
        min:
          scale.min,

        max:
          scale.max,

        ticks: {
          callback:
            value =>
              fmt(value)
        }
      }
    }
  };
}

function renderCharts() {
  const rows =
    getChartRows();

  if (
    !rows.length
  ) {
    return;
  }

  const allRows =
    sortedSubscribers();

  const subScale =
    fixedSubscriberScale(
      allRows
    );

  const newScale =
    fixedNewSubscriberScale();

  const labels =
    rows.map(
      row =>
        monthDay(
          row.date
        )
    );

  const videoDates =
    rows.map(
      row =>
        chartVideoTitles(
          row.date
        ).length
    );

  const pointColors =
    videoDates.map(
      hasVideo =>
        hasVideo
          ? "#FF3030"
          : "#FFF36A"
    );

  if (
    subsChart
  ) {
    subsChart.destroy();
  }

  subsChart =
    new Chart(
      $("subsChart"),
      {
        type:
          "line",

        data: {
          labels,

          datasets: [
            {
              data:
                rows.map(
                  row =>
                    row.count
                ),

              borderColor:
                "#E7D400",

              backgroundColor:
                "#E7D400",

              pointBackgroundColor:
                pointColors,

              pointBorderColor:
                "transparent",

              pointBorderWidth:
                0,

              pointRadius:
                4,

              pointHoverRadius:
                6,

              tension:
                0.28,

              borderWidth:
                2.5
            }
          ]
        },

        options: {
          ...baseChartOptions(
            subScale
          ),

          plugins: {
            ...baseChartOptions(
              subScale
            ).plugins,

            tooltip: {
              callbacks: {
                title:
                  items =>
                    items[0]
                      ? monthDay(
                          rows[
                            items[0]
                              .dataIndex
                          ].date
                        )
                      : "",

                label:
                  ctx =>
                    ` 登録者数：${fmt(ctx.raw)}人`,

                afterBody:
                  items => {
                    if (
                      !items.length
                    ) {
                      return [];
                    }

                    const titles =
                      chartVideoTitles(
                        rows[
                          items[0]
                            .dataIndex
                        ].date
                      );

                    return titles.length
                      ? [
                          "",
                          ...titles.map(
                            title =>
                              `🎬 ${title}`
                          )
                        ]
                      : [];
                  }
              }
            }
          }
        }
      }
    );

  const newVals =
    rows.map(
      row =>
        newSubscriberForDate(
          row.date
        )
    );

  const periodTotal =
    newVals.reduce(
      (a, b) =>
        a + b,
      0
    );

  const periodAverage =
    newVals.length
      ? periodTotal /
        newVals.length
      : 0;

  $("periodAverage")
    .textContent =
    `平均：${periodAverage.toFixed(1)}人/日`;

  $("periodTotal")
    .textContent =
    `累計：${periodTotal >= 0 ? "+" : ""}${fmt(periodTotal)}人`;

  if (
    newSubsChart
  ) {
    newSubsChart.destroy();
  }

  newSubsChart =
    new Chart(
      $("newSubsChart"),
      {
        type:
          "bar",

        data: {
          labels,

          datasets: [
            {
              data:
                newVals,

              backgroundColor:
                videoDates.map(
                  hasVideo =>
                    hasVideo
                      ? "#FF3030"
                      : "#FFF36A"
                ),

              borderWidth:
                0,

              borderColor:
                "transparent",

              borderRadius:
                2
            }
          ]
        },

        options: {
          ...baseChartOptions(
            newScale
          ),

          plugins: {
            ...baseChartOptions(
              newScale
            ).plugins,

            tooltip: {
              callbacks: {
                title:
                  items =>
                    items[0]
                      ? monthDay(
                          rows[
                            items[0]
                              .dataIndex
                          ].date
                        )
                      : "",

                label:
                  ctx =>
                    ` 新規登録者数：${ctx.raw >= 0 ? "+" : ""}${fmt(ctx.raw)}人`,

                afterBody:
                  items => {
                    if (
                      !items.length
                    ) {
                      return [];
                    }

                    const titles =
                      chartVideoTitles(
                        rows[
                          items[0]
                            .dataIndex
                        ].date
                      );

                    return titles.length
                      ? [
                          "",
                          ...titles.map(
                            title =>
                              `🎬 ${title}`
                          )
                        ]
                      : [];
                  }
              }
            }
          }
        }
      }
    );

  $("rangeLabel")
    .textContent =
    `${monthDay(rows[0].date)} – ${monthDay(rows.at(-1).date)}`;
}
/* =========================================================
   Subscriber history table
========================================================= */

function renderSubscriberHistory() {
  const rows =
    sortedSubscribers();

  const visibleRows =
    rows
      .slice(
        Math.max(
          0,
          rows.length -
            subscriberHistoryLimit
        )
      )
      .reverse();

  $("subscriberHistoryBody")
    .innerHTML =
    visibleRows
      .map(
        row => {
          const newCount =
            newSubscriberForDate(
              row.date
            );

          return `
            <tr>

              <td>
                ${jpDate(row.date)}
              </td>

              <td class="history-count">
                ${fmt(row.count)}人
              </td>

              <td
                class="history-new ${
                  newCount < 0
                    ? "negative"
                    : ""
                }"
              >
                ${newCount >= 0 ? "+" : ""}${fmt(newCount)}人
              </td>

              <td>
                <button
                  type="button"
                  class="history-edit-btn"
                  data-date="${escapeHtml(row.date)}"
                >
                  編集
                </button>
              </td>

            </tr>
          `;
        }
      )
      .join("");

  document
    .querySelectorAll(
      ".history-edit-btn"
    )
    .forEach(
      button => {
        button.onclick =
          () => {
            editSubscriberRecord(
              button.dataset.date
            );
          };
      }
    );

  const moreButton =
    $("showMoreSubscribers");

  const closeButton =
    $("closeSubscribers");

  if (
    rows.length <=
    SUBSCRIBER_HISTORY_INITIAL_LIMIT
  ) {
    moreButton.style.display =
      "none";

    closeButton.style.display =
      "none";

    return;
  }

  const isExpanded =
    subscriberHistoryLimit >
    SUBSCRIBER_HISTORY_INITIAL_LIMIT;

  closeButton.style.display =
    isExpanded
      ? ""
      : "none";

  if (
    subscriberHistoryLimit >=
    rows.length
  ) {
    moreButton.style.display =
      "none";
  } else {
    const remaining =
      rows.length -
      subscriberHistoryLimit;

    moreButton.style.display =
      "";

    moreButton.textContent =
      `もっと見る（あと${remaining}日）`;
  }
}

function editSubscriberRecord(
  date
) {
  const row =
    sortedSubscribers()
      .find(
        item =>
          item.date === date
      );

  if (
    !row
  ) {
    return;
  }

  const input =
    prompt(
      `${jpDate(date)}の累計登録者数を入力してください。`,
      String(
        row.count
      )
    );

  if (
    input === null
  ) {
    return;
  }

  const count =
    Number(
      String(input)
        .replace(
          /,/g,
          ""
        )
        .trim()
    );

  if (
    !Number.isFinite(
      count
    ) ||
    count < 0
  ) {
    alert(
      "正しい登録者数を入力してください。"
    );

    return;
  }

  saveSubscriberOverride(
    date,
    Math.round(count)
  );

  renderSummary();
  renderSubscriberHistory();
  renderCharts();
  renderTrendAnalysis();
}

/* =========================================================
   Trend analysis
========================================================= */

function getHistoricalAverage() {
  const rows =
    sortedSubscribers();

  if (
    rows.length < 2
  ) {
    return 0;
  }

  const first =
    dateObj(
      rows[0].date
    );

  const last =
    dateObj(
      rows.at(-1).date
    );

  const days =
    Math.max(
      1,
      Math.round(
        (last - first) /
        86400000
      )
    );

  return (
    Number(
      rows.at(-1).count
    ) -
    Number(
      rows[0].count
    )
  ) / days;
}

function getWindowStats(
  n,
  endIndex = null
) {
  const rows =
    sortedSubscribers();

  if (
    !rows.length
  ) {
    return null;
  }

  const end =
    endIndex == null
      ? rows.length
      : endIndex;

  const arr =
    rows.slice(
      Math.max(
        0,
        end - n
      ),
      end
    );

  if (
    !arr.length
  ) {
    return null;
  }

  const startIndex =
    Math.max(
      0,
      end - n
    );

  const startCount =
    startIndex > 0
      ? Number(
          rows[
            startIndex - 1
          ].count
        )
      : Number(
          arr[0].count
        );

  const total =
    Number(
      arr.at(-1).count
    ) -
    startCount;

  return {
    n:
      arr.length,

    total,

    avg:
      total /
      Math.max(
        1,
        arr.length
      ),

    start:
      arr[0].date,

    end:
      arr.at(-1).date
  };
}

function compareWindow(n) {
  const rows =
    sortedSubscribers();

  const end =
    rows.length;

  const recent =
    getWindowStats(
      n,
      end
    );

  const previous =
    getWindowStats(
      n,
      Math.max(
        0,
        end - n
      )
    );

  if (
    !recent ||
    !previous ||
    previous.total === 0
  ) {
    return null;
  }

  return {
    recent,
    previous,

    rate:
      (
        recent.total -
        previous.total
      ) /
      Math.abs(
        previous.total
      ) *
      100
  };
}

function bestWindow(n) {
  const rows =
    sortedSubscribers();

  if (
    rows.length < n
  ) {
    return null;
  }

  let best =
    null;

  for (
    let end = n;
    end <= rows.length;
    end++
  ) {
    const window =
      getWindowStats(
        n,
        end
      );

    if (
      !best ||
      window.total >
      best.total
    ) {
      best =
        window;
    }
  }

  return best;
}

function getLatestVideo() {
  return DATA.videos?.length
    ? [...DATA.videos]
        .sort(
          (a, b) =>
            String(b.date)
              .localeCompare(
                String(a.date)
              )
        )[0]
    : null;
}

function getIncreaseAfterVideo(
  date,
  n
) {
  const rows =
    sortedSubscribers();

  const start =
    dateObj(date);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + n
  );

  const before =
    rows
      .filter(
        row =>
          dateObj(
            row.date
          ) < start
      )
      .at(-1);

  const after =
    rows
      .filter(
        row =>
          dateObj(
            row.date
          ) <= end
      )
      .at(-1);

  return (
    before &&
    after
  )
    ? Number(
        after.count
      ) -
      Number(
        before.count
      )
    : null;
}

function generateTrendAnalysis() {
  const rows = sortedSubscribers();
  const len = rows.length;

  if (len < 2) {
    return "登録者データがまだ少ないため、今後のデータからチャンネルの傾向を分析します。";
  }

  /* =========================
     基本データ
  ========================= */

  const historicalAvg =
    getHistoricalAverage();

  const w3 =
    getWindowStats(
      Math.min(3, len)
    );

  const w7 =
    getWindowStats(
      Math.min(7, len)
    );

  const w30 =
    getWindowStats(
      Math.min(30, len)
    );

  const compare7Days =
    Math.min(
      7,
      Math.floor(len / 2)
    );

  const c7 =
    compare7Days >= 2
      ? compareWindow(compare7Days)
      : null;

  const compare3Days =
    Math.min(
      3,
      Math.floor(len / 2)
    );

  const c3 =
    compare3Days >= 2
      ? compareWindow(compare3Days)
      : null;

  const best7 =
    len >= 7
      ? bestWindow(7)
      : null;

  /* =========================
     日ごとの増加数
  ========================= */

  const dailyChanges =
    rows
      .slice(1)
      .map(
        (row, index) => ({
          date: row.date,
          value:
            Number(row.count) -
            Number(rows[index].count)
        })
      );

  const recent7Changes =
    dailyChanges.slice(-7);

  const recent30Changes =
    dailyChanges.slice(-30);

  const latestChange =
    dailyChanges.at(-1)?.value ?? 0;

  /* =========================
     補助計算
  ========================= */

  const average = values => {
    if (!values.length) {
      return 0;
    }

    return (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length
    );
  };

  const standardDeviation =
    values => {
      if (values.length < 2) {
        return 0;
      }

      const avg =
        average(values);

      const variance =
        average(
          values.map(
            value =>
              Math.pow(
                value - avg,
                2
              )
          )
        );

      return Math.sqrt(
        variance
      );
    };

  /* =========================
     連続プラス日数
  ========================= */

  let positiveStreak = 0;

  for (
    let i =
      dailyChanges.length - 1;
    i >= 0;
    i--
  ) {
    if (
      dailyChanges[i].value > 0
    ) {
      positiveStreak++;
    } else {
      break;
    }
  }

  /* =========================
     次の100人
  ========================= */

  const current =
    Number(
      DATA.currentSubscriberCount ??
      rows.at(-1)?.count ??
      0
    );

  const nextMilestone =
    (Math.floor(current / 100) + 1) *
    100;

  const remaining =
    nextMilestone - current;

  /* =========================
     分析候補
  ========================= */

  const candidates = [];

  const addCandidate = (
    score,
    type,
    text
  ) => {
    if (!text) {
      return;
    }

    candidates.push({
      score,
      type,
      text
    });
  };

  /* =========================
     1. 7日トレンド × 長期水準
  ========================= */

  if (
    w7 &&
    c7 &&
    historicalAvg > 0
  ) {
    const levelRatio =
      w7.avg /
      historicalAvg;

    const rate =
      c7.rate;

    /*
      高水準 ＋ さらに加速
    */

    if (
      levelRatio >= 1.35 &&
      rate >= 25
    ) {
      addCandidate(
        95 +
          Math.min(
            10,
            rate / 20
          ),
        "trend7",
        `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日と高水準で、前の${c7.previous.n}日間からさらに${Math.abs(rate).toFixed(0)}%伸びています。`
      );
    }

    /*
      高水準だけど減速
    */

    else if (
      levelRatio >= 1.25 &&
      rate <= -20
    ) {
      addCandidate(
        94 +
          Math.min(
            8,
            Math.abs(rate) / 20
          ),
        "trend7",
        `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日と高い水準を維持していますが、前の${c7.previous.n}日間と比べると勢いは${Math.abs(rate).toFixed(0)}%落ち着いています。`
      );
    }

    /*
      低水準から回復
    */

    else if (
      levelRatio <= 0.85 &&
      rate >= 30
    ) {
      addCandidate(
        91,
        "trend7",
        `直近${w7.n}日間はまだ長期平均を下回るものの、前の${c7.previous.n}日間から${Math.abs(rate).toFixed(0)}%上向いており、回復の動きが見られます。`
      );
    }

    /*
      低水準 ＋ さらに減速
    */

    else if (
      levelRatio <= 0.75 &&
      rate <= -25
    ) {
      addCandidate(
        93,
        "trend7",
        `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日で、長期平均を下回りながら前の${c7.previous.n}日間からも${Math.abs(rate).toFixed(0)}%ペースが落ちています。`
      );
    }

    /*
      高水準で安定
    */

    else if (
      levelRatio >= 1.3 &&
      Math.abs(rate) < 20
    ) {
      addCandidate(
        82,
        "trend7",
        `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日。大きな加減速はなく、長期平均を上回る好調なペースを維持しています。`
      );
    }

    /*
      前週から明確に上向き
    */

    else if (
      rate >= 35
    ) {
      addCandidate(
        84,
        "trend7",
        `直近${w7.n}日間の登録者増加は前の${c7.previous.n}日間から${Math.abs(rate).toFixed(0)}%上昇。増加ペースが明確に上向いています。`
      );
    }

    /*
      前週から明確に減速
    */

    else if (
      rate <= -35
    ) {
      addCandidate(
        84,
        "trend7",
        `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間から${Math.abs(rate).toFixed(0)}%減速しています。`
      );
    }
  }

  /* =========================
     2. 直近3日の変化
  ========================= */

  if (
    w3 &&
    c3 &&
    c3.previous.avg !== 0
  ) {
    if (
      c3.rate >= 70
    ) {
      addCandidate(
        90,
        "trend3",
        `ここ${w3.n}日で登録者の伸びが急上昇。直前の${c3.previous.n}日間と比べて増加ペースが${Math.abs(c3.rate).toFixed(0)}%高まっています。`
      );
    }

    else if (
      c3.rate >= 35
    ) {
      addCandidate(
        79,
        "trend3",
        `ここ${w3.n}日で登録者の伸びが上向いており、短期的に勢いが出てきています。`
      );
    }

    else if (
      c3.rate <= -70
    ) {
      addCandidate(
        88,
        "trend3",
        `ここ${w3.n}日は登録者の増加ペースが大きく落ち着いており、直前の${c3.previous.n}日間から明確な変化が見られます。`
      );
    }

    else if (
      c3.rate <= -40
    ) {
      addCandidate(
        77,
        "trend3",
        `ここ${w3.n}日は登録者の伸びがやや落ち着き、短期的にはペースダウンしています。`
      );
    }
  }

  /* =========================
     3. 過去最高7日間
  ========================= */

  if (
    best7 &&
    w7 &&
    best7.total === w7.total &&
    w7.total > 0
  ) {
    addCandidate(
      100,
      "record",
      `直近7日間で＋${fmt(w7.total)}人を記録し、これまでの7日間では最高の増加ペースとなっています。`
    );
  }

  /*
    過去最高にかなり近い
  */

  else if (
    best7 &&
    w7 &&
    best7.total > 0 &&
    w7.total >=
      best7.total * 0.9
  ) {
    addCandidate(
      86,
      "record",
      `直近7日間は＋${fmt(w7.total)}人。過去最高の7日間に迫る強い伸びとなっています。`
    );
  }

  /* =========================
     4. 急増日
  ========================= */

  if (
    recent30Changes.length >= 7
  ) {
    const recent30Values =
      recent30Changes.map(
        item => item.value
      );

    const avg30 =
      average(
        recent30Values
      );

    const sd30 =
      standardDeviation(
        recent30Values
      );

    const recentPeak =
      recent7Changes
        .slice()
        .sort(
          (a, b) =>
            b.value - a.value
        )[0];

    if (
      recentPeak &&
      recentPeak.value >=
        Math.max(
          avg30 * 2,
          avg30 + sd30 * 1.5
        ) &&
      recentPeak.value >= 5
    ) {
      addCandidate(
        89,
        "spike",
        `${monthDay(recentPeak.date)}は＋${fmt(recentPeak.value)}人と、最近の平均を大きく上回る伸びを記録しました。`
      );
    }
  }

  /* =========================
     5. 連続増加
  ========================= */

  if (
    positiveStreak >= 10
  ) {
    addCandidate(
      88,
      "streak",
      `${positiveStreak}日連続で登録者が増加しており、安定したプラス推移が長く続いています。`
    );
  }

  else if (
    positiveStreak >= 7
  ) {
    addCandidate(
      80,
      "streak",
      `${positiveStreak}日連続で登録者が増加。大きく崩れず、安定した伸びが続いています。`
    );
  }

  /* =========================
     6. 安定性
  ========================= */

  if (
    recent7Changes.length >= 7 &&
    w7 &&
    w7.avg > 0
  ) {
    const values =
      recent7Changes.map(
        item => item.value
      );

    const sd =
      standardDeviation(values);

    const variation =
      sd /
      Math.max(
        1,
        Math.abs(w7.avg)
      );

    if (
      variation <= 0.35 &&
      w7.avg >=
        historicalAvg * 0.85
    ) {
      addCandidate(
        73,
        "stable",
        `直近7日間は日ごとのブレが小さく、平均＋${w7.avg.toFixed(1)}人/日の安定した増加が続いています。`
      );
    }
  }

  /* =========================
     7. 30日単位の長期傾向
  ========================= */

  if (
    w30 &&
    w7 &&
    w30.n >= 21 &&
    historicalAvg > 0
  ) {
    if (
      w30.avg >=
        historicalAvg * 1.3 &&
      w7.avg >=
        w30.avg * 0.9
    ) {
      addCandidate(
        76,
        "long",
        `この1か月は平均＋${w30.avg.toFixed(1)}人/日と、長期平均を上回る成長が続いています。`
      );
    }

    else if (
      w30.avg <=
        historicalAvg * 0.7 &&
      w7.avg <=
        w30.avg
    ) {
      addCandidate(
        74,
        "long",
        `この1か月は長期平均より穏やかな伸びとなっており、直近も落ち着いた推移が続いています。`
      );
    }
  }

  /* =========================
     8. 節目接近
  ========================= */

  if (
    remaining > 0 &&
    remaining <= 10
  ) {
    addCandidate(
      87,
      "milestone",
      `次の${fmt(nextMilestone)}人まであと${fmt(remaining)}人。次の節目が目前に迫っています。`
    );
  }

  else if (
    remaining > 10 &&
    remaining <= 25 &&
    w7 &&
    w7.avg >= 2
  ) {
    addCandidate(
      68,
      "milestone",
      `次の${fmt(nextMilestone)}人まであと${fmt(remaining)}人。現在のペースなら節目が見えてきています。`
    );
  }

  /* =========================
     9. 最新動画投稿後
  ========================= */

  const latestVideo =
    getLatestVideo();

  if (latestVideo) {
    const after =
      getIncreaseAfterVideo(
        latestVideo.date,
        7
      );

    if (
      after !== null &&
      after > 0 &&
      w7 &&
      after >=
        Math.max(
          10,
          w7.total * 0.8
        )
    ) {
      addCandidate(
        72,
        "video",
        `${jpDate(latestVideo.date)}の動画投稿後7日間で登録者が＋${fmt(after)}人増えています。`
      );
    }
  }

  /* =========================
     10. 今日の変化が目立つ
  ========================= */

  if (
    recent30Changes.length >= 7
  ) {
    const normalAvg =
      average(
        recent30Changes
          .slice(0, -1)
          .map(
            item =>
              item.value
          )
      );

    if (
      latestChange >=
        Math.max(
          5,
          normalAvg * 2
        )
    ) {
      addCandidate(
        83,
        "today",
        `最新日は＋${fmt(latestChange)}人と、最近の平均を大きく上回る伸びになっています。`
      );
    }
  }

  /* =========================
     候補がなかった場合
  ========================= */

  if (!candidates.length) {
    if (w7) {
      return `直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日。大きな変化はなく、比較的安定した推移が続いています。`;
    }

    return "登録者数は大きな変化なく推移しています。";
  }

  /* =========================
     注目度順に並べる
  ========================= */

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const first =
    candidates[0];

  /*
    2つ目は同じ種類を避ける。
    さらに、弱い情報を無理に追加しない。
  */

  const second =
    candidates.find(
      candidate =>
        candidate !== first &&
        candidate.type !==
          first.type &&
        candidate.score >= 78 &&
        candidate.score >=
          first.score - 18
    );

  /* =========================
     最終文章
  ========================= */

  if (second) {
    return (
      first.text +
      " " +
      second.text
    );
  }

  return first.text;
}

function renderTrendAnalysis() {
  const element =
    $("trendAnalysis");

  if (
    element
  ) {
    element.textContent =
      generateTrendAnalysis();
  }
}

/* =========================================================
   Thumbnail collage
========================================================= */

function openCollage() {
  $("collageModal")
    .classList
    .add("open");

  $("collageModal")
    .setAttribute(
      "aria-hidden",
      "false"
    );

  buildCollagePages();
}

function closeCollage() {
  $("collageModal")
    .classList
    .remove("open");

  $("collageModal")
    .setAttribute(
      "aria-hidden",
      "true"
    );
}

function buildCollagePages() {
  const pages =
    Math.max(
      1,
      Math.ceil(
        DATA.videos.length /
        100
      )
    );

  $("collagePages")
    .innerHTML =
    Array.from(
      {
        length:
          pages
      },

      (_, index) => `
        <button
          class="page-btn ${index === 0 ? "active" : ""}"
          data-page="${index}"
        >
          ${index * 100 + 1}〜${Math.min(
            (index + 1) * 100,
            DATA.videos.length
          )}
        </button>
      `
    )
      .join("");

  document
    .querySelectorAll(
      ".page-btn"
    )
    .forEach(
      button => {
        button.onclick =
          () =>
            renderCollage(
              Number(
                button.dataset.page
              )
            );
      }
    );

  renderCollage(0);
}

function renderCollage(
  page
) {
  document
    .querySelectorAll(
      ".page-btn"
    )
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          Number(
            button.dataset.page
          ) === page
        );
      }
    );

  const list =
    DATA.videos
      .slice()
      .sort(
        (a, b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      )
      .slice(
        page * 100,
        page * 100 +
          100
      );

  $("collageGrid")
    .innerHTML =
    Array.from(
      {
        length: 100
      },

      (_, index) =>
        list[index]
          ? `
            <img
              src="${escapeHtml(list[index].thumbnail)}"
              alt=""
              crossorigin="anonymous"
            >
          `
          : `
            <div
              style="
                aspect-ratio:16/9;
                background:#fff
              "
            ></div>
          `
    )
      .join("");

  $("downloadCollage")
    .dataset.page =
    page;
}

async function downloadCollage() {
  const page =
    Number(
      $("downloadCollage")
        .dataset.page ||
      0
    );

  const list =
    DATA.videos
      .slice()
      .sort(
        (a, b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      )
      .slice(
        page * 100,
        page * 100 +
          100
      );

  if (
    !list.length
  ) {
    return;
  }

  const cellW =
    320;
    const cellH =
    180;

  const columns =
    10;

  const rows =
    Math.ceil(
      list.length /
      columns
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    cellW *
    columns;

  canvas.height =
    cellH *
    rows;

  const ctx =
    canvas.getContext(
      "2d"
    );

  ctx.fillStyle =
    "#fff";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  function drawImageCover(
    ctx,
    img,
    x,
    y,
    width,
    height
  ) {
    const imageRatio =
      img.naturalWidth /
      img.naturalHeight;

    const cellRatio =
      width /
      height;

    let sx =
      0;

    let sy =
      0;

    let sourceWidth =
      img.naturalWidth;

    let sourceHeight =
      img.naturalHeight;

    if (
      imageRatio >
      cellRatio
    ) {
      sourceWidth =
        img.naturalHeight *
        cellRatio;

      sx =
        (
          img.naturalWidth -
          sourceWidth
        ) /
        2;
    } else if (
      imageRatio <
      cellRatio
    ) {
      sourceHeight =
        img.naturalWidth /
        cellRatio;

      sy =
        (
          img.naturalHeight -
          sourceHeight
        ) /
        2;
    }

    ctx.drawImage(
      img,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  }

  for (
    let i = 0;
    i < list.length;
    i++
  ) {
    try {
      const img =
        await loadImage(
          list[i].thumbnail
        );

      const x =
        (
          i %
          columns
        ) *
        cellW;

      const y =
        Math.floor(
          i /
          columns
        ) *
        cellH;

      drawImageCover(
        ctx,
        img,
        x,
        y,
        cellW,
        cellH
      );

    } catch (
      error
    ) {
      console.warn(
        "thumbnail skipped",
        list[i].thumbnail
      );
    }
  }

  canvas.toBlob(
    blob => {
      if (
        !blob
      ) {
        return;
      }

      const a =
        document.createElement(
          "a"
        );

      const url =
        URL.createObjectURL(
          blob
        );

      a.href =
        url;

      a.download =
        `thumbnail-collection-${page * 100 + 1}-${Math.min(
          page * 100 +
          list.length,
          DATA.videos.length
        )}.png`;

      a.click();

      setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        1000
      );

    },
    "image/png"
  );
}

function loadImage(src) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const img =
        new Image();

      img.crossOrigin =
        "anonymous";

      img.onload =
        () =>
          resolve(img);

      img.onerror =
        reject;

      img.src =
        src;
    }
  );
}

/* =========================================================
   Range controls
========================================================= */

function setupRange() {
  document
    .querySelectorAll(
      ".preset-group button"
    )
    .forEach(
      button => {
        button.onclick =
          () => {
            const value =
              button.dataset.range;

            rangeDays =
              value === "all"
                ? "all"
                : Number(
                    value
                  );

            rangeOffset =
              0;

            document
              .querySelectorAll(
                ".preset-group button"
              )
              .forEach(
                other => {
                  other
                    .classList
                    .toggle(
                      "selected",
                      other ===
                        button
                    );
                }
              );

            renderCharts();
          };
      }
    );

  $("prevRange").onclick =
    () => {
      if (
        rangeDays !==
        "all"
      ) {
        rangeOffset--;

        renderCharts();
      }
    };

  $("nextRange").onclick =
    () => {
      if (
        rangeDays !==
        "all" &&
        rangeOffset < 0
      ) {
        rangeOffset++;

        renderCharts();
      }
    };
}

/* =========================================================
   Navigation
========================================================= */

function setupNav() {
  const buttons =
    document.querySelectorAll(
      ".switch-btn[data-page]"
    );

  function openPage(
    pageName,
    updateUrl = true
  ) {

    const targetPage =
      pageName === "analytics"
        ? "analytics"
        : "videos";


    buttons.forEach(
      button => {

        button
          .classList
          .toggle(
            "active",
            button.dataset.page ===
              targetPage
          );

      }
    );


    document
      .querySelectorAll(".page")
      .forEach(
        page =>
          page
            .classList
            .remove("active")
      );


    const targetId =
      targetPage === "analytics"
        ? "analyticsPage"
        : "videosPage";


    $(targetId)
      .classList
      .add("active");


    if (
      targetPage ===
      "analytics"
    ) {

      renderCharts();

      renderSubscriberHistory();

    }


    if (updateUrl) {

      const url =
        new URL(
          window.location.href
        );


      if (
        targetPage ===
        "videos"
      ) {

        url.searchParams
          .delete("page");

      }

      else {

        url.searchParams
          .set(
            "page",
            targetPage
          );

      }


      window.history
        .replaceState(
          {},
          "",
          url
        );

    }

  }

  buttons.forEach(
    button => {

      button.onclick =
        () => {

          openPage(
            button.dataset.page
          );

        };

    }
  );

  /*
  Future outlookから

  ../index.html?page=analytics

  のように戻ってきた場合、
  URLを見て最初からAnalyticsを開く。
  */

  const params =
    new URLSearchParams(
      window.location.search
    );

  const requestedPage =
    params.get("page");

  if (
    requestedPage ===
    "analytics"
  ) {

    openPage(
      "analytics",
      false
    );

  }

  else {

    openPage(
      "videos",
      false
    );

  }
}

/* =========================================================
   Modal setup
========================================================= */

function setupModals() {
  $("closeVideoDetail")
    .onclick =
    closeVideoDetail;

  $("videoDetailModal")
    .onclick =
    event => {
      if (
        event.target.id ===
        "videoDetailModal"
      ) {
        closeVideoDetail();
      }
    };

  $("closeCollage")
    .onclick =
    closeCollage;

  $("collageModal")
    .onclick =
    event => {
      if (
        event.target.id ===
        "collageModal"
      ) {
        closeCollage();
      }
    };

  document
    .addEventListener(
      "keydown",
      event => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        closeVideoDetail();

        closeCollage();
      }
    );
}

/* =========================================================
   Mobile chart tooltip close
========================================================= */

function setupMobileChartTooltipClose() {
  document.addEventListener(
    "touchstart",
    event => {
      const subsCanvas =
        $("subsChart");

      const newSubsCanvas =
        $("newSubsChart");

      const touchedSubsChart =
        subsCanvas &&
        subsCanvas.contains(
          event.target
        );

      const touchedNewSubsChart =
        newSubsCanvas &&
        newSubsCanvas.contains(
          event.target
        );

      if (
        touchedSubsChart ||
        touchedNewSubsChart
      ) {
        return;
      }

      if (subsChart) {
        subsChart.setActiveElements([]);

        if (
          subsChart.tooltip
        ) {
          subsChart.tooltip.setActiveElements(
            [],
            {
              x: 0,
              y: 0
            }
          );
        }

        subsChart.update("none");
      }

      if (newSubsChart) {
        newSubsChart.setActiveElements([]);

        if (
          newSubsChart.tooltip
        ) {
          newSubsChart.tooltip.setActiveElements(
            [],
            {
              x: 0,
              y: 0
            }
          );
        }

        newSubsChart.update("none");
      }
    },
    {
      passive: true
    }
  );
}

/* =========================================================
   Subscriber history
========================================================= */

function setupSubscriberHistory() {
  $("showMoreSubscribers")
    .onclick =
    () => {
      const rows =
        sortedSubscribers();

      subscriberHistoryLimit +=
        SUBSCRIBER_HISTORY_STEP;

      if (
        subscriberHistoryLimit >
        rows.length
      ) {
        subscriberHistoryLimit =
          rows.length;
      }

      renderSubscriberHistory();
    };

  $("closeSubscribers")
    .onclick =
    () => {
      subscriberHistoryLimit =
        SUBSCRIBER_HISTORY_INITIAL_LIMIT;

      renderSubscriberHistory();
    };
}

/* =========================================================
   Init
========================================================= */

async function init() {
  try {
    const response =
      await fetch(
        "data.json?ts=" +
        Date.now(),
        {
          cache:
            "no-store"
        }
      );

    DATA =
      await response.json();

  } catch (
    error
  ) {
    console.error(
      error
    );

    return;
  }

  normalizeVideos();

  if (
    typeof updateCommonHeader ===
    "function"
  ) {
    updateCommonHeader(DATA);
  }

  renderSummary();
  renderTags();
    renderVideos();

  refreshSortUpdateDot();

  buildRolling();
  renderTrendAnalysis();
  renderSubscriberHistory();

  setupRange();
  setupNav();
  setupModals();

  /*
   * Future outlookのCOMPLETEDカードから
   *
   * index.html?page=videos&video=VIDEO_ID
   *
   * で来た場合、data.jsonの読み込み完了後に
   * 対象動画の詳細を自動で開く。
   */
  openRequestedVideoFromUrl();

  setupSubscriberHistory();
  setupMobileChartTooltipClose();

   $("sortSelect")
    .onchange =
    () => {
      if (
        $("sortSelect").value ===
        "popular"
      ) {
        markPopularRankingAsSeen();
      }

      renderVideos();
    };

  $("tagSelect")
    .onchange =
    renderVideos;

  $("openCollage")
    .onclick =
    openCollage;

  $("downloadCollage")
    .onclick =
    downloadCollage;
}

init();
