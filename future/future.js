const START_DATE = "2026-04-03";

const GOAL_STATE_KEY =
  "joyFutureGoalState";

const GOAL_HISTORY_KEY =
  "joyFutureGoalHistory";

const GOAL_STEP = 100;

let DATA = {
  subscribers: [],
  videos: [],
  updatedAt: null
};

let scenarioChart = null;

let calendarYear = null;
let calendarMonth = null;

const $ = id =>
  document.getElementById(id);



/* =========================================================
   Utilities
========================================================= */

function parseDate(dateString) {
  if (!dateString) {
    return null;
  }

  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}


function formatDateJP(date) {
  if (!date) {
    return "—";
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}


function formatDateFullJP(date) {
  if (!date) {
    return "—";
  }

  return (
    `${date.getFullYear()}年` +
    `${date.getMonth() + 1}月` +
    `${date.getDate()}日`
  );
}


function formatDateShort(date) {
  if (!date) {
    return "—";
  }

  return (
    `${date.getMonth() + 1}/` +
    `${date.getDate()}`
  );
}


function toDateString(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function addDays(date, days) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}


function diffDays(dateA, dateB) {
  const oneDay =
    24 * 60 * 60 * 1000;

  const utcA =
    Date.UTC(
      dateA.getFullYear(),
      dateA.getMonth(),
      dateA.getDate()
    );

  const utcB =
    Date.UTC(
      dateB.getFullYear(),
      dateB.getMonth(),
      dateB.getDate()
    );

  return Math.round(
    (utcB - utcA) / oneDay
  );
}


function average(numbers) {
  const valid =
    numbers.filter(
      number =>
        Number.isFinite(number)
    );

  if (!valid.length) {
    return 0;
  }

  return (
    valid.reduce(
      (sum, number) =>
        sum + number,
      0
    ) / valid.length
  );
}


function roundOne(value) {
  return (
    Math.round(value * 10) /
    10
  );
}


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}



/* =========================================================
   Normalize data
========================================================= */

function normalizeSubscribers() {
  DATA.subscribers =
    (DATA.subscribers || [])
      .filter(
        item =>
          item &&
          item.date &&
          Number.isFinite(
            Number(item.count)
          )
      )
      .map(
        item => ({
          date: item.date,
          count:
            Number(item.count)
        })
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
}


function normalizeVideos() {
  DATA.videos =
    (DATA.videos || [])
      .filter(
        video =>
          video &&
          video.date
      )
      .map(
        video => ({
          ...video,

          viewCount:
            Number(
              video.viewCount || 0
            )
        })
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
}



/* =========================================================
   Header
========================================================= */

function updateHeader() {
  const subscribers =
    DATA.subscribers;

  if (!subscribers.length) {
    return;
  }

  const latest =
    subscribers[
      subscribers.length - 1
    ];

  const start =
    parseDate(START_DATE);

  const end =
    parseDate(latest.date);

  const days =
    diffDays(start, end) + 1;

  $("periodText").textContent =
    `2026/4/3～` +
    `${end.getFullYear()}/` +
    `${end.getMonth() + 1}/` +
    `${end.getDate()}`;

  $("dayCount").textContent =
    `（${days}日）`;


  let updatedDate = null;

  if (DATA.updatedAt) {
    updatedDate =
      new Date(DATA.updatedAt);
  }


  if (
    !updatedDate ||
    Number.isNaN(
      updatedDate.getTime()
    )
  ) {
    updatedDate =
      new Date();
  }


  const desktopText =
    updatedDate
      .toLocaleString(
        "ja-JP",
        {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      );


  const mobileText =
    updatedDate
      .toLocaleString(
        "ja-JP",
        {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      );


  $("updatedAtDesktop")
    .textContent =
    desktopText;

  $("updatedAtMobile")
    .textContent =
    mobileText;
}



/* =========================================================
   Growth pace
========================================================= */

function getLatestSubscriber() {
  if (!DATA.subscribers.length) {
    return null;
  }

  return (
    DATA.subscribers[
      DATA.subscribers.length - 1
    ]
  );
}


function calculateSlopeForDays(
  rangeDays
) {
  const subscribers =
    DATA.subscribers;

  if (
    subscribers.length < 2
  ) {
    return 0;
  }


  const latest =
    subscribers[
      subscribers.length - 1
    ];

  const latestDate =
    parseDate(latest.date);

  const cutoff =
    addDays(
      latestDate,
      -rangeDays
    );


  let first =
    subscribers[0];


  for (
    let i =
      subscribers.length - 1;
    i >= 0;
    i--
  ) {
    const date =
      parseDate(
        subscribers[i].date
      );

    if (date <= cutoff) {
      first =
        subscribers[i];

      break;
    }

    first =
      subscribers[i];
  }


  const firstDate =
    parseDate(first.date);

  const dayDifference =
    diffDays(
      firstDate,
      latestDate
    );


  if (
    dayDifference <= 0
  ) {
    return 0;
  }


  return (
    latest.count -
    first.count
  ) / dayDifference;
}


function calculateAllTimeSlope() {
  const subscribers =
    DATA.subscribers;

  if (
    subscribers.length < 2
  ) {
    return 0;
  }


  const first =
    subscribers[0];

  const latest =
    subscribers[
      subscribers.length - 1
    ];


  const days =
    diffDays(
      parseDate(first.date),
      parseDate(latest.date)
    );


  if (days <= 0) {
    return 0;
  }


  return (
    latest.count -
    first.count
  ) / days;
}


function getGrowthPaces() {
  const pace7 =
    calculateSlopeForDays(7);

  const pace30 =
    calculateSlopeForDays(30);

  const paceAll =
    calculateAllTimeSlope();


  const weighted =
    (
      pace7 * 0.50 +
      pace30 * 0.35 +
      paceAll * 0.15
    );


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
  try {
    const saved =
      localStorage.getItem(
        GOAL_STATE_KEY
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);

  } catch (error) {
    return null;
  }
}


function saveGoalState(state) {
  localStorage.setItem(
    GOAL_STATE_KEY,
    JSON.stringify(state)
  );
}


function loadGoalHistory() {
  try {
    const saved =
      localStorage.getItem(
        GOAL_HISTORY_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {
    return [];
  }
}


function saveGoalHistory(history) {
  localStorage.setItem(
    GOAL_HISTORY_KEY,
    JSON.stringify(history)
  );
}


function getNextGoal(count) {
  return (
    Math.floor(
      count / GOAL_STEP
    ) *
      GOAL_STEP +
    GOAL_STEP
  );
}


function findGoalAchievement(
  target,
  afterDate = null
) {
  for (
    const record of
    DATA.subscribers
  ) {
    if (
      afterDate &&
      record.date <
        afterDate
    ) {
      continue;
    }

    if (
      record.count >=
      target
    ) {
      return record;
    }
  }

  return null;
}


function createGoalState(
  target = null
) {
  const latest =
    getLatestSubscriber();

  if (!latest) {
    return null;
  }


  const paces =
    getGrowthPaces();

  const goal =
    target ??
    getNextGoal(
      latest.count
    );


  const remaining =
    goal -
    latest.count;


  let daysNeeded = null;

  if (
    paces.weighted > 0
  ) {
    daysNeeded =
      Math.ceil(
        remaining /
        paces.weighted
      );
  }


  const startDate =
    parseDate(latest.date);


  const eta =
    daysNeeded !== null
      ? addDays(
          startDate,
          daysNeeded
        )
      : null;


  const state = {
    target: goal,

    startDate:
      latest.date,

    startCount:
      latest.count,

    pace7:
      paces.pace7,

    pace30:
      paces.pace30,

    paceAll:
      paces.paceAll,

    weightedPace:
      paces.weighted,

    eta:
      eta
        ? toDateString(eta)
        : null
  };


  saveGoalState(state);

  return state;
}



/* =========================================================
   Goal rollover
========================================================= */

function processGoalState() {
  const latest =
    getLatestSubscriber();

  if (!latest) {
    return null;
  }


  let state =
    loadGoalState();


  if (!state) {
    state =
      createGoalState();

    return state;
  }


  if (
    latest.count <
    state.target
  ) {
    return state;
  }


  const achievement =
    findGoalAchievement(
      state.target,
      state.startDate
    );


  if (achievement) {

    const history =
      loadGoalHistory();


    const alreadySaved =
      history.some(
        item =>
          Number(item.target) ===
            Number(
              state.target
            ) &&
          item.startDate ===
            state.startDate
      );


    if (!alreadySaved) {

      const etaDate =
        state.eta
          ? parseDate(
              state.eta
            )
          : null;

      const actualDate =
        parseDate(
          achievement.date
        );


      let differenceDays =
        null;


      if (etaDate) {
        differenceDays =
          diffDays(
            actualDate,
            etaDate
          );
      }


      history.unshift({
        target:
          state.target,

        startDate:
          state.startDate,

        predictedDate:
          state.eta,

        actualDate:
          achievement.date,

        differenceDays
      });


      saveGoalHistory(
        history
      );
    }


    state =
      createGoalState(
        getNextGoal(
          latest.count
        )
      );
  }


  return state;
}



/* =========================================================
   Goal rendering
========================================================= */

function getCurrentExpectedCount(
  state,
  latest
) {
  const startDate =
    parseDate(
      state.startDate
    );

  const latestDate =
    parseDate(
      latest.date
    );


  const elapsed =
    Math.max(
      0,
      diffDays(
        startDate,
        latestDate
      )
    );


  return (
    Number(
      state.startCount
    ) +
    Number(
      state.weightedPace
    ) *
      elapsed
  );
}


function getPaceAdvice(
  difference,
  state
) {
  const pace =
    Math.max(
      Number(
        state.weightedPace
      ),
      0.1
    );


  const strongThreshold =
    Math.max(
      5,
      pace * 2
    );


  if (
    difference >=
    strongThreshold
  ) {
    return {
      status:
        "かなり好調",

      text:
        "当初予測を大きく上回るペースで伸びています。目標を予測日より早く達成する可能性が高まっています。"
    };
  }


  if (
    difference >= 2
  ) {
    return {
      status:
        "いい調子",

      text:
        "当初の予測より少し先行しています。現在の伸びを維持できれば、予測日より早い達成も期待できます。"
    };
  }


  if (
    difference > -2
  ) {
    return {
      status:
        "想定通り",

      text:
        "当初に立てた予測とほぼ同じペースで進んでいます。現在のところ大きなズレはありません。"
    };
  }


  if (
    difference >
    -strongThreshold
  ) {
    return {
      status:
        "ややペース低下",

      text:
        "当初の予測より少し遅れています。直近の登録者増加ペースが戻るかを見ていきたいところです。"
    };
  }


  return {
    status:
      "ペース低下",

    text:
      "当初予測より遅いペースになっています。予測日は固定したまま、今後の伸びの変化を追跡します。"
  };
}


function renderGoal() {
  const state =
    processGoalState();

  const latest =
    getLatestSubscriber();


  if (
    !state ||
    !latest
  ) {
    return;
  }


  const paces =
    getGrowthPaces();


  $("pace7").textContent =
    roundOne(
      paces.pace7
    );

  $("pace30").textContent =
    roundOne(
      paces.pace30
    );

  $("paceAll").textContent =
    roundOne(
      paces.paceAll
    );


  $("paceWeighted")
    .textContent =
    roundOne(
      Number(
        state.weightedPace
      )
    );


  $("goalTarget")
    .textContent =
    `${state.target.toLocaleString()} subscribers`;


  $("goalEta")
    .textContent =
    state.eta
      ? formatDateFullJP(
          parseDate(
            state.eta
          )
        )
      : "予測不能";


  $("goalCurrent")
    .textContent =
    `現在 ${latest.count.toLocaleString()}人`;


  const remaining =
    Math.max(
      0,
      state.target -
      latest.count
    );


  $("goalRemaining")
    .textContent =
    `あと ${remaining.toLocaleString()}人`;


  const milestoneStart =
    state.target -
    GOAL_STEP;


  const progress =
    clamp(
      (
        latest.count -
        milestoneStart
      ) /
        GOAL_STEP *
        100,
      0,
      100
    );


  $("goalProgressBar")
    .style.width =
    `${progress}%`;


  $("goalProgressPercent")
    .textContent =
    `${Math.round(progress)}%`;


  let remainingDaysText =
    "残り予測 —日";


  if (state.eta) {
    const remainingDays =
      diffDays(
        parseDate(latest.date),
        parseDate(state.eta)
      );


    if (remainingDays >= 0) {
      remainingDaysText =
        `予測日まで ${remainingDays}日`;
    } else {
      remainingDaysText =
        `予測日から ${Math.abs(
          remainingDays
        )}日経過`;
    }
  }


  $("goalRemainingDays")
    .textContent =
    remainingDaysText;


  const expected =
    getCurrentExpectedCount(
      state,
      latest
    );


  const difference =
    latest.count -
    expected;


  const roundedDifference =
    Math.round(
      difference
    );


  $("paceDifference")
    .textContent =
    roundedDifference > 0
      ? `+${roundedDifference}人`
      : `${roundedDifference}人`;


  const advice =
    getPaceAdvice(
      difference,
      state
    );


  $("paceStatus")
    .textContent =
    advice.status;


  $("paceAdvice")
    .textContent =
    advice.text;


  renderPredictionHistory();
}



/* =========================================================
   Prediction history
========================================================= */

function renderPredictionHistory() {
  const container =
    $("predictionHistory");

  const history =
    loadGoalHistory();


  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        達成済みの予測はまだありません。
      </div>
    `;

    return;
  }


  container.innerHTML =
    history
      .map(
        item => {

          const predicted =
            item.predictedDate
              ? formatDateJP(
                  parseDate(
                    item.predictedDate
                  )
                )
              : "—";


          const actual =
            formatDateJP(
              parseDate(
                item.actualDate
              )
            );


          let resultText =
            "予測との差 —";


          let resultClass =
            "";


          if (
            Number.isFinite(
              item.differenceDays
            )
          ) {

            if (
              item.differenceDays >
              0
            ) {
              resultText =
                `${item.differenceDays}日早く達成`;

              resultClass =
                "history-early";
            }

            else if (
              item.differenceDays <
              0
            ) {
              resultText =
                `${Math.abs(
                  item.differenceDays
                )}日遅く達成`;

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
                ${Number(
                  item.target
                ).toLocaleString()}人
              </strong>

              <span>
                予測 ${predicted}
              </span>

              <span>
                実績 ${actual}
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
   Future scenarios
========================================================= */

function buildScenarioDates(
  startDate,
  months = 6
) {
  const end =
    new Date(startDate);

  end.setMonth(
    end.getMonth() +
    months
  );


  const totalDays =
    diffDays(
      startDate,
      end
    );


  const dates = [];


  for (
    let day = 0;
    day <= totalDays;
    day += 7
  ) {
    dates.push(
      addDays(
        startDate,
        day
      )
    );
  }


  if (
    dates[
      dates.length - 1
    ] < end
  ) {
    dates.push(end);
  }


  return dates;
}


function getScenarioPaces() {
  const paces =
    getGrowthPaces();


  const standard =
    Math.max(
      0,
      (
        paces.pace7 * 0.50 +
        paces.pace30 * 0.35 +
        paces.paceAll * 0.15
      )
    );


  const cautious =
    Math.max(
      0,
      paces.pace30 * 0.80
    );


  const positive =
    Math.max(
      standard,
      paces.pace7,
      standard * 1.15
    );


  return {
    cautious,
    standard,
    positive
  };
}


function renderScenarios() {
  const latest =
    getLatestSubscriber();

  if (!latest) {
    return;
  }


  const latestDate =
    parseDate(
      latest.date
    );


  const scenarioPaces =
    getScenarioPaces();


  const dates =
    buildScenarioDates(
      latestDate,
      6
    );


  const labels =
    dates.map(
      date =>
        formatDateShort(date)
    );


  const cautiousData =
    dates.map(
      date => {

        const days =
          diffDays(
            latestDate,
            date
          );

        return Math.round(
          latest.count +
          scenarioPaces.cautious *
            days
        );
      }
    );


  const standardData =
    dates.map(
      date => {

        const days =
          diffDays(
            latestDate,
            date
          );

        return Math.round(
          latest.count +
          scenarioPaces.standard *
            days
        );
      }
    );


  const positiveData =
    dates.map(
      date => {

        const days =
          diffDays(
            latestDate,
            date
          );

        return Math.round(
          latest.count +
          scenarioPaces.positive *
            days
        );
      }
    );


  const threeMonthsLater =
    new Date(latestDate);

  threeMonthsLater.setMonth(
    threeMonthsLater.getMonth() +
    3
  );


  const threeMonthDays =
    diffDays(
      latestDate,
      threeMonthsLater
    );


  $("scenarioLowValue")
    .textContent =
    Math.round(
      latest.count +
      scenarioPaces.cautious *
        threeMonthDays
    ).toLocaleString();


  $("scenarioStandardValue")
    .textContent =
    Math.round(
      latest.count +
      scenarioPaces.standard *
        threeMonthDays
    ).toLocaleString();


  $("scenarioHighValue")
    .textContent =
    Math.round(
      latest.count +
      scenarioPaces.positive *
        threeMonthDays
    ).toLocaleString();


  if (scenarioChart) {
    scenarioChart.destroy();
  }


  const canvas =
    $("scenarioChart");


  scenarioChart =
    new Chart(
      canvas,
      {
        type: "line",

        data: {
          labels,

          datasets: [

            {
              label:
                "慎重",

              data:
                cautiousData,

              borderWidth: 2,

              pointRadius: 0,

              tension: .3
            },

            {
              label:
                "標準",

              data:
                standardData,

              borderWidth: 3,

              pointRadius: 0,

              tension: .3
            },

            {
              label:
                "好調",

              data:
                positiveData,

              borderWidth: 2,

              pointRadius: 0,

              tension: .3
            }

          ]
        },


        options: {

          responsive: true,

          maintainAspectRatio:
            false,

          interaction: {
            intersect: false,
            mode: "index"
          },

          plugins: {

            legend: {
              display: true,

              labels: {
                usePointStyle:
                  true,

                boxWidth:
                  8,

                font: {
                  family:
                    'Inter,"Noto Sans JP",sans-serif',

                  weight:
                    "700",

                  size:
                    11
                }
              }
            },

            tooltip: {
              callbacks: {

                label(context) {
                  return (
                    `${context.dataset.label}: ` +
                    `${context.parsed.y.toLocaleString()}人`
                  );
                }

              }
            }

          },


          scales: {

            x: {

              grid: {
                display: false
              },

              ticks: {
                maxTicksLimit: 8,

                font: {
                  size: 10,
                  weight: "700"
                }
              }

            },


            y: {

              beginAtZero: false,

              ticks: {

                callback(value) {
                  return (
                    `${Number(
                      value
                    ).toLocaleString()}`
                  );
                },

                font: {
                  size: 10,
                  weight: "700"
                }
              }

            }

          }

        }
      }
    );
}



/* =========================================================
   Posting interval
========================================================= */

function getUniqueVideoDates() {
  return [
    ...new Set(
      DATA.videos
        .map(
          video =>
            video.date
        )
        .filter(Boolean)
    )
  ].sort();
}


function calculateIntervals(
  dates
) {
  if (
    dates.length < 2
  ) {
    return [];
  }


  const intervals = [];


  for (
    let i = 1;
    i < dates.length;
    i++
  ) {
    const previous =
      parseDate(
        dates[i - 1]
      );

    const current =
      parseDate(
        dates[i]
      );


    const difference =
      diffDays(
        previous,
        current
      );


    if (
      difference >= 0
    ) {
      intervals.push(
        difference
      );
    }
  }


  return intervals;
}


function getPostingRecommendation() {
  const dates =
    getUniqueVideoDates();


  if (!dates.length) {
    return null;
  }


  const allIntervals =
    calculateIntervals(
      dates
    );


  const recentDates =
    dates.slice(-11);


  const recentIntervals =
    calculateIntervals(
      recentDates
    );


  const allAverage =
    allIntervals.length
      ? average(
          allIntervals
        )
      : 0;


  const recentAverage =
    recentIntervals.length
      ? average(
          recentIntervals
        )
      : allAverage;


  let recommendedInterval =
    (
      recentAverage * .65 +
      allAverage * .35
    );


  if (
    recommendedInterval <= 0
  ) {
    recommendedInterval = 2;
  }


  const lastPostDate =
    parseDate(
      dates[
        dates.length - 1
      ]
    );


  const centerDays =
    Math.max(
      1,
      Math.round(
        recommendedInterval
      )
    );


  const recommendedStart =
    addDays(
      lastPostDate,
      Math.max(
        1,
        centerDays - 1
      )
    );


  const recommendedEnd =
    addDays(
      lastPostDate,
      centerDays + 1
    );


  return {
    recentAverage,
    allAverage,
    recommendedInterval,
    lastPostDate,
    recommendedStart,
    recommendedEnd
  };
}



/* =========================================================
   Posting summary
========================================================= */

function renderPostingSummary() {
  const recommendation =
    getPostingRecommendation();


  if (!recommendation) {
    return;
  }


  $("recentPostInterval")
    .textContent =
    roundOne(
      recommendation
        .recentAverage
    );


  $("allPostInterval")
    .textContent =
    roundOne(
      recommendation
        .allAverage
    );


  const start =
    recommendation
      .recommendedStart;


  const end =
    recommendation
      .recommendedEnd;


  let label =
    `${start.getMonth() + 1}/${start.getDate()}`;


  if (
    toDateString(start) !==
    toDateString(end)
  ) {

    if (
      start.getMonth() ===
      end.getMonth()
    ) {
      label +=
        `〜${end.getDate()}`;
    }

    else {
      label +=
        `〜${end.getMonth() + 1}/${end.getDate()}`;
    }
  }


  $("recommendedWindow")
    .textContent =
    label;
}



/* =========================================================
   Calendar
========================================================= */

function videosForDate(
  dateString
) {
  return DATA.videos.filter(
    video =>
      video.date ===
      dateString
  );
}


function isRecommendedDate(
  date,
  recommendation
) {
  if (!recommendation) {
    return false;
  }


  const current =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  const start =
    new Date(
      recommendation
        .recommendedStart
        .getFullYear(),

      recommendation
        .recommendedStart
        .getMonth(),

      recommendation
        .recommendedStart
        .getDate()
    );


  const end =
    new Date(
      recommendation
        .recommendedEnd
        .getFullYear(),

      recommendation
        .recommendedEnd
        .getMonth(),

      recommendation
        .recommendedEnd
        .getDate()
    );


  return (
    current >= start &&
    current <= end
  );
}


function renderCalendar() {
  const recommendation =
    getPostingRecommendation();


  if (
    calendarYear === null ||
    calendarMonth === null
  ) {
    const baseDate =
      recommendation
        ? recommendation
            .recommendedStart
        : new Date();


    calendarYear =
      baseDate.getFullYear();

    calendarMonth =
      baseDate.getMonth();
  }


  const firstDay =
    new Date(
      calendarYear,
      calendarMonth,
      1
    );


  const lastDay =
    new Date(
      calendarYear,
      calendarMonth + 1,
      0
    );


  $("calendarMonthLabel")
    .textContent =
    `${calendarYear}年${calendarMonth + 1}月`;


  const grid =
    $("calendarGrid");


  grid.innerHTML = "";


  const emptyBefore =
    firstDay.getDay();


  for (
    let i = 0;
    i < emptyBefore;
    i++
  ) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "calendar-day empty";

    grid.appendChild(empty);
  }


  const today =
    new Date();


  for (
    let day = 1;
    day <= lastDay.getDate();
    day++
  ) {

    const date =
      new Date(
        calendarYear,
        calendarMonth,
        day
      );


    const dateString =
      toDateString(date);


    const videos =
      videosForDate(
        dateString
      );


    const recommended =
      isRecommendedDate(
        date,
        recommendation
      );


    const cell =
      document.createElement(
        "div"
      );


    cell.className =
      "calendar-day";


    if (recommended) {
      cell.classList.add(
        "recommended-day"
      );
    }


    if (
      today.getFullYear() ===
        calendarYear &&
      today.getMonth() ===
        calendarMonth &&
      today.getDate() ===
        day
    ) {
      cell.classList.add(
        "today"
      );
    }


    const dateElement =
      document.createElement(
        "span"
      );


    dateElement.className =
      "calendar-date";


    dateElement.textContent =
      day;


    cell.appendChild(
      dateElement
    );


    if (videos.length) {

      const posts =
        document.createElement(
          "div"
        );


      posts.className =
        "calendar-posts";


      videos.forEach(
        video => {

          const post =
            document.createElement(
              "div"
            );


          post.className =
            "calendar-post";


          const image =
            document.createElement(
              "img"
            );


          image.src =
            video.thumbnail ||
            (
              video.id
                ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
                : ""
            );


          image.alt =
            video.title ||
            "動画サムネイル";


          image.loading =
            "lazy";


          post.appendChild(
            image
          );


          posts.appendChild(
            post
          );

        }
      );


      cell.appendChild(
        posts
      );
    }


    if (
      recommended &&
      !videos.length
    ) {

      const badge =
        document.createElement(
          "span"
        );


      badge.className =
        "recommend-badge";


      badge.textContent =
        "おすすめ";


      cell.appendChild(
        badge
      );
    }


    grid.appendChild(
      cell
    );
  }


  const totalCells =
    emptyBefore +
    lastDay.getDate();


  const trailing =
    (
      7 -
      totalCells % 7
    ) % 7;


  for (
    let i = 0;
    i < trailing;
    i++
  ) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "calendar-day empty";

    grid.appendChild(empty);
  }
}



/* =========================================================
   Calendar controls
========================================================= */

function setupCalendarControls() {

  $("prevMonth")
    .onclick =
    () => {

      calendarMonth--;

      if (
        calendarMonth < 0
      ) {
        calendarMonth = 11;
        calendarYear--;
      }

      renderCalendar();
    };


  $("nextMonth")
    .onclick =
    () => {

      calendarMonth++;

      if (
        calendarMonth > 11
      ) {
        calendarMonth = 0;
        calendarYear++;
      }

      renderCalendar();
    };
}



/* =========================================================
   Mobile scenario tooltip close
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
          .setActiveElements([]);


        if (
          scenarioChart.tooltip
        ) {

          scenarioChart
            .tooltip
            .setActiveElements(
              [],
              {
                x: 0,
                y: 0
              }
            );
        }


        scenarioChart
          .update("none");
      }

    },
    {
      passive: true
    }
  );
}



/* =========================================================
   Load data
========================================================= */

async function loadData() {

  const response =
    await fetch(
      `../data.json?ts=${Date.now()}`
    );


  if (!response.ok) {
    throw new Error(
      `data.json load failed: ${response.status}`
    );
  }


  DATA =
    await response.json();


  normalizeSubscribers();
  normalizeVideos();
}



/* =========================================================
   Init
========================================================= */

async function init() {

  try {

    await loadData();

    updateHeader();

    renderGoal();

    renderScenarios();

    renderPostingSummary();

    setupCalendarControls();

    renderCalendar();

    setupMobileChartTooltipClose();

  }

  catch (error) {

    console.error(error);

    document.body
      .insertAdjacentHTML(
        "beforeend",
        `
          <div
            style="
              max-width:900px;
              margin:20px auto 50px;
              padding:18px;
              background:#fff;
              border:2px solid #111;
              border-radius:16px;
              font-weight:800;
            "
          >
            Future outlookのデータ読み込みに失敗しました。
          </div>
        `
      );

  }
}


init();
