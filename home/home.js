/* =========================
   HOME
========================= */

"use strict";


/* =========================
   HOME DATA
========================= */

let HOME_DATA = null;
let HOME_ANALYTICS_DATA = null;


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
      label:"SUBSCRIBERS",
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
      label:"VIDEOS",
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
      label:"TOTAL VIEWS",
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
