/* =========================
   HOME
========================= */

"use strict";


/* =========================
   HOME DATA
========================= */

let HOME_DATA = null;
let HOME_ANALYTICS_DATA = null;
let homeQuickSubscriberChart = null;


/* =========================
   HOME INITIALIZE
========================= */

document.addEventListener("DOMContentLoaded", () => {
  initHome();
});


async function initHome() {

  try {

    const response =
      await fetch("./data.json");

    if(!response.ok){
      throw new Error(
        `data.json: ${response.status}`
      );
    }

    HOME_DATA =
      await response.json();

    try {

      const analyticsResponse =
        await fetch(
          "./analytics/analytics_data.json",
          {
            cache:"no-store"
          }
        );

      if(analyticsResponse.ok){

        HOME_ANALYTICS_DATA =
          await analyticsResponse.json();

      }

    }
    catch(error){

      console.error(
        "HOME analytics load failed:",
        error
      );

    }

    renderHomeSummary();
    renderHomeTrending();
    renderHomeMilestone();
    renderHomeQuickAnalytics();
    setupHomeQuickAnalytics();

  }
  catch(error){

    console.error(
      "HOME data load failed:",
      error
    );

    renderHomeSummary();

  }

}


/* =========================
   CHANNEL SUMMARY
========================= */

function renderHomeSummary(){

  const container =
    document.getElementById(
      "homeSummaryGrid"
    );

  if(!container){
    return;
  }


  const subscribers =
    Array.isArray(
      HOME_DATA?.subscribers
    )
      ? HOME_DATA.subscribers
      : [];

  const videos =
    Array.isArray(
      HOME_DATA?.videos
    )
      ? HOME_DATA.videos
      : [];


  const latestSubscriber =
    subscribers.length
      ? subscribers[
          subscribers.length - 1
        ]?.count
      : null;


  const videoCount =
    videos.length;


  const validViewCounts =
    videos
      .map(
        video =>
          Number(
            video?.viewCount
          )
      )
      .filter(
        value =>
          Number.isFinite(value)
      );


  const totalViews =
    validViewCounts.length
      ? validViewCounts.reduce(
          (sum, value) =>
            sum + value,
          0
        )
      : null;


  const cards = [

    {
      label:"現在の登録者数",
      value:
        Number.isFinite(
          Number(latestSubscriber)
        )
          ? Number(
              latestSubscriber
            ).toLocaleString("ja-JP")
          : "—",
      unit:"人"
    },

    {
      label:"動画本数",
      value:
        Number.isFinite(
          Number(videoCount)
        )
          ? Number(
              videoCount
            ).toLocaleString("ja-JP")
          : "—",
      unit:"本"
    },

    {
      label:"総再生回数",
      value:
        totalViews !== null
          ? totalViews
              .toLocaleString("ja-JP")
          : "—",
      unit:"回"
    }

  ];


  container.innerHTML =
    cards
      .map(
        card => `
          <article class="home-summary-card">
            <span class="home-summary-label">
              ${card.label}
            </span>

            <div class="home-summary-value">
              <strong>
                ${card.value}
              </strong>

              <span>
                ${card.unit}
              </span>
            </div>
          </article>
        `
      )
      .join("");

}
/* =========================
   TRENDING NOW
========================= */

function renderHomeTrending(){

  const section =
    document.getElementById(
      "homeTrending"
    );

  const container =
    document.getElementById(
      "homeTrendingContent"
    );

  if(
    !section ||
    !container
  ){
    return;
  }


  const analyticsVideos =
    HOME_ANALYTICS_DATA?.videos;

  if(
    !analyticsVideos ||
    typeof analyticsVideos !== "object"
  ){

    section.hidden = true;
    return;

  }


  const candidates = [];


  Object.entries(
    analyticsVideos
  ).forEach(
    ([videoId, video]) => {

      const daily =
        Array.isArray(video?.daily)
          ? video.daily
          : [];


      /*
        最低2日分ないと
        「現在の伸び」を比較できない
      */

      if(daily.length < 2){
        return;
      }


      const currentDay =
        daily.length;


      const latestViews =
        getValidHomeNumber(
          daily[
            currentDay - 1
          ]?.views
        );


      if(latestViews === null){
        return;
      }


      /*
        同じDAYまでデータが存在する
        他動画の同日再生数を集める
      */

      const comparisonValues =
        Object.entries(
          analyticsVideos
        )
          .filter(
            ([otherId]) =>
              otherId !== videoId
          )
          .map(
            ([, otherVideo]) => {

              const otherDaily =
                Array.isArray(
                  otherVideo?.daily
                )
                  ? otherVideo.daily
                  : [];


              if(
                otherDaily.length <
                currentDay
              ){
                return null;
              }


              return getValidHomeNumber(
                otherDaily[
                  currentDay - 1
                ]?.views
              );

            }
          )
          .filter(
            value =>
              value !== null
          );


      /*
        比較対象が少なすぎる場合は
        TRENDING判定しない
      */

      if(
        comparisonValues.length < 3
      ){
        return;
      }


      const average =
        comparisonValues.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        comparisonValues.length;


      if(average <= 0){
        return;
      }


      const ratio =
        latestViews /
        average;


      /*
        平均の1.5倍以上だけ
        TRENDING候補
      */

      if(ratio < 1.5){
        return;
      }


      const rootVideo =
        Array.isArray(
          HOME_DATA?.videos
        )
          ? HOME_DATA.videos.find(
              item =>
                item.id === videoId
            )
          : null;


      const currentViews =
        getValidHomeNumber(
          rootVideo?.viewCount
        );


      candidates.push({

        id:
          videoId,

        title:
          rootVideo?.title ||
          video?.title ||
          videoId,

        thumbnail:
          rootVideo?.thumbnail ||
          video?.thumbnail ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

        currentViews,

        increase:
          latestViews,

        ratio

      });

    }
  );


  if(!candidates.length){

    section.hidden = true;
    container.innerHTML = "";

    return;

  }


  /*
   平均との差が最大の動画を
   1本だけ表示
  */

  candidates.sort(
    (a,b) =>
      b.ratio - a.ratio
  );


  const trending =
    candidates[0];


  section.hidden = false;


  container.innerHTML = `
    <article class="home-trending-card">

      <img
        class="home-trending-thumbnail"
        src="${escapeHomeHtml(trending.thumbnail)}"
        alt=""
      >

      <div class="home-trending-info">

        <h3>
          ${escapeHomeHtml(trending.title)}
        </h3>

        <div class="home-trending-views">
          ▶ ${
            trending.currentViews !== null
              ? trending.currentViews
                  .toLocaleString("ja-JP")
              : "—"
          } 回
        </div>

        <div class="home-trending-growth">
          ↑ ${trending.increase.toLocaleString("ja-JP")} 回
        </div>

        <div class="home-trending-ratio">
          平均の ${trending.ratio.toFixed(1)}倍
        </div>

      </div>

    </article>
  `;

}


function getValidHomeNumber(value){

  if(
    value === null ||
    value === undefined ||
    value === ""
  ){
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}


function escapeHomeHtml(value){

  return String(
    value ?? ""
  )
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}

/* =========================
   NEXT MILESTONE
========================= */

function renderHomeMilestone(){

  const section =
    document.getElementById(
      "homeMilestones"
    );

  const container =
    document.getElementById(
      "homeMilestoneContent"
    );

  if(
    !section ||
    !container
  ){
    return;
  }


  const videos =
    Array.isArray(
      HOME_DATA?.videos
    )
      ? HOME_DATA.videos
      : [];


  const analyticsVideos =
    HOME_ANALYTICS_DATA?.videos;


  if(
    !videos.length ||
    !analyticsVideos ||
    typeof analyticsVideos !== "object"
  ){

    section.hidden = true;
    container.innerHTML = "";

    return;

  }


  const candidates = [];


  videos.forEach(video => {

    const currentViews =
      getValidHomeNumber(
        video?.viewCount
      );


    if(
      currentViews === null ||
      currentViews < 0
    ){
      return;
    }


    const analytics =
      analyticsVideos[
        video.id
      ];


    const daily =
      Array.isArray(
        analytics?.daily
      )
        ? analytics.daily
        : [];


    /*
      最近の伸びを見るため、
      最大で直近3日分を使用
    */

    const recentViews =
      daily
        .slice(-3)
        .map(
          row =>
            getValidHomeNumber(
              row?.views
            )
        )
        .filter(
          value =>
            value !== null
        );


    if(!recentViews.length){
      return;
    }


    const recentAverage =
      recentViews.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      recentViews.length;


    if(recentAverage <= 0){
      return;
    }


    /*
      次の5,000回刻み
    */

    const target =
      (
        Math.floor(
          currentViews / 5000
        ) + 1
      ) * 5000;


    const remaining =
      target -
      currentViews;


    const estimatedDays =
      remaining /
      recentAverage;


    /*
      約5日以内に到達見込みの
      動画だけ候補にする
    */

    if(
      estimatedDays > 5
    ){
      return;
    }


    candidates.push({

      id:
        video.id,

      title:
        video.title ||
        analytics?.title ||
        video.id,

      thumbnail:
        video.thumbnail ||
        analytics?.thumbnail ||
        `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,

      currentViews,

      target,

      remaining,

      estimatedDays

    });

  });


  if(!candidates.length){

    section.hidden = true;
    container.innerHTML = "";

    return;

  }


  /*
    到達が近い動画を優先
  */

  candidates.sort(
    (a,b) =>
      a.estimatedDays -
      b.estimatedDays
  );


  const milestone =
    candidates[0];


  const progress =
    Math.max(
      0,
      Math.min(
        100,
        (
          milestone.currentViews /
          milestone.target
        ) * 100
      )
    );


  section.hidden = false;


  container.innerHTML = `
    <article class="home-milestone-card">

      <img
        class="home-milestone-thumbnail"
        src="${escapeHomeHtml(milestone.thumbnail)}"
        alt=""
      >

      <div class="home-milestone-info">

        <h3>
          ${escapeHomeHtml(milestone.title)}
        </h3>

        <div class="home-milestone-count">
          ${milestone.currentViews.toLocaleString("ja-JP")}
          /
          ${milestone.target.toLocaleString("ja-JP")}
        </div>

        <div class="home-milestone-progress-head">
          <span></span>

          <span class="home-milestone-remaining">
            あと ${milestone.remaining.toLocaleString("ja-JP")} 回
          </span>
        </div>

        <div
          class="home-milestone-progress"
          aria-label="マイルストーン進捗 ${progress.toFixed(0)}%"
        >
          <div
            class="home-milestone-progress-bar"
            style="width:${progress}%"
          ></div>
        </div>

      </div>

    </article>
  `;

}
/* =========================
   QUICK ANALYTICS
========================= */

function setupHomeQuickAnalytics(){

  const select =
    document.getElementById(
      "homeQuickRange"
    );

  if(!select){
    return;
  }

  select.onchange =
    renderHomeQuickAnalytics;

}


function renderHomeQuickAnalytics(){

  const canvas =
    document.getElementById(
      "homeQuickSubscriberChart"
    );

  const countElement =
    document.getElementById(
      "homeQuickSubscriberCount"
    );

  const rangeSelect =
    document.getElementById(
      "homeQuickRange"
    );

  if(
    !canvas ||
    !countElement
  ){
    return;
  }


  const subscribers =
    Array.isArray(
      HOME_DATA?.subscribers
    )
      ? [...HOME_DATA.subscribers]
      : [];


  subscribers.sort(
    (a,b) =>
      String(a.date)
        .localeCompare(
          String(b.date)
        )
  );


  const validRows =
    subscribers.filter(row => {

      if(
        !row?.date ||
        row?.count === null ||
        row?.count === undefined
      ){
        return false;
      }

      return Number.isFinite(
        Number(row.count)
      );

    });


  if(!validRows.length){

    countElement.textContent =
      "—";

    if(homeQuickSubscriberChart){

      homeQuickSubscriberChart.destroy();
      homeQuickSubscriberChart = null;

    }

    return;

  }


  const latest =
    validRows[
      validRows.length - 1
    ];


  countElement.textContent =
    `${Number(latest.count).toLocaleString("ja-JP")} 人`;


  const range =
    rangeSelect?.value ||
    "90";


  let displayRows =
    validRows;


  if(range !== "all"){

    const days =
      Number(range);

    const latestDate =
      new Date(
        `${latest.date}T00:00:00`
      );

    const startDate =
      new Date(latestDate);

    startDate.setDate(
      latestDate.getDate() -
      (days - 1)
    );


    displayRows =
      validRows.filter(row => {

        const date =
          new Date(
            `${row.date}T00:00:00`
          );

        return date >= startDate;

      });

  }


  const labels =
    displayRows.map(row => {

      const parts =
        String(row.date)
          .split("-");

      if(parts.length < 3){
        return row.date;
      }

      return `${
        Number(parts[1])
      }/${
        Number(parts[2])
      }`;

    });


  const values =
    displayRows.map(
      row =>
        Number(row.count)
    );


  if(homeQuickSubscriberChart){

    homeQuickSubscriberChart.destroy();

  }


  homeQuickSubscriberChart =
    new Chart(
      canvas,
      {

        type:"line",

        data:{
          labels,

          datasets:[
            {
              label:"Subscribers",
              data:values,
              borderColor:"#f2c94c",
              backgroundColor:"#f2c94c",
              pointBackgroundColor:"#f2c94c",
              pointBorderColor:"#fff",
              pointBorderWidth:2,
              borderWidth:3,
              pointRadius:2,
              pointHoverRadius:5,
              tension:.28,
              fill:false
            }
          ]
        },

        options:{

          responsive:true,
          maintainAspectRatio:false,

          interaction:{
            mode:"index",
            intersect:false
          },

          plugins:{
            legend:{
              display:false
            }
          },

          scales:{

            x:{
              grid:{
                display:false
              },

              ticks:{
                maxTicksLimit:7,
                maxRotation:0
              }
            },

            y:{
              beginAtZero:false,

              ticks:{
                callback:
                  value =>
                    Number(value)
                      .toLocaleString(
                        "ja-JP"
                      )
              }
            }

          }

        }

      }
    );

}
