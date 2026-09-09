/* =========================
   HOME
========================= */

"use strict";


/* =========================
   HOME DATA
========================= */

let HOME_DATA = null;


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

    renderHomeSummary();

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
