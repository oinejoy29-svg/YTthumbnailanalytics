/* =========================================================
   Future outlook
========================================================= */

const FUTURE_START_DATE =
  "2026-04-03";

const GOAL_STATE_KEY =
  "joyFutureGoalState";

const GOAL_HISTORY_KEY =
  "joyFutureGoalHistory";

let DATA = {
  subscribers: [],
  videos: [],
  updatedAt: null
};

let scenarioChart =
  null;

let scenarioRangeDays =
  30;

let scenarioRangeLabel =
  "1ヶ月後";

let calendarMonth =
  null;

let postingRecommendation =
  null;


const $ =
  id =>
    document.getElementById(id);



/* =========================================================
   Basic helpers
========================================================= */

function dateObj(
  date
) {

  return new Date(
    `${date}T00:00:00+09:00`
  );

}


function dateToIso(
  date
) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


function todayJST() {

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    )
      .formatToParts(
        new Date()
      );


  const get =
    type =>
      parts.find(
        part =>
          part.type === type
      )?.value || "";


  return (
    `${get("year")}-` +
    `${get("month")}-` +
    `${get("day")}`
  );

}


function jpDate(
  date
) {

  if (!date) {
    return "—";
  }


  const [
    year,
    month,
    day
  ] =
    date
      .split("-")
      .map(Number);


  return (
    `${year}/${month}/${day}`
  );

}


function monthDay(
  date
) {

  if (!date) {
    return "—";
  }


  const [
    ,
    month,
    day
  ] =
    date
      .split("-")
      .map(Number);


  return (
    `${month}/${day}`
  );

}


function fmt(
  value
) {

  return Number(
    value ?? 0
  ).toLocaleString(
    "ja-JP"
  );

}


function diffDays(
  later,
  earlier
) {

  return Math.round(
    (
      dateObj(later) -
      dateObj(earlier)
    ) /
    86400000
  );

}


function addDays(
  dateString,
  days
) {

  const date =
    dateObj(
      dateString
    );


  date.setDate(
    date.getDate() +
    days
  );


  return dateToIso(
    date
  );

}


function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /[&<>"']/g,
      char =>
        ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#39;"
        }[char])
    );

}



/* =========================================================
   Data
========================================================= */

function normalizeData() {

  DATA.subscribers =
    [
      ...(
        DATA.subscribers ||
        []
      )
    ]
      .map(
        row => ({
          date:
            String(
              row.date || ""
            ),

          count:
            Number(
              row.count || 0
            )
        })
      )
      .filter(
        row =>
          row.date
      )
      .sort(
        (a,b) =>
          a.date.localeCompare(
            b.date
          )
      );


  DATA.videos =
    [
      ...(
        DATA.videos ||
        []
      )
    ]
      .map(
        video => ({
          ...video,

          date:
            String(
              video.date ||
              video.publishedAt ||
              ""
            )
              .slice(
                0,
                10
              ),

          id:
            video.id ||
            video.videoId ||
            "",

          thumbnail:
            video.thumbnail ||
            video.thumbnailUrl ||
            (
              video.id ||
              video.videoId
                ? `https://i.ytimg.com/vi/${video.id || video.videoId}/hqdefault.jpg`
                : ""
            )
        })
      )
      .filter(
        video =>
          video.date
      )
      .sort(
        (a,b) =>
          a.date.localeCompare(
            b.date
          )
      );

}


function subscribers() {

  return DATA.subscribers;

}


function latestSubscriber() {

  return (
    subscribers()
      .at(-1) ||
    null
  );

}


function currentSubscribers() {

  return Number(
    DATA.currentSubscriberCount ??
    latestSubscriber()?.count ??
    0
  );

}



/* =========================================================
   Growth pace
========================================================= */

function calculateSlopeForDays(
  rangeDays
) {

  const rows =
    subscribers();


  if (
    rows.length <
    2
  ) {

    return 0;

  }


  const latest =
    rows.at(-1);


  const cutoff =
    addDays(
      latest.date,
      -rangeDays
    );


  let start =
    rows[0];


  const beforeCutoff =
    rows.filter(
      row =>
        row.date <= cutoff
    );


  if (
    beforeCutoff.length
  ) {

    start =
      beforeCutoff.at(-1);

  }

  else {

    const inside =
      rows.find(
        row =>
          row.date >= cutoff
      );

    if (inside) {
      start = inside;
    }

  }


  const days =
    Math.max(
      1,
      diffDays(
        latest.date,
        start.date
      )
    );


  return (
    Number(
      latest.count
    ) -
    Number(
      start.count
    )
  ) /
  days;

}


function calculateAllSlope() {

  const rows =
    subscribers();


  if (
    rows.length <
    2
  ) {

    return 0;

  }


  const first =
    rows[0];

  const last =
    rows.at(-1);


  const days =
    Math.max(
      1,
      diffDays(
        last.date,
        first.date
      )
    );


  return (
    Number(
      last.count
    ) -
    Number(
      first.count
    )
  ) /
  days;

}


function growthPaces() {

  const pace7 =
    calculateSlopeForDays(
      7
    );

  const pace30 =
    calculateSlopeForDays(
      30
    );

  const paceAll =
    calculateAllSlope();


  const weighted =
    pace7 * .50 +
    pace30 * .35 +
    paceAll * .15;


  return {
    pace7,
    pace30,
    paceAll,
    weighted
  };

}



/* =========================================================
   Goal state
========================================================= */

function loadGoalState() {

  const state =
    DATA.goalForecast;


  return (
    state &&
    typeof state === "object"
  )
    ? state
    : null;

}


function loadGoalHistory() {

  return Array.isArray(
    DATA.goalForecastHistory
  )
    ? DATA.goalForecastHistory
    : [];

}


function nextMilestone(
  current
) {

  return (
    Math.floor(
      current /
      100
    ) +
    1
  ) *
  100;

}


function calculateEta(
  current,
  target,
  pace,
  fromDate
) {

  if (
    !Number.isFinite(
      pace
    ) ||
    pace <= 0
  ) {

    return null;

  }


  const remaining =
    Math.max(
      0,
      target -
      current
    );


  const days =
    Math.ceil(
      remaining /
      pace
    );


  return addDays(
    fromDate,
    days
  );

}


function createGoalState() {

  const current =
    currentSubscribers();

  const target =
    nextMilestone(
      current
    );

  const paces =
    growthPaces();

  const createdDate =
    latestSubscriber()?.date ||
    todayJST();


  const eta =
    calculateEta(
      current,
      target,
      paces.weighted,
      createdDate
    );


  return {
    target,
    startCount:
      current,

    createdDate,

    eta,

    fixedPace:
      paces.weighted
  };

}


function findAchievementDate(
  state
) {

  const match =
    subscribers()
      .find(
        row =>
          row.date >=
            state.createdDate &&
          Number(
            row.count
          ) >=
            Number(
              state.target
            )
      );


  return (
    match?.date ||
    todayJST()
  );

}


function processGoalState() {

  const state =
    loadGoalState();


  if (
    state &&
    Number.isFinite(Number(state.target)) &&
    Number.isFinite(Number(state.startCount)) &&
    Number.isFinite(Number(state.fixedPace))
  ) {

    return state;

  }


  /*
    古いdata.jsonを開いた直後など、
    backend側の固定予測がまだ無い場合だけ
    一時表示用に計算する。

    この値は保存しない。
    GitHub Actions実行後はdata.jsonの固定値が
    唯一の正しい予測になる。
  */
  return createGoalState();

}



/* =========================================================
   Goal rendering
========================================================= */

function renderGoal() {

  const state =
    processGoalState();

  const paces =
    growthPaces();

  const current =
    currentSubscribers();


  $("goalTarget")
    .textContent =
    `${fmt(state.target)} subscribers`;


  $("goalCurrent")
    .textContent =
    `${fmt(current)}人`;


  $("goalToday")
    .textContent =
    jpDate(
      todayJST()
    );


  $("goalEta")
    .textContent =
    state.eta
      ? jpDate(
          state.eta
        )
      : "算出不可";


  const remaining =
    Math.max(
      0,
      Number(
        state.target
      ) -
      current
    );


  $("goalRemaining")
    .textContent =
    `あと ${fmt(remaining)}人`;


  const lowerMilestone =
    Math.max(
      0,
      Number(
        state.target
      ) -
      100
    );


  const progress =
    Math.max(
      0,
      Math.min(
        100,
        (
          (
            current -
            lowerMilestone
          ) /
          100
        ) *
        100
      )
    );


  $("goalProgressBar")
    .style.width =
    `${progress}%`;


  $("goalProgressPercent")
    .textContent =
    `${progress.toFixed(0)}%`;


  if (
    state.eta
  ) {

    const remainingDays =
      diffDays(
        state.eta,
        todayJST()
      );


    $("goalRemainingDays")
      .textContent =
      remainingDays >= 0
        ? `残り予測 ${remainingDays}日`
        : `予測日から ${Math.abs(remainingDays)}日経過`;

  }

  else {

    $("goalRemainingDays")
      .textContent =
      "残り予測 —日";

  }


  $("pace7")
    .textContent =
    paces.pace7
      .toFixed(1);


  $("pace30")
    .textContent =
    paces.pace30
      .toFixed(1);


  $("paceAll")
    .textContent =
    paces.paceAll
      .toFixed(1);


  $("paceWeighted")
    .textContent =
    Number(
      state.fixedPace || 0
    )
      .toFixed(1);


  renderGoalStatus(
    state,
    current
  );


  renderPredictionHistory();

}



/* =========================================================
   Goal status
========================================================= */

function renderGoalStatus(
  state,
  current
) {

  const latestDate =
    latestSubscriber()?.date ||
    todayJST();


  const elapsedDays =
    Math.max(
      0,
      diffDays(
        latestDate,
        state.createdDate
      )
    );


  const expected =
    Number(
      state.startCount
    ) +
    Number(
      state.fixedPace || 0
    ) *
    elapsedDays;


  const difference =
    current -
    expected;


  const threshold =
    Math.max(
      3,
      Math.abs(
        Number(
          state.fixedPace || 0
        )
      ) *
      2
    );


  $("paceDifference")
    .textContent =
    `${difference >= 0 ? "+" : ""}${difference.toFixed(1)}人`;


  if (
    difference >
         threshold
  ) {

    $("paceStatus")
      .textContent =
      "予測より好調";


    $("paceAdvice")
      .textContent =
      "固定した予測ペースを上回って進んでいます。このペースが続けば、予想到達日より早くマイルストーンに到達する可能性があります。";


    return;

  }


  if (
    difference <
    -threshold
  ) {

    $("paceStatus")
      .textContent =
      "予測より遅め";


    $("paceAdvice")
      .textContent =
      "現在は固定した予測ペースをやや下回っています。予想到達日は変更せず、今後の伸びを引き続き比較します。";


    return;

  }


  $("paceStatus")
    .textContent =
    "ほぼ予測通り";


  $("paceAdvice")
    .textContent =
    "現在の登録者数は固定した予測ライン付近で推移しています。今のところ大きなペースのずれはありません。";

}



/* =========================================================
   Prediction history
========================================================= */

function renderPredictionHistory() {

  const history =
    loadGoalHistory();


  if (
    !history.length
  ) {

    $("predictionHistory")
      .innerHTML =
      `
        <div class="empty-state">
          達成済みの予測はまだありません。
        </div>
      `;


    return;

  }


  $("predictionHistory")
    .innerHTML =
    history
      .map(
        item => {

          let resultText =
            "—";

          let resultClass =
            "";


          if (
            item.predictedDate &&
            item.actualDate
          ) {

            const difference =
              diffDays(
                item.predictedDate,
                item.actualDate
              );


            if (
              difference > 0
            ) {

              resultText =
                `${difference}日早く達成`;

              resultClass =
                "history-early";

            }

            else if (
              difference < 0
            ) {

              resultText =
                `${Math.abs(difference)}日遅く達成`;

              resultClass =
                "history-late";

            }

            else {

              resultText =
                "予測日どおり";

            }

          }


          return `
            <div class="prediction-history-item">

              <strong class="history-target">
                ${fmt(item.target)}人
              </strong>

              <span>
                予測 ${item.predictedDate ? jpDate(item.predictedDate) : "—"}
              </span>

              <span>
                実績 ${item.actualDate ? jpDate(item.actualDate) : "—"}
              </span>

              <span
                class="history-result ${resultClass}"
              >
                ${resultText}
              </span>

            </div>
          `;

        }
      )
      .join("");

}



/* =========================================================
   7-DAY FORECAST
========================================================= */

function parseDateTime(
  value
) {

  if (!value) {
    return null;
  }


  const date =
    new Date(value);


  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;

}


function forecastTargetDate(
  video
) {

  const forecast =
    video.sevenDayForecast;


  return (
    parseDateTime(
      forecast?.targetAt
    ) ||
    (
      parseDateTime(
        video.publishedAt
      )
        ? new Date(
            parseDateTime(
              video.publishedAt
            ).getTime() +
            168 * 60 * 60 * 1000
          )
        : null
    )
  );

}


function forecastCompletedDate(
  video
) {

  return (
    parseDateTime(
      video.sevenDayCompletedAt
    ) ||
    parseDateTime(
      video.sevenDayForecast?.completedAt
    )
  );

}


function isForecastCompleted(
  video
) {

  return Boolean(
    video.sevenDayForecast &&
    (
      video.sevenDayForecast.status ===
        "completed" ||
      Number.isFinite(
        Number(
          video.sevenDayViews
        )
      )
    )
  );

}


function shouldShowCompletedForecast(
  video,
  now = new Date()
) {

  if (
    !isForecastCompleted(
      video
    )
  ) {
    return false;
  }


  const completedAt =
    forecastCompletedDate(
      video
    );


  if (!completedAt) {
    return false;
  }


  const elapsed =
    now.getTime() -
    completedAt.getTime();


  return (
    elapsed >= 0 &&
    elapsed <
      24 * 60 * 60 * 1000
  );

}


function forecastDayNumber(
  video,
  now = new Date()
) {

  const publishedAt =
    parseDateTime(
      video.publishedAt
    );


  if (!publishedAt) {
    return 1;
  }


  const elapsedHours =
    Math.max(
      0,
      (
        now.getTime() -
        publishedAt.getTime()
      ) /
      3600000
    );


  return Math.max(
    1,
    Math.min(
      7,
      Math.floor(
        elapsedHours / 24
      ) + 1
    )
  );

}


function forecastElapsedRatio(
  video,
  now = new Date()
) {

  const publishedAt =
    parseDateTime(
      video.publishedAt
    );


  if (!publishedAt) {
    return 0;
  }


  return Math.max(
    0,
    Math.min(
      1,
      (
        now.getTime() -
        publishedAt.getTime()
      ) /
      (
        168 *
        60 *
        60 *
        1000
      )
    )
  );

}


function forecastPaceStatus(
  video,
  now = new Date()
) {

  const predicted =
    Number(
      video.sevenDayForecast
        ?.predictedViews ||
      0
    );

  const current =
    Number(
      video.viewCount ||
      0
    );

  const elapsedRatio =
    forecastElapsedRatio(
      video,
      now
    );


  if (
    predicted <= 0 ||
    elapsedRatio <= 0
  ) {

    return {
      differencePercent: 0,
      text:
        "予測ペースを確認しています"
    };

  }


  const expectedNow =
    predicted *
    elapsedRatio;


  if (
    expectedNow <= 0
  ) {

    return {
      differencePercent: 0,
      text:
        "予測ペースを確認しています"
    };

  }


  const differencePercent =
    (
      current /
      expectedNow -
      1
    ) *
    100;


  if (
    differencePercent >= 5
  ) {

    return {
      differencePercent,
      text:
        "予測を上回るペースで伸びています"
    };

  }


  if (
    differencePercent <= -5
  ) {

    return {
      differencePercent,
      text:
        "ややペースが予測より低いです"
    };

  }


  return {
    differencePercent,
    text:
      "予測通りです"
  };

}


function forecastDots(
  day
) {

  return Array.from(
    { length: 7 },
    (_, index) => `
      <span
        class="seven-day-dot ${index < day ? "active" : ""}"
        aria-hidden="true"
      ></span>
    `
  ).join("");

}


function openCompletedForecastVideo(
  videoId
) {

  if (!videoId) {
    return;
  }


  window.location.href =
    `../index.html?page=videos&video=${encodeURIComponent(videoId)}`;

}


function renderActiveForecastCard(
  video,
  now
) {

  const forecast =
    video.sevenDayForecast ||
    {};

  const predicted =
    Number(
      forecast.predictedViews ||
      0
    );

  const current =
    Number(
      video.viewCount ||
      0
    );

  const day =
    forecastDayNumber(
      video,
      now
    );

  const pace =
    forecastPaceStatus(
      video,
      now
    );


  return `
    <article class="seven-day-card active-forecast">

      <div class="seven-day-video-side">

        <div class="seven-day-thumbnail-wrap">
          <img
            class="seven-day-thumbnail"
            src="${escapeHtml(video.thumbnail || "")}"
            alt=""
            loading="lazy"
          >
        </div>

        <strong class="seven-day-video-title">
          ${escapeHtml(video.title || "")}
        </strong>

      </div>


      <div class="seven-day-metrics">

        <span class="seven-day-label">
          7日予測
        </span>

        <div class="seven-day-prediction-line">
          <strong class="seven-day-predicted">
            ${fmt(predicted)}回
          </strong>

          <span
            class="seven-day-lock"
            aria-label="予測値は固定されています"
            title="予測値は固定されています"
          >
            🔒
          </span>
        </div>

        <div class="seven-day-current">
          <span>現在</span>
          <strong>${fmt(current)}回</strong>
        </div>

        <strong class="seven-day-day">
          DAY ${day} / 7
        </strong>

        <div
          class="seven-day-dots"
          aria-label="7日間の進捗 ${day}日目"
        >
          ${forecastDots(day)}
        </div>

        <p class="seven-day-status-text">
          ${escapeHtml(pace.text)}
        </p>

      </div>

    </article>
  `;

}


function renderCompletedForecastCard(
  video
) {

  return `
    <button
      class="seven-day-card completed-forecast"
      type="button"
      data-forecast-video-id="${escapeHtml(video.id || "")}"
      aria-label="${escapeHtml(video.title || "")}をVideo collectionsで開く"
    >

      <div class="seven-day-video-side">

        <div class="seven-day-thumbnail-wrap">
          <img
            class="seven-day-thumbnail"
            src="${escapeHtml(video.thumbnail || "")}"
            alt=""
            loading="lazy"
          >
        </div>

        <strong class="seven-day-video-title">
          ${escapeHtml(video.title || "")}
        </strong>

      </div>

      <div class="seven-day-completed-side">
        <strong>
          ✓ COMPLETED
        </strong>

        <span>
          Video collectionsで結果を見る
        </span>
      </div>

    </button>
  `;

}


function renderSevenDayForecasts() {

  const container =
    $("sevenDayForecastList");


  if (!container) {
    return;
  }


  const now =
    new Date();


  const forecastVideos =
    DATA.videos
      .filter(
        video =>
          video.sevenDayForecast &&
          video.sevenDayForecast.locked ===
            true
      )
      .filter(
        video => {

          if (
            isForecastCompleted(
              video
            )
          ) {

            return shouldShowCompletedForecast(
              video,
              now
            );

          }


          const target =
            forecastTargetDate(
              video
            );


          return (
            !target ||
            now.getTime() <
              target.getTime()
          );

        }
      )
      .sort(
        (a,b) =>
          String(
            b.publishedAt ||
            b.date ||
            ""
          ).localeCompare(
            String(
              a.publishedAt ||
              a.date ||
              ""
            )
          )
      );


  if (
    !forecastVideos.length
  ) {

    container.innerHTML = `
      <div class="seven-day-empty">
        現在、予測中の動画はありません。
      </div>
    `;


    return;
  }


  container.innerHTML =
    forecastVideos
      .map(
        video =>
          isForecastCompleted(video)
            ? renderCompletedForecastCard(video)
            : renderActiveForecastCard(video, now)
      )
      .join("");


  container
    .querySelectorAll(
      "[data-forecast-video-id]"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            openCompletedForecastVideo(
              button.dataset.forecastVideoId
            );

      }
    );

}



/* =========================================================
   Future scenarios
========================================================= */
function scenarioDisplayDate(
  date
) {

  const [
    year,
    month,
    day
  ] =
    date
      .split("-")
      .map(Number);


  return (
    `${year}/${month}/${day}`
  );

}

function renderScenarios() {

  const current =
    currentSubscribers();

  const paces =
    growthPaces();


  const standardPace =
    Math.max(
      0,
      paces.weighted
    );


  const cautiousPace =
    standardPace *
    .80;


  const positivePace =
    standardPace *
    1.20;


  /*
    上の3つの予測箱だけ、
    選択された期間で計算する
  */

  const selectedDays =
    scenarioRangeDays;

   const startDate =
  todayJST();

const forecastDate =
  addDays(
    startDate,
    selectedDays
  );


$("scenarioDateRange")
  .textContent =
  `${scenarioDisplayDate(startDate)} → ${scenarioDisplayDate(forecastDate)}`;


  $("scenarioLowValue")
    .textContent =
    `${fmt(
      Math.round(
        current +
        cautiousPace *
        selectedDays
      )
    )}人`;


  $("scenarioStandardValue")
    .textContent =
    `${fmt(
      Math.round(
        current +
        standardPace *
        selectedDays
      )
    )}人`;


  $("scenarioHighValue")
    .textContent =
    `${fmt(
      Math.round(
        current +
        positivePace *
        selectedDays
      )
    )}人`;


  /*
    箱の下の期間表示
  */

  $("scenarioLowPeriod")
    .textContent =
    scenarioRangeLabel;

  $("scenarioStandardPeriod")
    .textContent =
    scenarioRangeLabel;

  $("scenarioHighPeriod")
    .textContent =
    scenarioRangeLabel;


  /*
    グラフは今まで通り固定。
    ボタンを押しても表示期間は変えない。
  */

  const horizon =
    180;


  const labels =
    [];

  const lowValues =
    [];

  const standardValues =
    [];

  const highValues =
    [];


  for (
    let day = 0;
    day <= horizon;
    day += 7
  ) {

    const date =
      addDays(
        todayJST(),
        day
      );


    labels.push(
      monthDay(
        date
      )
    );


    lowValues.push(
      Math.round(
        current +
        cautiousPace *
        day
      )
    );


    standardValues.push(
      Math.round(
        current +
        standardPace *
        day
      )
    );


    highValues.push(
      Math.round(
        current +
        positivePace *
        day
      )
    );

  }


  if (
    scenarioChart
  ) {

    scenarioChart.destroy();

  }


  scenarioChart =
    new Chart(
      $("scenarioChart"),
      {
        type:
          "line",

        data: {
          labels,

          datasets: [
            {
              label:
                "慎重",

              data:
                lowValues,

              tension:
                .28,

              pointRadius:
                0,

              borderWidth:
                2
            },

            {
              label:
                "標準",

              data:
                standardValues,

              tension:
                .28,

              pointRadius:
                0,

              borderWidth:
                3
            },

            {
              label:
                "好調",

              data:
                highValues,

              tension:
                .28,

              pointRadius:
                0,

              borderWidth:
                2
            }
          ]
        },

        options: {
          responsive:
            true,

          maintainAspectRatio:
            false,

          interaction: {
            mode:
              "index",

            intersect:
              false
          },

          plugins: {
            legend: {
              display:
                true,

              position:
                "bottom"
            }
          },

          scales: {
            x: {
              grid: {
                display:
                  false
              },

              ticks: {
                maxTicksLimit:
                  9,

                maxRotation:
                  0
              }
            },

            y: {
              ticks: {
                callback:
                  value =>
                    fmt(value)
              }
            }
          }
        }
      }
    );

}

function setupScenarioRangeControls() {

  const buttons =
    document.querySelectorAll(
      ".scenario-range-btn"
    );


  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const days =
            Number(
              button.dataset.scenarioDays
            );

          const label =
            button.dataset.scenarioLabel;


          if (
            !Number.isFinite(days) ||
            days <= 0
          ) {

            return;

          }


          scenarioRangeDays =
            days;

          scenarioRangeLabel =
            label || "1ヶ月後";


          buttons.forEach(
            item => {

              item.classList.toggle(
                "active",
                item === button
              );

            }
          );


          renderScenarios();

        }
      );

    }
  );

}



/* =========================================================
   Posting intervals
========================================================= */

function uniquePostingDates() {

  return [
    ...new Set(
      DATA.videos
        .map(
          video =>
            video.date
        )
        .filter(Boolean)
    )
  ]
    .sort();

}


function averageIntervals(
  dates
) {

  if (
    dates.length <
    2
  ) {

    return 0;

  }


  const intervals =
    [];


  for (
    let i = 1;
    i < dates.length;
    i++
  ) {

    intervals.push(
      Math.max(
        0,
        diffDays(
          dates[i],
          dates[i - 1]
        )
      )
    );

  }


  return (
    intervals.reduce(
      (a,b) =>
        a + b,
      0
    ) /
    intervals.length
  );

}


function calculatePostingRecommendation() {

  const dates =
    uniquePostingDates();


  if (
    !dates.length
  ) {

    return null;

  }


  const recentDates =
    dates.slice(
      -11
    );


  const recent =
    averageIntervals(
      recentDates
    );


  const all =
    averageIntervals(
      dates
    );


  let weightedInterval;


  if (
    recent > 0 &&
    all > 0
  ) {

    weightedInterval =
      recent *
      .65 +
      all *
      .35;

  }

  else {

    weightedInterval =
      recent ||
      all ||
      1;

  }


  const latestPost =
    dates.at(-1);


  const center =
    addDays(
      latestPost,
      Math.max(
        1,
        Math.round(
          weightedInterval
        )
      )
    );


  const start =
    addDays(
      center,
      -1
    );


  const end =
    addDays(
      center,
      1
    );


  return {
    recent,
    all,
    weightedInterval,
    latestPost,
    center,
    start,
    end
  };

}



/* =========================================================
   Posting summary
========================================================= */

function renderPostingSummary() {

  postingRecommendation =
    calculatePostingRecommendation();


  if (
    !postingRecommendation
  ) {

    $("recentPostInterval")
      .textContent =
      "—";


    $("allPostInterval")
      .textContent =
      "—";


    $("recommendedWindow")
      .textContent =
      "—";


    return;

  }


  $("recentPostInterval")
    .textContent =
    postingRecommendation.recent
      .toFixed(1);


  $("allPostInterval")
    .textContent =
    postingRecommendation.all
      .toFixed(1);


  $("recommendedWindow")
    .textContent =
    `${monthDay(postingRecommendation.start)}〜${monthDay(postingRecommendation.end)}`;


  if (
    !calendarMonth
  ) {

    const initialDate =
      dateObj(
        postingRecommendation.start
      );


    calendarMonth =
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1
      );

  }

}



/* =========================================================
   Calendar
========================================================= */

function videosForDate(
  date
) {

  return DATA.videos
    .filter(
      video =>
        video.date ===
        date
    );

}


function isRecommendationDate(
  date
) {

  if (
    !postingRecommendation
  ) {

    return false;

  }


  return (
    date >=
      postingRecommendation.start &&
    date <=
      postingRecommendation.end
  );

}


function renderCalendar() {

  if (
    !calendarMonth
  ) {

    const today =
      dateObj(
        todayJST()
      );


    calendarMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

  }


  const year =
    calendarMonth
      .getFullYear();


  const month =
    calendarMonth
      .getMonth();


  $("calendarMonthLabel")
    .textContent =
    `${year}年${month + 1}月`;


  const firstDay =
    new Date(
      year,
      month,
      1
    );


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    );


  const startBlank =
    firstDay.getDay();


  const days =
    lastDay.getDate();


  const cells =
    [];


  for (
    let i = 0;
    i < startBlank;
    i++
  ) {

    cells.push(`
      <div class="calendar-day empty"></div>
    `);

  }


  for (
    let day = 1;
    day <= days;
    day++
  ) {

    const date =
      dateToIso(
        new Date(
          year,
          month,
          day
        )
      );


    const videos =
      videosForDate(
        date
      );


    const recommended =
      isRecommendationDate(
        date
      );


    const today =
      date ===
      todayJST();


    cells.push(`
      <div
        class="
          calendar-day
          ${recommended ? "recommended-day" : ""}
          ${today ? "today" : ""}
        "
      >

        <span class="calendar-date">
          ${day}
        </span>

        <div class="calendar-posts">

          ${videos
            .map(
              video => `
                <div
                  class="calendar-post"
                  title="${escapeHtml(video.title || "")}"
                >

                  <img
                    src="${escapeHtml(video.thumbnail || "")}"
                    alt=""
                    loading="lazy"
                  >

                  <span class="calendar-post-title">
                    ${escapeHtml(video.title || "")}
                  </span>

                </div>
              `
            )
            .join("")
          }

        </div>

        ${
          recommended &&
          !videos.length
            ? `
              <span class="recommend-badge">
                RECOMMENDED
              </span>
            `
            : ""
        }

      </div>
    `);

  }


  const total =
    cells.length;


  const remainder =
    total %
    7;


  if (
    remainder !==
    0
  ) {

    const missing =
      7 -
      remainder;


    for (
      let i = 0;
      i < missing;
      i++
    ) {

      cells.push(`
        <div class="calendar-day empty"></div>
      `);

    }

  }


  $("calendarGrid")
    .innerHTML =
    cells.join("");

}



/* =========================================================
   Calendar controls
========================================================= */

function setupCalendarControls() {

  $("prevMonth")
    .onclick =
    () => {

      calendarMonth =
        new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth() - 1,
          1
        );


      renderCalendar();

    };


  $("nextMonth")
    .onclick =
    () => {

      calendarMonth =
        new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth() + 1,
          1
        );


      renderCalendar();

    };

}



/* =========================================================
   Mobile chart tooltip
========================================================= */

function setupMobileChartTooltipClose() {

  document.addEventListener(
    "touchstart",
    event => {

      const canvas =
        $("scenarioChart");


      if (
        canvas &&
        canvas.contains(
          event.target
        )
      ) {

        return;

      }


      if (
        scenarioChart
      ) {

        scenarioChart
          .setActiveElements(
            []
          );


        if (
          scenarioChart.tooltip
        ) {

          scenarioChart
            .tooltip
            .setActiveElements(
              [],
              {
                x:0,
                y:0
              }
            );

        }


        scenarioChart
          .update(
            "none"
          );

      }

    },
    {
      passive:
        true
    }
  );

}



/* =========================================================
   Init
========================================================= */

async function initFuture() {

  try {

    const response =
      await fetch(
        "../data.json?ts=" +
        Date.now(),
        {
          cache:
            "no-store"
        }
      );


    DATA =
      await response.json();

  }

  catch (
    error
  ) {

    console.error(
      "Future outlook data load failed:",
      error
    );


    return;

  }


  normalizeData();


  if (
    typeof updateCommonHeader ===
    "function"
  ) {

    updateCommonHeader(
      DATA
    );

  }


  renderSevenDayForecasts();

  renderGoal();

renderScenarios();

setupScenarioRangeControls();

renderPostingSummary();

  renderCalendar();

  setupCalendarControls();

  setupMobileChartTooltipClose();

}


initFuture();
