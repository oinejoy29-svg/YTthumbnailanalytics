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
      `${video.title || ""} ${video.description || ""}`
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
        video => `
          <article
            class="video-card"
            data-video-id="${escapeHtml(video.id || "")}"
            tabindex="0"
            role="button"
            aria-label="動画詳細を開く"
          >
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
                ${fmt(video.viewCount)}回
                <span class="video-meta-separator">・</span>
                ${jpDate(video.date)}
              </div>

            </div>
          </article>
        `
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

function openVideoDetail(
  video
) {
  const tags =
    video.tags ||
    detectTags(video);

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

          <button
            type="button"
            class="primary-btn edit-video-tags-btn"
            id="editVideoTags"
          >
            タグを編集
          </button>

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
  const len =
    DATA.subscribers?.length ||
    0;

  if (
    len < 2
  ) {
    return "登録者データがまだ少ないため、今後のデータからチャンネルの傾向を分析します。";
  }

  const w7 =
    getWindowStats(
      Math.min(
        7,
        len
      )
    );

  const hist =
    getHistoricalAverage();

  const compareDays =
    Math.min(
      7,
      Math.floor(
        len / 2
      )
    );

  const c7 =
    compareWindow(
      compareDays
    );

  let text =
    "";

  if (
    w7 &&
    w7.avg >
      hist * 1.5 &&
    w7.avg > 2
  ) {
    text =
      "🚀 最近は登録者の伸びが大きく加速しています。";
  } else if (
    w7 &&
    w7.avg >
      hist * 1.15
  ) {
    text =
      "📈 最近は歴代平均を上回るペースで登録者が増えています。";
  } else if (
    w7 &&
    w7.avg <
      hist * 0.65 &&
    hist > 1
  ) {
    text =
      "📉 最近は登録者の増加ペースがやや落ち着いています。";
  } else {
    text =
      "➡️ 最近は大きな変動なく、比較的安定したペースで登録者が増えています。";
  }

  if (c7) {
    if (
      c7.rate >=
      50
    ) {
      text +=
        ` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間より${Math.abs(c7.rate).toFixed(0)}%増加しています。`;

    } else if (
      c7.rate <=
      -30
    ) {
      text +=
        ` 直近${w7.n}日間の平均は＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間から${Math.abs(c7.rate).toFixed(0)}%減少しています。`;

    } else {
      text +=
        ` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日のペースです。`;
    }
  }

  const best =
    bestWindow(7);

  if (
    best &&
    w7 &&
    best.total ===
      w7.total &&
    best.total > 0
  ) {
    text +=
      " 過去の7日間と比べても最高ペースです。";
  }

  const latestVideo =
    getLatestVideo();

  if (
    latestVideo
  ) {
    const after =
      getIncreaseAfterVideo(
        latestVideo.date,
        7
      );

    if (
      after !== null &&
      after > 0
    ) {
      text +=
        ` 🎬 ${jpDate(latestVideo.date)}の動画投稿後7日間で＋${fmt(after)}人増加しています。`;
    }
  }

  return text;
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

if (typeof updateCommonHeader === "function") {
  updateCommonHeader(DATA);
}

renderSummary();
  renderTags();

  renderVideos();

  buildRolling();

  renderTrendAnalysis();

  renderSubscriberHistory();

  setupRange();

  setupNav();

  setupModals();

  setupSubscriberHistory();

  setupMobileChartTooltipClose();

  $("sortSelect")
    .onchange =
    renderVideos;

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
