/* =========================================================
   VIDEO ANALYTICS
   analytics/analytics.js

   Phase 2 prototype
   - UI / chart behavior
   - Dummy analytics data
   - Later replaced by YouTube Analytics / Reporting API
========================================================= */

"use strict";


/* =========================================================
   BASIC
========================================================= */

const START_DATE = "2026-04-03";

const COLORS = {
  ink: "#111111",
  muted: "#777777",
  yellow: "#FFF36A",

  chartYellow: "#C5A900",
  chartYellowAlt: "#D7BE45",

  // COMPARE VIDEO B
  chartRed: "#C9665E",

  green: "#35C759",
  paper: "#FFFFFF",
  grid: "rgba(17,17,17,.10)",
  average: "rgba(17,17,17,.22)",
  averageFill: "rgba(17,17,17,.055)"
};

const CHARTS = {};

/* =========================================================
   REAL ANALYTICS DATA
========================================================= */

let ANALYTICS_DATA = null;

let REACH_DATA = null;

let REAL_VIDEOS = [];

let ROOT_VIDEO_DATA = [];

let currentRankingMetric = "views";
let currentRankingMember = "";

let selectedIndividualVideoId = null;
let selectedCompareVideoAId = null;
let selectedCompareVideoBId = null;


/* =========================================================
   LOAD ANALYTICS DATA
========================================================= */

async function loadAnalyticsData(){

  try{

    const response =
      await fetch(
        "./analytics_data.json",
        {
          cache:"no-store"
        }
      );

    if(!response.ok){
      throw new Error(
        `analytics_data.json: ${response.status}`
      );
    }

    ANALYTICS_DATA =
      await response.json();


    const videos =
      ANALYTICS_DATA?.videos || {};


    REAL_VIDEOS =
      Object.entries(videos)
        .map(([id,data]) => ({

          id,

          title:
            data.title ||
            id,

          shortTitle:
            data.title ||
            id,

          date:
            data.publishedPacificDate ||
            data.publishedDate ||
            "",

          publishedDate:
            data.publishedPacificDate ||
            data.publishedDate ||
            "",

          publishedPacificDate:
            data.publishedPacificDate ||
            data.publishedDate ||
            "",

          publishedAt:
            data.publishedAt ||
            null,
          thumbnail:
            data.thumbnail ||
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,

          analytics:data

        }))
        .sort((a,b) => {

          return String(
            b.date
          ).localeCompare(
            String(a.date)
          );

        });


    selectedIndividualVideoId =
      REAL_VIDEOS[0]?.id ||
      null;

    selectedCompareVideoAId =
      REAL_VIDEOS[0]?.id ||
      null;

    selectedCompareVideoBId =
      REAL_VIDEOS[1]?.id ||
      REAL_VIDEOS[0]?.id ||
      null;


    console.log(
      `Analytics loaded: ${REAL_VIDEOS.length} videos`
    );

    return true;


  }catch(error){

    console.error(
      "analytics_data.json load error:",
      error
    );

    ANALYTICS_DATA = null;
    REAL_VIDEOS = [];

    return false;
  }
}

/* =========================================================
   LOAD REPORTING REACH DATA
========================================================= */

async function loadReachData(){

  try{

    const response =
      await fetch(
        "./reach_daily.json",
        {
          cache:"no-store"
        }
      );

    if(!response.ok){
      throw new Error(
        `reach_daily.json: ${response.status}`
      );
    }

    REACH_DATA =
      await response.json();

    console.log(
      `Reach data loaded: ${
        REACH_DATA?.daily?.length || 0
      } rows`
    );

    return true;

  }catch(error){

    console.error(
      "reach_daily.json load error:",
      error
    );

    REACH_DATA = null;

    return false;
  }
}





/* =========================================================
   INDIVIDUAL REACH REAL DATA
========================================================= */

function getSelectedVideoReachData(){

  const video =
    getSelectedIndividualVideo();

  if(
    !video ||
    !REACH_DATA
  ){
    return [];
  }

  const rows =
    Array.isArray(REACH_DATA.daily)
      ? REACH_DATA.daily
      : [];

  return rows
    .filter(row =>
      row.videoId === video.id
    )
    .sort((a,b) =>
      String(a.date)
        .localeCompare(
          String(b.date)
        )
    );
}

function getVideoReachSummary(videoId){

  if(
    !videoId ||
    !REACH_DATA ||
    !Array.isArray(REACH_DATA.daily)
  ){
    return null;
  }

  const rows =
    REACH_DATA.daily.filter(
      row => row.videoId === videoId
    );

  if(!rows.length){
    return null;
  }


  let totalImpressions = 0;
  let weightedCtr = 0;


  rows.forEach(row => {

    const impressions =
      Number(row.thumbnailImpressions);

    const ctr =
      (
        row.thumbnailClickRatePercent !== null &&
        row.thumbnailClickRatePercent !== undefined
      )
        ? Number(
            row.thumbnailClickRatePercent
          )
        : null;


    if(
      !Number.isFinite(impressions) ||
      impressions <= 0
    ){
      return;
    }


    if(Number.isFinite(ctr)){

      totalImpressions +=
        impressions;

      weightedCtr +=
        impressions * ctr;
    }

  });


  if(totalImpressions <= 0){
    return null;
  }


  return {

    impressions:
      totalImpressions,

    clickRate:
      weightedCtr /
      totalImpressions

  };
}

function parseDateOnly(value){

  if(!value){
    return null;
  }

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if(!match){
    return null;
  }

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}


function getReachDayNumber(
  publishedDate,
  reachDate
){

  const published =
    parseDateOnly(publishedDate);

  const reach =
    parseDateOnly(reachDate);

  if(
    published === null ||
    reach === null
  ){
    return null;
  }

  const difference =
    Math.floor(
      (reach - published) /
      86400000
    );

  /*
    投稿日 = DAY1
    翌日   = DAY2
  */
  return difference + 1;
}

/* =========================================================
   LOAD ROOT VIDEO DATA
   メンバータグ取得用
========================================================= */

async function loadRootVideoData(){

  try{

    const response =
      await fetch(
        "../data.json",
        {
          cache:"no-store"
        }
      );

    if(!response.ok){
      throw new Error(
        `data.json: ${response.status}`
      );
    }

    const data =
      await response.json();

    ROOT_VIDEO_DATA =
      Array.isArray(data?.videos)
        ? data.videos
        : [];


    const rootMap =
      new Map(
        ROOT_VIDEO_DATA.map(
          video => [
            video.id,
            video
          ]
        )
      );


    REAL_VIDEOS.forEach(video => {

      const rootVideo =
        rootMap.get(
          video.id
        );

      video.tags =
        Array.isArray(rootVideo?.tags)
          ? rootVideo.tags
          : [];

      video.dataApi = rootVideo
        ? {
            viewCount:
              rootVideo.viewCount === null ||
              rootVideo.viewCount === undefined
                ? null
                : Number(rootVideo.viewCount),

            likeCount:
              rootVideo.likeCount === null ||
              rootVideo.likeCount === undefined
                ? null
                : Number(rootVideo.likeCount),

            commentCount:
              rootVideo.commentCount === null ||
              rootVideo.commentCount === undefined
                ? null
                : Number(rootVideo.commentCount)
          }
        : null;

    });


    console.log(
      `Root video data loaded: ${ROOT_VIDEO_DATA.length} videos`
    );

    return true;


  }catch(error){

    console.error(
      "data.json load error:",
      error
    );

    ROOT_VIDEO_DATA = [];

    REAL_VIDEOS.forEach(video => {
      video.tags = [];
    });

    return false;
  }
}
/* =========================================================
   OVERVIEW REAL VIDEO RANKING
========================================================= */

function getRankingMetricValue(
  video,
  metric
){

  const summary =
    video?.analytics?.summary || {};


  switch(metric){

    case "views":
      return (
        video?.dataApi?.viewCount !== null &&
        video?.dataApi?.viewCount !== undefined &&
        Number.isFinite(Number(video.dataApi.viewCount))
      )
        ? Number(video.dataApi.viewCount)
        : null;


    case "engagedViews":
      return (
        summary.engagedViews !== null &&
        summary.engagedViews !== undefined &&
        Number.isFinite(
          Number(summary.engagedViews)
        )
      )
        ? Number(summary.engagedViews)
        : null;

    case "averagePercentageViewed":
      return (
        summary.averageViewPercentage !== null &&
        summary.averageViewPercentage !== undefined &&
        Number.isFinite(
          Number(summary.averageViewPercentage)
        )
      )
        ? Number(summary.averageViewPercentage)
        : null;


    case "subscribersGained":
      return (
        summary.subscribersGained !== null &&
        summary.subscribersGained !== undefined &&
        Number.isFinite(
          Number(summary.subscribersGained)
        )
      )
        ? Number(summary.subscribersGained)
        : null;


    case "watchTime":
      return (
        summary.watchMinutes !== null &&
        summary.watchMinutes !== undefined &&
        Number.isFinite(
          Number(summary.watchMinutes)
        )
      )
        ? Number(summary.watchMinutes)
        : null;


    case "ctr": {

      const reach =
        getVideoReachSummary(
          video.id
        );

      return (
        reach &&
        Number.isFinite(
          reach.clickRate
        )
      )
        ? reach.clickRate
        : null;
    }


    case "likeRate": {

      const likes =
        video?.dataApi?.likeCount;

      const views =
        video?.dataApi?.viewCount;

      if(
        likes === null ||
        likes === undefined ||
        views === null ||
        views === undefined ||
        !Number.isFinite(Number(likes)) ||
        !Number.isFinite(Number(views)) ||
        Number(views) <= 0
      ){
        return null;
      }

      return (
        Number(likes) /
        Number(views)
      ) * 100;
    }


    default:
      return null;
  }
}


function formatRankingMetricValue(
  value,
  metric
){

  if(
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ){
    return "—";
  }


  const number =
    Number(value);


  switch(metric){

 　 case "ctr":
 　 case "likeRate":
 　 case "averagePercentageViewed":
    　return `${number.toFixed(1)}%`;


    case "subscribersGained":
      return number > 0
        ? `+${formatInteger(number)}`
        : formatInteger(number);


    case "watchTime":

      /*
        APIでは分単位なので
        ランキングでは時間表示
      */
      return `${(
        number / 60
      ).toLocaleString(
        "ja-JP",
        {
          maximumFractionDigits:1
        }
      )}時間`;


    default:
      return formatInteger(
        number
      );
  }
}


function getRankingVideos(){

  let videos =
    [...REAL_VIDEOS];


  /*
    メンバー絞り込み
  */
  if(currentRankingMember){

    videos =
      videos.filter(video => {

        return Array.isArray(
          video.tags
        ) &&
        video.tags.includes(
          currentRankingMember
        );

      });

  }





  /*
    実データの大きい順
  */
  videos.sort(
    (a,b) => {

      const valueA =
        getRankingMetricValue(
          a,
          currentRankingMetric
        );

      const valueB =
        getRankingMetricValue(
          b,
          currentRankingMetric
        );


      if(
        valueA === null &&
        valueB === null
      ){
        return 0;
      }

      if(valueA === null){
        return 1;
      }

      if(valueB === null){
        return -1;
      }

      return valueB - valueA;
    }
  );


  return videos;
}


function renderOverviewRanking(){

  const container =
    document.querySelector(
      "#overviewMode .video-ranking"
    );

  if(!container){
    return;
  }


  const videos =
    getRankingVideos();


  /*
    全動画平均
  */
  const availableValues =
    videos
      .map(video =>
        getRankingMetricValue(
          video,
          currentRankingMetric
        )
      )
      .filter(value =>
        value !== null &&
        Number.isFinite(
          Number(value)
        )
      );


  const averageElement =
    document.querySelector(
      "#overviewRankingAverage strong"
    );


  if(averageElement){

    if(availableValues.length){

      const average =
        availableValues.reduce(
          (sum,value) =>
            sum + Number(value),
          0
        ) /
        availableValues.length;


      averageElement.textContent =
        formatRankingMetricValue(
          average,
          currentRankingMetric
        );

    }else{

      averageElement.textContent =
        "—";

    }
  }


  container.innerHTML = "";


  if(!videos.length){

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "ranking-empty";

    empty.textContent =
      "該当する動画がありません";

    container.appendChild(
      empty
    );

    return;
  }


  videos.forEach(
    (video,index) => {

      const value =
        getRankingMetricValue(
          video,
          currentRankingMetric
        );


      const article =
        document.createElement(
          "article"
        );

      article.className =
        "ranking-item";

      article.dataset.videoId =
        video.id;


      /*
        順位
        未取得指標では順位を表示しない
      */
      const position =
        document.createElement(
          "div"
        );

      position.className =
        "ranking-position";

      position.textContent =
        value === null
          ? "—"
          : String(index + 1);


      /*
        サムネイル
      */
      const thumbnail =
        document.createElement(
          "img"
        );

      thumbnail.src =
        video.thumbnail;

      thumbnail.alt = "";

      thumbnail.loading =
        "lazy";


      /*
        動画情報
      */
      const info =
        document.createElement(
          "div"
        );

      info.className =
        "ranking-video-info";


      const title =
        document.createElement(
          "div"
        );

      title.className =
        "ranking-title";

      title.textContent =
        video.title;


      const meta =
        document.createElement(
          "div"
        );

      meta.className =
        "ranking-meta";

      meta.textContent =
        video.date
          ? video.date.replaceAll(
              "-",
              "/"
            )
          : "";


      info.append(
        title,
        meta
      );


      /*
        指標値
      */
      const score =
        document.createElement(
          "div"
        );

      score.className =
        "ranking-score";


      const strong =
        document.createElement(
          "strong"
        );

      strong.textContent =
        formatRankingMetricValue(
          value,
          currentRankingMetric
        );


      score.appendChild(
        strong
      );


      article.append(
        position,
        thumbnail,
        info,
        score
      );


      /*
        ランキング動画クリック
        → INDIVIDUALへ移動
      */
      article.style.cursor =
        "pointer";

      article.addEventListener(
        "click",
        () => {

          const realVideo =
            getRealVideo(
              video.id
            );

          if(!realVideo){
            return;
          }

          setIndividualVideo(
            realVideo
          );

          setMode(
            "individual"
          );

          window.scrollTo({
            top:0,
            behavior:"smooth"
          });

        }
      );


      container.appendChild(
        article
      );

    }
  );
}




/* =========================================================
   BUILD REAL VIDEO PICKER
========================================================= */

function buildRealVideoPicker(){

  const container =
    document.getElementById(
      "videoPickerGrid"
    );

  if(!container){
    console.warn(
      "videoPickerGrid not found"
    );
    return;
  }

  if(!REAL_VIDEOS.length){
    return;
  }

  container.innerHTML = "";

  REAL_VIDEOS.forEach(video => {

    const item =
      document.createElement(
        "button"
      );

    item.type = "button";

    item.className =
      "video-picker-item";

    item.dataset.videoId =
      video.id;

    item.dataset.videoTitle =
      video.title;


    const thumbnail =
      document.createElement(
        "img"
      );

    thumbnail.src =
      video.thumbnail;

    thumbnail.alt = "";

    thumbnail.loading =
      "lazy";


    const text =
      document.createElement(
        "div"
      );

    text.className =
      "video-picker-item-text";


    const title =
      document.createElement(
        "strong"
      );

    title.textContent =
      video.title;


    const date =
      document.createElement(
        "span"
      );

    date.textContent =
      video.date
        ? video.date.replaceAll("-","/")
        : "";


    text.append(
      title,
      date
    );

    item.append(
      thumbnail,
      text
    );

    container.appendChild(
      item
    );

  });

}


/* =========================================================
   GET REAL VIDEO
========================================================= */

function getRealVideo(videoId){

  if(!videoId){
    return null;
  }

  return REAL_VIDEOS.find(
    video =>
      video.id === videoId
  ) || null;
}


/* =========================================================
   SELECTED INDIVIDUAL
========================================================= */

function getSelectedIndividualVideo(){

  return getRealVideo(
    selectedIndividualVideoId
  );
}


/* =========================================================
   VIDEO DAILY SERIES
========================================================= */

function getVideoDailySeries(
  videoId,
  metric = "views"
){

  const video =
    getRealVideo(videoId);

  const daily =
    video?.analytics?.daily || [];


  return {

    labels:
      daily.map(
        (_,index) =>
          `DAY ${index + 1}`
      ),

    values:
      daily.map(row => {

        if(metric === "engaged"){

          if(
            row.engagedViews === null ||
            row.engagedViews === undefined
          ){
            return null;
          }

          const value =
            Number(
              row.engagedViews
            );

          return Number.isFinite(value)
            ? value
            : null;
        }


        if(
          row.views === null ||
          row.views === undefined
        ){
          return null;
        }

        const value =
          Number(
            row.views
          );

        return Number.isFinite(value)
          ? value
          : null;

      })

  };
}


/* =========================================================
   MILESTONES
========================================================= */

function getVideoMilestone(
  videoId,
  day
){

  const video =
    getRealVideo(videoId);

  if(!video){
    return null;
  }

  return (
    video.analytics
      ?.milestones
      ?.[`day${day}`] ||
    null
  );
}


/* =========================================================
   VIDEO SUMMARY
========================================================= */

function getVideoSummary(videoId){

  const video =
    getRealVideo(videoId);

  return (
    video?.analytics?.summary ||
    null
  );
}

let currentMode = "overview";
let currentPeriod = "all";

let currentReachWindow = "first14";
let currentReachStart = 0;

let currentPickerTarget = null;


/* =========================================================
   VIDEO DUMMY DATA
========================================================= */

const VIDEOS = [
  {
    id: "B75t0LqJUSg",
    title: "浴衣の着付けで恐ろしい額を請求されてしまった髙橋舞【ニアジョイ】",
    shortTitle: "浴衣の着付けで恐ろしい額を請求されてしまった髙橋舞",
    date: "2026/8/26",
    publishedAt: "2026-08-26T20:15:00+09:00",
    thumbnail: "https://i.ytimg.com/vi/B75t0LqJUSg/hqdefault.jpg"
  },
  {
    id: "sample2",
    title: "サンプル動画 2",
    shortTitle: "サンプル動画 2",
    date: "2026/8/24",
    publishedAt: "2026-08-24T19:30:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample3",
    title: "サンプル動画 3",
    shortTitle: "サンプル動画 3",
    date: "2026/8/22",
    publishedAt: "2026-08-22T20:00:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample4",
    title: "サンプル動画 4",
    shortTitle: "サンプル動画 4",
    date: "2026/8/20",
    publishedAt: "2026-08-20T19:45:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample5",
    title: "サンプル動画 5",
    shortTitle: "サンプル動画 5",
    date: "2026/8/18",
    publishedAt: "2026-08-18T20:10:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample6",
    title: "サンプル動画 6",
    shortTitle: "サンプル動画 6",
    date: "2026/8/16",
    publishedAt: "2026-08-16T19:20:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample7",
    title: "サンプル動画 7",
    shortTitle: "サンプル動画 7",
    date: "2026/8/14",
    publishedAt: "2026-08-14T20:05:00+09:00",
    thumbnail: ""
  },
  {
    id: "sample8",
    title: "サンプル動画 8",
    shortTitle: "サンプル動画 8",
    date: "2026/8/12",
    publishedAt: "2026-08-12T19:35:00+09:00",
    thumbnail: ""
  }
];


/* =========================================================
   DUMMY ANALYTICS
========================================================= */

const DUMMY = {

  overview: {

    labels: [
      "8/8","8/9","8/10","8/11","8/12","8/13","8/14",
      "8/15","8/16","8/17","8/18","8/19","8/20","8/21",
      "8/22","8/23","8/24","8/25","8/26","8/27","8/28",
      "8/29","8/30","8/31","9/1","9/2","9/3","9/4",
      "9/5","9/6"
    ],

    /*
      OVERVIEW:
      views / engaged は「その日の値」。
      描画時に累計化する。
    */

    views: [
      9140,10240,8810,12420,10780,
      11940,12820,11140,13840,14920,
      13310,15780,14120,16920,15810,
      17480,19020,18210,24910,22180,
      19820,20710,21940,22820,24120,
      23680,25210,26340,24820,27910
    ],

    engaged: [
      7310,8260,7040,10020,8610,
      9480,10320,8950,11120,11980,
      10620,12720,11310,13640,12780,
      14120,15320,14720,20180,17840,
      16020,16780,17720,18540,19520,
      19080,20420,21410,20080,22640
    ],

    impressions: [
      81200,89400,77400,103400,91200,
      98800,105200,93100,112400,120800,
      108200,126400,116200,135400,128100,
      141200,151800,147400,194200,181600,
      163400,169800,178200,184800,194600,
      190400,201200,209800,202400,218600
    ],

    ctr: [
      7.3,7.7,7.1,8.0,7.5,
      7.8,8.1,7.6,8.2,8.4,
      7.9,8.5,8.1,8.7,8.3,
      8.6,8.8,8.4,9.2,8.9,
      8.5,8.6,8.7,8.8,8.9,
      8.7,9.0,9.1,8.8,9.2
    ],

    averageViews: [
      7050,7410,7660,7900,8120,
      8360,8600,8840,9080,9310,
      9540,9770,10020,10280,10530,
      10780,11050,11320,11600,11870,
      12150,12420,12700,12980,13260,
      13540,13820,14110,14400,14690
    ],

    averageEngaged: [
      5680,5930,6170,6400,6620,
      6840,7060,7280,7500,7720,
      7940,8160,8380,8600,8820,
      9040,9260,9480,9700,9920,
      10140,10360,10580,10800,11020,
      11240,11460,11680,11900,12120
    ],

    averageImpressions: [
      67000,69000,71000,73000,75000,
      77000,79000,81000,83000,85000,
      87000,89000,91000,93000,95000,
      97000,99000,101000,103000,105000,
      107000,109000,111000,113000,115000,
      117000,119000,121000,123000,125000
    ],

    averageCtr: [
      7.0,7.1,7.0,7.2,7.1,
      7.2,7.3,7.2,7.3,7.4,
      7.3,7.4,7.3,7.5,7.4,
      7.5,7.6,7.5,7.7,7.6,
      7.6,7.7,7.7,7.8,7.8,
      7.8,7.9,7.9,7.9,8.0
    ]
  },


  individual: {

    labels: [
      "DAY 1","DAY 2","DAY 3","DAY 4","DAY 5","DAY 6","DAY 7",
      "DAY 8","DAY 9","DAY 10","DAY 11","DAY 12","DAY 13","DAY 14"
    ],

    /*
      INDIVIDUALは累計ではなく
      その日単体の数字。
    */

    views: [
      1824,1211,906,742,614,523,472,
      391,337,301,268,244,219,198
    ],

    engaged: [
      1518,1012,771,631,522,446,399,
      331,286,254,227,207,186,168
    ],

    /* 視聴維持率 */

    retentionLabels: [
      "0:00",
      "0:20",
      "0:40",
      "1:00",
      "1:20",
      "1:40",
      "2:00",
      "2:20",
      "2:40",
      "3:00",
      "3:26"
    ],

    retention: [
      100,87,81,77,73,69,66,62,58,53,47
    ],

    averageRetention: [
      100,84,78,73,69,65,61,57,53,48,43
    ],

    /*
      REACH
      42日分用意して14日ずつ移動可能
    */
    reachLabels: Array.from(
      {length:42},
      (_,i) => {

        const date = new Date(
          2026,
          7,
          26 + i
        );

        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    ),

    impressions: [
      19240,15180,12640,10820,9240,8160,7380,
      6420,5780,5210,4810,4460,4180,3910,
      3680,3490,3310,3150,3010,2880,2760,
      2650,2550,2460,2370,2290,2210,2140,
      2070,2010,1950,1890,1840,1790,1740,
      1690,1650,1610,1570,1530,1490,1450
    ],

    ctr: [
      9.42,9.18,8.94,8.61,8.43,8.21,8.09,
      7.94,7.81,7.72,7.64,7.57,7.49,7.41,
      7.36,7.32,7.29,7.25,7.21,7.18,7.16,
      7.14,7.12,7.10,7.08,7.06,7.05,7.03,
      7.02,7.01,7.00,7.01,7.03,7.04,7.06,
      7.08,7.10,7.12,7.14,7.15,7.17,7.18
    ],

    trafficLabels: [
      "ブラウジング機能",
      "関連動画",
      "YouTube検索",
      "外部",
      "チャンネルページ",
      "その他"
    ],

    traffic: [
      44.2,
      25.8,
      14.6,
      7.9,
      4.1,
      3.4
    ]
  },


  compare: {

    dayLabels: [
      "DAY 1",
      "DAY 2",
      "DAY 3",
      "DAY 4",
      "DAY 5",
      "DAY 6",
      "DAY 7"
    ],

    dailyViewsA: [
      1824,1211,906,742,614,523,472
    ],

    dailyViewsB: [
      1411,1328,1081,921,842,811,817
    ],

    averageDailyViews: [
      1310,1050,742,610,528,471,429
    ],

    impressionsA: [
      19240,15180,12640,10820,9240,8160,7380
    ],

    impressionsB: [
      18100,16900,15200,13800,12700,11900,11200
    ],

    averageImpressions: [
      14800,12900,11100,9800,8900,8100,7500
    ],

    ctrA: [
      9.42,9.18,8.94,8.61,8.43,8.21,8.09
    ],

    ctrB: [
      7.84,7.91,8.03,8.10,8.17,8.24,8.31
    ],

    averageCtr: [
      7.18,7.21,7.24,7.28,7.31,7.34,7.37
    ],

    /*
      COMPAREの視聴維持率は
      動画尺ではなく動画進行率で比較。
    */
    retentionLabels: [
      "0%","10%","20%","30%","40%","50%",
      "60%","70%","80%","90%","100%"
    ],

    retentionA: [
      100,87,81,77,73,69,66,62,58,53,47
    ],

    retentionB: [
      100,91,86,82,79,76,73,70,66,62,57
    ],

    averageRetention: [
      100,85,79,74,70,66,62,58,54,49,44
    ]
  }
};


/* =========================================================
   FORMAT
========================================================= */

function compactNumber(value){

  if(
    value === null ||
    value === undefined
  ){
    return "—";
  }

  const number = Number(value);

  if(!Number.isFinite(number)){
    return "—";
  }

  if(number >= 1000000){
    return `${(number / 1000000)
      .toFixed(1)
      .replace(".0","")}M`;
  }

  if(number >= 1000){
    return `${(number / 1000)
      .toFixed(1)
      .replace(".0","")}k`;
  }

  return number.toLocaleString();
}


function cumulative(values){

  let total = 0;

  return values.map(value => {

    total += Number(value || 0);

    return total;
  });
}


function sliceLast(array,count){

  if(count === "all"){
    return [...array];
  }

  return array.slice(
    Math.max(
      0,
      array.length - Number(count)
    )
  );
}


/* =========================================================
   HEADER
========================================================= */

function formatDateJP(date){

  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ].join("/");
}


function formatDateTimeJP(date){

  const y = date.getFullYear();

  const m =
    String(date.getMonth() + 1)
      .padStart(2,"0");

  const d =
    String(date.getDate())
      .padStart(2,"0");

  const h =
    String(date.getHours())
      .padStart(2,"0");

  const min =
    String(date.getMinutes())
      .padStart(2,"0");

  return `${y}/${m}/${d} ${h}:${min}`;
}


function formatPublishedAtJP(value){

  if(!value){
    return "—";
  }

  const date = new Date(value);

  if(Number.isNaN(date.getTime())){
    return String(value);
  }

  const weekdays = [
    "日","月","火","水","木","金","土"
  ];

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];

  const h =
    String(date.getHours())
      .padStart(2,"0");

  const min =
    String(date.getMinutes())
      .padStart(2,"0");

  return `${y}/${m}/${d}（${w}）${h}:${min} 公開`;
}


function getDaysSinceStart(){

  const start =
    new Date(`${START_DATE}T00:00:00`);

  const now =
    new Date();

  const diff =
    now.getTime() -
    start.getTime();

  return Math.max(
    1,
    Math.floor(diff / 86400000) + 1
  );
}


function renderHeader(){

  const now =
    new Date();

  const periodText =
    document.getElementById(
      "periodText"
    );

  const dayCount =
    document.getElementById(
      "dayCount"
    );

  const updatedDesktop =
    document.getElementById(
      "updatedAtDesktop"
    );

  const updatedMobile =
    document.getElementById(
      "updatedAtMobile"
    );


  if(periodText){

    periodText.textContent =
      `2026/4/3～${formatDateJP(now)}`;
  }


  if(dayCount){

    dayCount.textContent =
      `（${getDaysSinceStart()}日）`;
  }


  const updated =
    formatDateTimeJP(now);


  if(updatedDesktop){
    updatedDesktop.textContent = updated;
  }


  if(updatedMobile){
    updatedMobile.textContent = updated;
  }
}


/* =========================================================
   CHART DEFAULT
========================================================= */

function setupChartDefaults(){

  if(typeof Chart === "undefined"){
    return;
  }

  Chart.defaults.font.family =
    'Inter, "Noto Sans JP", sans-serif';

  Chart.defaults.color =
    COLORS.muted;

  Chart.defaults.animation.duration =
    250;

  Chart.defaults.responsive =
    true;

  Chart.defaults.maintainAspectRatio =
    false;
}


/* =========================================================
   DESTROY
========================================================= */

function destroyChart(name){

  if(!CHARTS[name]){
    return;
  }

  CHARTS[name].destroy();

  delete CHARTS[name];
}


/* =========================================================
   COMMON LINE OPTIONS
========================================================= */

function lineChartOptions({
  percent = false,
  beginAtZero = true,
  showLegend = false
} = {}){

  return {

    responsive:true,

    maintainAspectRatio:false,

    interaction:{
      mode:"index",
      intersect:false
    },

    plugins:{

      legend:{
        display:showLegend
      },

      tooltip:{

        backgroundColor:"#111",

        titleColor:"#fff",
        bodyColor:"#fff",

        padding:10,

        displayColors:true,

        callbacks:{

          label(context){

            const value =
              context.parsed.y;

            const label =
              context.dataset.label
                ? `${context.dataset.label}: `
                : "";

            if(percent){
              return `${label}${value}%`;
            }

            return `${label}${Number(value).toLocaleString("ja-JP")}`;
          }
        }
      }
    },

    scales:{

      x:{

        grid:{
          display:false
        },

        border:{
          display:false
        },

        ticks:{

          autoSkip:true,
          maxRotation:0,

          maxTicksLimit:
            window.innerWidth <= 800
              ? 6
              : 10,

          font:{
            size:
              window.innerWidth <= 800
                ? 8
                : 10,

            weight:"700"
          }
        }
      },

      y:{

        beginAtZero,

        grid:{
          color:COLORS.grid
        },

        border:{
          display:false
        },

        ticks:{

          padding:8,

          font:{
            size:
              window.innerWidth <= 800
                ? 8
                : 10,

            weight:"700"
          },

          callback(value){

            if(percent){
              return `${value}%`;
            }

            return Number(value).toLocaleString("ja-JP");
          }
        }
      }
    }
  };
}


/* =========================================================
   OVERVIEW PERIOD DATA
========================================================= */
/* =========================================================
   OVERVIEW REAL SUMMARY
========================================================= */

function getOverviewPeriodRows(){

  const daily =
    Array.isArray(
      ANALYTICS_DATA?.channelDaily
    )
      ? ANALYTICS_DATA.channelDaily
      : [];

  if(currentPeriod === "all"){
    return daily;
  }

  const count =
    Number(currentPeriod);

  return daily.slice(
    -count
  );
}


function calculateOverviewSummary(){

  const rows =
    getOverviewPeriodRows();


  let views = 0;
  let engagedViews = 0;
  let watchMinutes = 0;

  let viewsCount = 0;
  let engagedViewsCount = 0;
  let watchMinutesCount = 0;

  let weightedDuration = 0;
  let durationWeight = 0;

  let weightedPercentage = 0;
  let percentageWeight = 0;


  rows.forEach(row => {

    const rowViews =
      row.views === null ||
      row.views === undefined
        ? null
        : Number(row.views);

    const rowEngaged =
      row.engagedViews === null ||
      row.engagedViews === undefined
        ? null
        : Number(row.engagedViews);

    const rowWatch =
      row.watchMinutes === null ||
      row.watchMinutes === undefined
        ? null
        : Number(row.watchMinutes);

    const rowDuration =
      row.averageViewDuration === null ||
      row.averageViewDuration === undefined
        ? null
        : Number(row.averageViewDuration);

    const rowPercentage =
      row.averageViewPercentage === null ||
      row.averageViewPercentage === undefined
        ? null
        : Number(row.averageViewPercentage);


    if(Number.isFinite(rowViews)){
      views += rowViews;
      viewsCount += 1;
    }

    if(Number.isFinite(rowEngaged)){
      engagedViews += rowEngaged;
      engagedViewsCount += 1;
    }

    if(Number.isFinite(rowWatch)){
      watchMinutes += rowWatch;
      watchMinutesCount += 1;
    }


    /*
      平均再生時間・平均再生率は
      単純平均ではなく再生数で加重平均
    */

    if(
      Number.isFinite(rowViews) &&
      rowViews > 0 &&
      Number.isFinite(rowDuration)
    ){
      weightedDuration +=
        rowDuration * rowViews;

      durationWeight +=
        rowViews;
    }


    if(
      Number.isFinite(rowViews) &&
      rowViews > 0 &&
      Number.isFinite(rowPercentage)
    ){
      weightedPercentage +=
        rowPercentage * rowViews;

      percentageWeight +=
        rowViews;
    }

  });


  return {

    views:
      viewsCount > 0
        ? views
        : null,

    engagedViews:
      engagedViewsCount > 0
        ? engagedViews
        : null,

    watchMinutes:
      watchMinutesCount > 0
        ? watchMinutes
        : null,

    averageViewDuration:
      durationWeight > 0
        ? weightedDuration /
          durationWeight
        : null,

    averageViewPercentage:
      percentageWeight > 0
        ? weightedPercentage /
          percentageWeight
        : null

  };
}

/* =========================================================
   OVERVIEW PREVIOUS PERIOD
========================================================= */

function getOverviewPreviousPeriodRows(){

  const daily =
    Array.isArray(
      ANALYTICS_DATA?.channelDaily
    )
      ? ANALYTICS_DATA.channelDaily
      : [];

  /*
    累計では前期間比較をしない
  */
  if(currentPeriod === "all"){
    return [];
  }

  const days =
    Number(currentPeriod);

  if(
    !Number.isFinite(days) ||
    days <= 0
  ){
    return [];
  }

  /*
    最新期間の直前、同じ日数を取得

    例：
    7日表示
    → 最新7日のさらに前の7日
  */
  const end =
    Math.max(
      0,
      daily.length - days
    );

  const start =
    Math.max(
      0,
      end - days
    );

  return daily.slice(
    start,
    end
  );
}

function calculateOverviewSummaryFromRows(
  rows
){

  let views = 0;
  let engagedViews = 0;
  let watchMinutes = 0;

  let viewsCount = 0;
  let engagedViewsCount = 0;
  let watchMinutesCount = 0;

  let weightedDuration = 0;
  let durationWeight = 0;

  let weightedPercentage = 0;
  let percentageWeight = 0;


  rows.forEach(row => {

    const rowViews =
      row.views === null ||
      row.views === undefined
        ? null
        : Number(row.views);

    const rowEngaged =
      row.engagedViews === null ||
      row.engagedViews === undefined
        ? null
        : Number(row.engagedViews);

    const rowWatch =
      row.watchMinutes === null ||
      row.watchMinutes === undefined
        ? null
        : Number(row.watchMinutes);

    const rowDuration =
      row.averageViewDuration === null ||
      row.averageViewDuration === undefined
        ? null
        : Number(row.averageViewDuration);

    const rowPercentage =
      row.averageViewPercentage === null ||
      row.averageViewPercentage === undefined
        ? null
        : Number(row.averageViewPercentage);


    if(Number.isFinite(rowViews)){
      views += rowViews;
      viewsCount += 1;
    }

    if(Number.isFinite(rowEngaged)){
      engagedViews += rowEngaged;
      engagedViewsCount += 1;
    }

    if(Number.isFinite(rowWatch)){
      watchMinutes += rowWatch;
      watchMinutesCount += 1;
    }


    if(
      Number.isFinite(rowViews) &&
      rowViews > 0 &&
      Number.isFinite(rowDuration)
    ){
      weightedDuration +=
        rowDuration * rowViews;

      durationWeight +=
        rowViews;
    }


    if(
      Number.isFinite(rowViews) &&
      rowViews > 0 &&
      Number.isFinite(rowPercentage)
    ){
      weightedPercentage +=
        rowPercentage * rowViews;

      percentageWeight +=
        rowViews;
    }

  });


  return {

    views:
      viewsCount > 0
        ? views
        : null,

    engagedViews:
      engagedViewsCount > 0
        ? engagedViews
        : null,

    watchMinutes:
      watchMinutesCount > 0
        ? watchMinutes
        : null,

    averageViewDuration:
      durationWeight > 0
        ? weightedDuration /
          durationWeight
        : null,

    averageViewPercentage:
      percentageWeight > 0
        ? weightedPercentage /
          percentageWeight
        : null

  };
}






function calculatePeriodChange(
  currentValue,
  previousValue
){

  if(
    currentValue === null ||
    previousValue === null ||
    !Number.isFinite(Number(currentValue)) ||
    !Number.isFinite(Number(previousValue)) ||
    Number(previousValue) === 0
  ){
    return null;
  }


  return (
    (
      Number(currentValue) -
      Number(previousValue)
    ) /
    Number(previousValue)
  ) * 100;
}

function renderOverviewPeriodChanges(){

  const cards =
    document.querySelectorAll(
      "#overviewMode .metric-card"
    );


  /*
    累計
    → 前期間比そのものを完全に消す
  */
  if(currentPeriod === "all"){

    cards.forEach(card => {

      const context =
        card.querySelector(
          ".metric-context"
        );

      if(context){
        context.style.display = "none";
      }

    });

    return;
  }


  const currentSummary =
    calculateOverviewSummary();

  const previousSummary =
    calculateOverviewSummaryFromRows(
      getOverviewPreviousPeriodRows()
    );


  const metrics = {

    "総再生数":{
      current:
        currentSummary.views,

      previous:
        previousSummary.views,

      type:"percent"
    },


    "Engaged Views":{
      current:
        currentSummary.engagedViews,

      previous:
        previousSummary.engagedViews,

      type:"percent"
    },


    "総再生時間":{
      current:
        currentSummary.watchMinutes,

      previous:
        previousSummary.watchMinutes,

      type:"percent"
    },


    "平均再生時間":{
      current:
        currentSummary.averageViewDuration,

      previous:
        previousSummary.averageViewDuration,

      type:"duration"
    },


    "平均再生率":{
      current:
        currentSummary.averageViewPercentage,

      previous:
        previousSummary.averageViewPercentage,

      type:"point"
    }

  };


  cards.forEach(card => {

    const name =
      card.querySelector(
        ".metric-name"
      );

    const context =
      card.querySelector(
        ".metric-context"
      );


    if(
      !name ||
      !context
    ){
      return;
    }


    const label =
      name.textContent.trim();


    /*
      クリック率はReporting API待ち
    */
    if(
      label === "平均クリック率" ||
      !metrics[label]
    ){

      context.style.display =
        "none";

      return;
    }


    const metric =
      metrics[label];

    const current =
      Number(metric.current);

    const previous =
      Number(metric.previous);


    if(
      !Number.isFinite(current) ||
      !Number.isFinite(previous)
    ){

      context.style.display =
        "none";

      return;
    }


    let difference;
    let text;


    /*
      再生数 / Engaged Views / 総再生時間
      → %比較
    */
    if(metric.type === "percent"){

      if(previous === 0){

        context.style.display =
          "none";

        return;
      }


      difference =
        (
          (current - previous) /
          previous
        ) * 100;


      const arrow =
        difference > 0
          ? "↑"
          : difference < 0
            ? "↓"
            : "→";


      text =
        `${arrow} ${Math.abs(
          difference
        ).toFixed(1)}%`;
    }


    /*
      平均再生時間
      → 秒差
    */
    else if(metric.type === "duration"){

      difference =
        current - previous;


      const arrow =
        difference > 0
          ? "↑"
          : difference < 0
            ? "↓"
            : "→";


      text =
        `${arrow} ${formatDuration(
          Math.abs(difference)
        )}`;
    }


    /*
      平均再生率
      → pt差
    */
    else{

      difference =
        current - previous;


      const arrow =
        difference > 0
          ? "↑"
          : difference < 0
            ? "↓"
            : "→";


      text =
        `${arrow} ${Math.abs(
          difference
        ).toFixed(1)}pt`;
    }


    /*
      表示を復活
    */
    context.style.display = "";


    /*
      色
    */
    context.classList.remove(
      "positive",
      "negative"
    );


    if(difference > 0){

      context.classList.add(
        "positive"
      );

    }else if(difference < 0){

      context.classList.add(
        "negative"
      );

    }


    /*
      HTML構造を維持して
      数字 + 「前期間比」
    */
    context.innerHTML =
      `${text}<span>前期間比</span>`;

  });
}
function findOverviewMetricCard(
  label
){

  const cards =
    document.querySelectorAll(
      "#overviewMode .metric-card"
    );


  return [...cards].find(
    card => {

      const name =
        card.querySelector(
          ".metric-name"
        );

      return (
        name &&
        name.textContent
          .trim() === label
      );
    }
  );
}


function setOverviewMetric(
  label,
  value
){

  const card =
    findOverviewMetricCard(
      label
    );

  if(!card){
    return;
  }


  const valueElement =
    card.querySelector(
      ".metric-value"
    );

  if(valueElement){
    valueElement.textContent =
      value;
  }
}


function renderOverviewRealSummary(){

  const summary =
    calculateOverviewSummary();


  setOverviewMetric(
    "総再生数",
    formatInteger(
      summary.views
    )
  );


  setOverviewMetric(
    "Engaged Views",
    formatInteger(
      summary.engagedViews
    )
  );


  setOverviewMetric(
    "総再生時間",
    summary.watchMinutes === null
      ? "—"
      : `${formatWatchHours(
          summary.watchMinutes
        )}時間`
  );


  /*
    平均クリック率は
    Reporting API接続まで触らない
  */


  setOverviewMetric(
    "平均再生時間",
    formatDuration(
      summary.averageViewDuration
    )
  );


  setOverviewMetric(
    "平均再生率",
    formatPercent(
      summary.averageViewPercentage
    )
  );
}

function getOverviewSeries(metric){

  const daily =
    Array.isArray(
      ANALYTICS_DATA?.channelDaily
    )
      ? ANALYTICS_DATA.channelDaily
      : [];


  /*
    Analytics APIで現在取得済みなのは
    views / engagedViews。

    impressions / クリック率は
    Reporting API接続後に実データ化する。
  */
  const useRealData =
    metric === "views" ||
    metric === "engaged";


  /*
    まだ取得していない指標は、
    現段階では既存表示を維持。
  */
  if(!useRealData){

    const source =
      DUMMY.overview;

    let values;
    let average;
    let percent = false;


    if(metric === "ctr"){

      values =
        [...source.ctr];

      average =
        [...source.averageCtr];

      percent = true;

    }else{

      values =
        [...source.impressions];

      average =
        [...source.averageImpressions];
    }


    const count =
      currentPeriod === "all"
        ? "all"
        : Math.min(
            Number(currentPeriod),
            source.labels.length
          );


    return {

      labels:
        sliceLast(
          source.labels,
          count
        ),

      values:
        sliceLast(
          values,
          count
        ),

      average:
        sliceLast(
          average,
          count
        ),

      percent
    };
  }


  /*
    =========================
    REAL ANALYTICS DATA
    =========================
  */

  const labels =
    daily.map(row => {

      if(!row.date){
        return "";
      }

      const parts =
        row.date.split("-");

      return (
        parts.length === 3
          ? `${Number(parts[1])}/${Number(parts[2])}`
          : row.date
      );
    });


  const rawValues =
    daily.map(row => {

      if(metric === "engaged"){

        return (
          row.engagedViews === null ||
          row.engagedViews === undefined
        )
          ? null
          : Number(
              row.engagedViews
            );
      }


      return (
        row.views === null ||
        row.views === undefined
      )
        ? null
        : Number(
            row.views
          );
    });


  /*
    OVERVIEWの再生数 / Engaged Viewsは
    累計表示なので日別値を累積する。

    nullは欠損として保持する。
  */

  let runningTotal = 0;

  const values =
    rawValues.map(value => {

      if(value === null){
        return null;
      }

      runningTotal += value;

      return runningTotal;
    });


  /*
    全動画平均線はまだ実データ計算へ
    接続していないため、一旦非表示。
  */

  const average =
    values.map(() => null);


  const count =
    currentPeriod === "all"
      ? "all"
      : Math.min(
          Number(currentPeriod),
          labels.length
        );


  return {

    labels:
      sliceLast(
        labels,
        count
      ),

    values:
      sliceLast(
        values,
        count
      ),

    average:
      sliceLast(
        average,
        count
      ),

    percent:false
  };
}


/* =========================================================
   OVERVIEW CHART
========================================================= */

function renderOverviewDailyChart(
  metric = "views"
){

  const canvas =
    document.getElementById(
      "overviewDailyChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  destroyChart(
    "overviewDaily"
  );


  const series =
    getOverviewSeries(metric);


  const labels = {

    views:"再生数",
    engaged:"Engaged Views",
    impressions:"インプレッション",
    ctr:"クリック率"
  };


  CHARTS.overviewDaily =
    new Chart(
      canvas,
      {

        type:"line",

        data:{

          labels:
            series.labels,

          datasets:[

            {
              label:
                labels[metric] ||
                "再生数",

              data:
                series.values,

              borderColor:
                COLORS.chartYellow,

              backgroundColor:
                COLORS.yellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.chartYellow,

              pointBorderWidth:2,

              pointRadius:
                window.innerWidth <= 800
                  ? 2
                  : 3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.3,

              fill:false
            },


            {
              label:"全動画平均",

              data:
                series.average,

              borderColor:
                COLORS.average,

              backgroundColor:
                COLORS.averageFill,

              pointRadius:0,

              borderWidth:2,

              borderDash:[5,5],

              tension:.3,

              fill:false
            }

          ]
        },


        options:
          lineChartOptions({
            percent:
              series.percent,
            beginAtZero:
              !series.percent,
            showLegend:false
          })
      }
    );
}


/* =========================================================
   INDIVIDUAL DAILY VIEWS
========================================================= */

function renderIndividualViewsChart(
  metric = "views"
){

  const canvas =
    document.getElementById(
      "individualViewsChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  const video =
    getSelectedIndividualVideo();

  if(!video){
    console.warn(
      "Selected individual video not found"
    );
    return;
  }


const daily =
  Array.isArray(video.analytics?.daily)
    ? video.analytics.daily
    : [];

  const engaged =
    metric === "engaged";


  const labels =
    daily.map((row,index) => {

      /*
        投稿日をDAY 1として表示。
        データ欠損日があっても
        日付差からDAY番号を計算する。
      */

      if(
        row.date &&
        video.publishedPacificDate
      ){

        const current =
          new Date(
            `${row.date}T00:00:00Z`
          );

        const published =
          new Date(
            `${video.publishedPacificDate}T00:00:00Z`
          );

        const diff =
          Math.round(
            (
              current.getTime() -
              published.getTime()
            ) / 86400000
          );

        return `DAY ${diff + 1}`;
      }

      return `DAY ${index + 1}`;
    });


  const values =
    daily.map(row => {

      const value =
        engaged
          ? row.engagedViews
          : row.views;

      if(
        value === null ||
        value === undefined
      ){
        return null;
      }

      const number =
        Number(value);

      return Number.isFinite(number)
        ? number
        : null;
    });


  destroyChart(
    "individualViews"
  );


  CHARTS.individualViews =
    new Chart(
      canvas,
      {

        type:"line",

        data:{

          labels,

          datasets:[
            {

              label:
                engaged
                  ? "Engaged Views"
                  : "再生数",

              data:values,

              borderColor:
                COLORS.chartYellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.chartYellow,

              pointBorderWidth:2,

              pointRadius:3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.28,

              spanGaps:false
            }
          ]
        },

        options:
          lineChartOptions()
      }
    );
}

function getVideoRetention(video){

  const rows =
    video?.analytics?.retention;

  if(!Array.isArray(rows)){
    return [];
  }

  return rows
    .map(row => {

      if(
        row.position === null ||
        row.position === undefined ||
        row.watchRatio === null ||
        row.watchRatio === undefined
      ){
        return null;
      }

      const position =
        Number(row.position);

      const watchRatio =
        Number(row.watchRatio);

      if(
        !Number.isFinite(position) ||
        !Number.isFinite(watchRatio)
      ){
        return null;
      }

      return {
        position,
        watchRatio
      };
    })
    .filter(Boolean)
    .sort(
      (a,b) =>
        a.position - b.position
    );
}


function interpolateRetention(
  retention,
  targetPosition
){

  if(!retention.length){
    return null;
  }

  const exact =
    retention.find(
      row =>
        row.position ===
        targetPosition
    );

  if(exact){
    return exact.watchRatio;
  }


  let before = null;
  let after = null;

  for(const row of retention){

    if(row.position < targetPosition){
      before = row;
      continue;
    }

    if(row.position > targetPosition){
      after = row;
      break;
    }
  }


  if(!before && after){
    return after.watchRatio;
  }

  if(before && !after){
    return before.watchRatio;
  }

  if(!before || !after){
    return null;
  }


  const distance =
    after.position -
    before.position;

  if(distance <= 0){
    return before.watchRatio;
  }


  const progress =
    (
      targetPosition -
      before.position
    ) /
    distance;


  return (
    before.watchRatio +
    (
      after.watchRatio -
      before.watchRatio
    ) *
    progress
  );
}


function getAverageRetention(){

  const videos =
    REAL_VIDEOS
      .map(video => ({
        video,
        retention:
          getVideoRetention(video)
      }))
      .filter(
        item =>
          item.retention.length
      );


  if(!videos.length){
    return [];
  }


  /*
    0～100%を1%刻みで比較。
    動画尺が違っても
    同じ動画進行位置で平均する。
  */
  return Array.from(
    {length:101},
    (_,position) => {

      const values =
        videos
          .map(item =>
            interpolateRetention(
              item.retention,
              position
            )
          )
          .filter(value =>
            value !== null &&
            Number.isFinite(value)
          );


      if(!values.length){

        return {
          position,
          watchRatio:null
        };
      }


      const average =
        values.reduce(
          (sum,value) =>
            sum + value,
          0
        ) /
        values.length;


      return {
        position,
        watchRatio:average
      };
    }
  );
}

/* =========================================================
   RETENTION
========================================================= */

function renderRetentionChart(){

  const canvas =
    document.getElementById(
      "retentionChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  destroyChart(
    "retention"
  );


  const video =
    getSelectedIndividualVideo();

  const retention =
    getVideoRetention(
      video
    );

  const averageRetention =
    getAverageRetention();


  /*
    選択動画に維持率データがない場合も
    ダミーデータは表示しない。
  */
  if(!retention.length){

    CHARTS.retention = null;

    return;
  }


  /*
    APIから取得した100点前後を
    動画進行率0～100%として表示。
  */
  const labels =
    retention.map(
      row =>
        `${Math.round(
          row.position
        )}%`
    );


  const videoValues =
    retention.map(
      row =>
        row.watchRatio
    );


  /*
    全動画平均を、
    選択動画と同じX位置へ補間。
  */
  const averageValues =
    retention.map(row =>
      interpolateRetention(
        averageRetention,
        row.position
      )
  );


  CHARTS.retention =
    new Chart(
      canvas,
      {

        type:"line",

        data:{

          labels,

          datasets:[

            {
              label:"この動画",

              data:
                videoValues,

              borderColor:
                COLORS.chartYellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.chartYellow,

              pointBorderWidth:2,

              pointRadius:
                window.innerWidth <= 800
                  ? 0
                  : 2,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.25,

              spanGaps:false
            },

            {
              label:"全動画平均",

              data:
                averageValues,

              borderColor:
                COLORS.average,

              pointRadius:0,

              borderWidth:2,

              borderDash:[5,5],

              tension:.25,

              spanGaps:false
            }

          ]
        },


        options:{

          ...lineChartOptions({
            percent:true
          }),

          interaction:{
            mode:"index",
            intersect:false
          },

          plugins:{

            legend:{
              display:false
            },

            tooltip:{

              backgroundColor:"#111",

              titleColor:"#fff",

              bodyColor:"#fff",

              displayColors:true,

              callbacks:{

                title(items){

                  if(!items.length){
                    return "";
                  }

                  return `動画位置 ${items[0].label}`;
                },

                label(context){

                  const value =
                    context.parsed.y;

                  if(
                    value === null ||
                    !Number.isFinite(value)
                  ){
                    return `${context.dataset.label}: —`;
                  }

                  return (
                    `${context.dataset.label}: ` +
                    `${value.toFixed(1)}%`
                  );
                }
              }
            }
          },


          scales:{

            x:{

              grid:{
                display:false
              },

              border:{
                display:false
              },

              ticks:{

                maxRotation:0,

                autoSkip:true,

                maxTicksLimit:
                  window.innerWidth <= 800
                    ? 6
                    : 11,

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 8
                      : 10,

                  weight:"700"
                }
              }
            },


            y:{

              min:0,

              max:100,

              grid:{
                color:COLORS.grid
              },

              border:{
                display:false
              },

              ticks:{

                stepSize:20,

                callback(value){
                  return `${value}%`;
                },

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 8
                      : 10,

                  weight:"700"
                }
              }
            }
          }
        }
      }
    );
}
/* =========================================================
   REACH DATA
========================================================= */

function getReachSlice(){

  const video =
    getSelectedIndividualVideo();

  const rows =
    getSelectedVideoReachData()
      .map(row => ({

        ...row,

        dayNumber:
          getReachDayNumber(
            video?.date,
            row.date
          )

      }))
      .filter(row =>
        Number.isFinite(
          row.dayNumber
        ) &&
        row.dayNumber >= 1
      );


  const total =
    rows.length;


  if(!total){

    return {
      start:0,
      end:0,
      labels:[],
      impressions:[],
      ctr:[],
      dayNumbers:[]
    };
  }


  if(
    currentReachWindow ===
    "current"
  ){

    currentReachStart =
      Math.max(
        0,
        total - 14
      );
  }


  const maxStart =
    Math.max(
      0,
      total - 14
    );


  const start =
    Math.max(
      0,
      Math.min(
        currentReachStart,
        maxStart
      )
    );


  const end =
    Math.min(
      total,
      start + 14
    );


  const slicedRows =
    rows.slice(
      start,
      end
    );


  return {
    start,
    end,

    labels:
      slicedRows.map(row =>
        `DAY ${row.dayNumber}`
      ),

    dayNumbers:
      slicedRows.map(row =>
        row.dayNumber
      ),

    impressions:
      slicedRows.map(row => {

        const value =
          row.thumbnailImpressions;

        return (
          value === null ||
          value === undefined
        )
          ? null
          : Number(value);
      }),

    ctr:
      slicedRows.map(row => {

        const value =
          row.thumbnailClickRatePercent;

        return (
          value === null ||
          value === undefined
        )
          ? null
          : Number(value);
      })
  };
}

/* =========================================================
   REACH LABEL
========================================================= */

function updateReachWindowLabel(){

  const label =
    document.getElementById(
      "reachWindowLabel"
    );

  if(!label){
    return;
  }


  const slice =
    getReachSlice();


  if(
    !slice.dayNumbers ||
    !slice.dayNumbers.length
  ){

    label.textContent =
      "データなし";

    return;
  }


  const firstDay =
    slice.dayNumbers[0];

  const lastDay =
    slice.dayNumbers[
      slice.dayNumbers.length - 1
    ];


  label.textContent =
    firstDay === lastDay
      ? `DAY ${firstDay}`
      : `DAY ${firstDay} – DAY ${lastDay}`;
}


/* =========================================================
   INDIVIDUAL REACH SUMMARY
========================================================= */

function renderIndividualReachSummary(){

  const video =
    getSelectedIndividualVideo();

  if(!video){
    return;
  }


  const current =
    getVideoReachSummary(
      video.id
    );


  const cards =
    document.querySelectorAll(
      "#individualMode .reach-summary .mini-metric"
    );


  const summaries =
    REAL_VIDEOS
      .map(item => ({
        id:item.id,
        data:getVideoReachSummary(
          item.id
        )
      }))
      .filter(item =>
        item.data !== null
      );


  cards.forEach(card => {

    const label =
      card.querySelector(
        "span"
      )?.textContent.trim();

    const strong =
      card.querySelector(
        "strong"
      );

    const small =
      card.querySelector(
        "small"
      );


    if(
      !label ||
      !strong ||
      !small
    ){
      return;
    }


    let currentValue = null;
    let values = [];
    let formatter = value => String(value);


    if(
      label ===
      "インプレッション"
    ){

      currentValue =
        current?.impressions ??
        null;

      values =
        summaries
          .map(item =>
            item.data?.impressions
          )
          .filter(value =>
            value !== null &&
            value !== undefined &&
            Number.isFinite(
              Number(value)
            )
          )
          .map(Number);

      formatter =
        value =>
          formatInteger(
            Math.round(value)
          );

    }else if(
      label ===
      "クリック率"
    ){

      currentValue =
        current?.clickRate ??
        null;

      values =
        summaries
          .map(item =>
            item.data?.clickRate
          )
          .filter(value =>
            value !== null &&
            value !== undefined &&
            Number.isFinite(
              Number(value)
            )
          )
          .map(Number);

      formatter =
        value =>
          `${Number(value)
            .toFixed(2)}%`;

    }else{
      return;
    }


    if(
      currentValue === null ||
      currentValue === undefined ||
      !Number.isFinite(
        Number(currentValue)
      )
    ){

      strong.textContent = "—";
      small.textContent = "—";

      return;
    }


    const numericCurrent =
      Number(currentValue);


    strong.textContent =
      formatter(
        numericCurrent
      );


    if(!values.length){

      small.textContent = "—";

      return;
    }


    const average =
      values.reduce(
        (sum,value) =>
          sum + value,
        0
      ) /
      values.length;


    const sorted =
      [...values].sort(
        (a,b) => b - a
      );


    const rank =
      sorted.findIndex(
        value =>
          value === numericCurrent
      ) + 1;


    small.textContent =
      `平均 ${formatter(average)} ・ ${
        rank > 0
          ? `${rank}位 / ${values.length}本`
          : "—"
      }`;

  });

}


/* =========================================================
   INDIVIDUAL REACH
========================================================= */

function renderIndividualReachChart(
  metric = "impressions"
){

  const canvas =
    document.getElementById(
      "individualReachChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  destroyChart(
    "individualReach"
  );


  const slice =
    getReachSlice();

  const isCtr =
    metric === "ctr";

  /*
    表示する14日間を移動しても
    Y軸の最大値は変えない。
  */
  const allReachRows =
    getSelectedVideoReachData();

  const allValues =
    isCtr
      ? allReachRows
          .map(row =>
            Number(
              row.thumbnailClickRatePercent
            )
          )
          .filter(Number.isFinite)
      : allReachRows
          .map(row =>
            Number(
              row.thumbnailImpressions
            )
          )
          .filter(Number.isFinite);


  const rawMax =
    allValues.length
      ? Math.max(...allValues)
      : 1;


  const fixedYMax =
    isCtr
      ? Math.max(
          1,
          Math.ceil(rawMax)
        )
      : Math.max(
          1,
          Math.ceil(
            rawMax / 100
          ) * 100
        );


  const baseOptions =
    lineChartOptions({
      percent:isCtr,
      beginAtZero:!isCtr
    });


  CHARTS.individualReach =
    new Chart(
      canvas,
      {

        type:"line",

        data:{

          labels:
            slice.labels,

          datasets:[
            {
              label:
                isCtr
                  ? "クリック率"
                  : "インプレッション",

              data:
                isCtr
                  ? slice.ctr
                  : slice.impressions,

              borderColor:
                COLORS.chartYellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.chartYellow,

              pointBorderWidth:2,

              pointRadius:3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.3
            }
          ]
        },


        options:{

          ...baseOptions,

          scales:{

            ...baseOptions.scales,

            y:{

              ...baseOptions.scales.y,

              min:0,
              max:fixedYMax
            }
          }
        }
      }
    );


  updateReachWindowLabel();
}


/* =========================================================
   TRAFFIC PERCENT LABEL PLUGIN
========================================================= */

const trafficValuePlugin = {

  id:"trafficValuePlugin",

  afterDatasetsDraw(chart){

    if(chart.canvas.id !== "trafficSourceChart"){
      return;
    }


    const {
      ctx,
      data
    } = chart;


    const meta =
      chart.getDatasetMeta(0);


    ctx.save();

    ctx.fillStyle =
      COLORS.ink;

    ctx.font =
      window.innerWidth <= 800
        ? "700 9px Inter, sans-serif"
        : "800 11px Inter, sans-serif";

    ctx.textBaseline =
      "middle";


    meta.data.forEach(
      (bar,index) => {

        const value =
          data.datasets[0]
            .data[index];

        const text =
          `${value}%`;


        const x =
          Math.min(
            chart.chartArea.right - 30,
            bar.x + 8
          );


        ctx.fillText(
          text,
          x,
          bar.y
        );
      }
    );


    ctx.restore();
  }
};
/* =========================================================
   REAL TRAFFIC DATA
========================================================= */

const TRAFFIC_SOURCE_LABELS = {
  "RELATED_VIDEO": "関連動画",
  "YT_SEARCH": "YouTube検索",
  "EXT_URL": "外部",
  "SUBSCRIBER": "登録チャンネル",
  "YT_CHANNEL": "チャンネルページ",
  "YT_PLAYLIST_PAGE": "再生リスト",
  "PLAYLIST": "再生リスト",
  "NO_LINK_OTHER": "その他",
  "NO_LINK_EMBEDDED": "埋め込み",
  "ANNOTATION": "アノテーション",
  "END_SCREEN": "終了画面",
  "NOTIFICATION": "通知",
  "SHORTS": "ショートフィード",
  "SOUND_PAGE": "サウンドページ",
  "HASHTAGS": "ハッシュタグ",
  "LIVE_REDIRECT": "ライブリダイレクト"
};

function renderIndividualShares(){

  const video =
    getSelectedIndividualVideo();

  const container =
    document.querySelector(
      "#individualMode .share-grid"
    );

  if(!container){
    return;
  }


  const rows =
    Array.isArray(
      video?.analytics?.sharingServices
    )
      ? video.analytics.sharingServices
      : [];


  container.innerHTML = "";


  if(!rows.length){

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "share-card";

    card.innerHTML = `
      <span>シェア先データ</span>
      <strong>—</strong>
    `;

    container.appendChild(card);

    return;
  }


  rows
    .filter(row =>
      row?.service !== null &&
      row?.service !== undefined &&
      row?.shares !== null &&
      row?.shares !== undefined &&
      Number.isFinite(
        Number(row.shares)
      )
    )
    .sort(
      (a,b) =>
        Number(b.shares) -
        Number(a.shares)
    )
    .forEach(row => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "share-card";


      const name =
        document.createElement(
          "span"
        );

      name.textContent =
        String(row.service);


      const value =
        document.createElement(
          "strong"
        );

      value.textContent =
        Number(row.shares)
          .toLocaleString(
            "ja-JP"
          );


      card.append(
        name,
        value
      );

      container.appendChild(
        card
      );

    });

}

function getSelectedVideoTraffic(){

  const video =
    getSelectedIndividualVideo();

  const traffic =
    video?.analytics?.traffic;

  return {
    sources:
      Array.isArray(traffic?.sources)
        ? traffic.sources
        : [],

    searchTerms:
      Array.isArray(traffic?.searchTerms)
        ? traffic.searchTerms
        : [],

    externalSites:
      Array.isArray(traffic?.externalSites)
        ? traffic.externalSites
        : []
  };
}


function getTrafficSourceLabel(source){

  if(!source){
    return "その他";
  }

  return (
    TRAFFIC_SOURCE_LABELS[source] ||
    String(source)
  );
}

/* =========================================================
   TRAFFIC SOURCE
========================================================= */

function renderTrafficSourceChart(){

  const canvas =
    document.getElementById(
      "trafficSourceChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  destroyChart(
    "traffic"
  );


  const traffic =
    getSelectedVideoTraffic();

  const sources =
    [...traffic.sources]
      .filter(row =>
        row.percentage !== null &&
        row.percentage !== undefined &&
        Number.isFinite(
          Number(row.percentage)
        )
      )
      .sort(
        (a,b) =>
          Number(b.percentage) -
          Number(a.percentage)
      );


  const labels =
    sources.map(row =>
      getTrafficSourceLabel(
        row.source
      )
    );


  const values =
    sources.map(row =>
      Number(row.percentage)
    );


  CHARTS.traffic =
    new Chart(
      canvas,
      {

        type:"bar",

        data:{

          labels,

          datasets:[
            {
              label:"流入割合",

              data:values,

              backgroundColor:
                COLORS.chartYellow,

              borderWidth:0,

              borderRadius:6,

              barThickness:
                window.innerWidth <= 800
                  ? 15
                  : 19
            }
          ]
        },


        options:{

          indexAxis:"y",

          responsive:true,

          maintainAspectRatio:false,

          animation:false,

          plugins:{

            legend:{
              display:false
            },

            tooltip:{

              backgroundColor:"#111",

              titleColor:"#fff",

              bodyColor:"#fff",

              displayColors:false,

              callbacks:{

                label(context){

                  const row =
                    sources[
                      context.dataIndex
                    ];

                  const percentage =
                    Number(
                      row?.percentage
                    );

                  const views =
                    (
                      row?.views !== null &&
                      row?.views !== undefined
                    )
                      ? Number(
                          row.views
                        )
                      : null;

                  const parts = [];

                  if(
                    Number.isFinite(
                      percentage
                    )
                  ){
                    parts.push(
                      `${percentage.toFixed(1)}%`
                    );
                  }

                  if(
                    Number.isFinite(
                      views
                    )
                  ){
                    parts.push(
                      `${views.toLocaleString("ja-JP")}回`
                    );
                  }

                  return parts.join(" / ");
                }
              }
            }
          },


          scales:{

            x:{

              beginAtZero:true,

              suggestedMax:100,

              grid:{
                color:COLORS.grid
              },

              border:{
                display:false
              },

              ticks:{

                callback(value){
                  return `${value}%`;
                },

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 8
                      : 10,

                  weight:"700"
                }
              }
            },


            y:{

              grid:{
                display:false
              },

              border:{
                display:false
              },

              ticks:{

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 9
                      : 11,

                  weight:"800"
                }
              }
            }
          }
        }
      }
    );
}

/* =========================================================
   SEARCH / EXTERNAL DETAIL
========================================================= */

function createTrafficDetailRow(
  row,
  index
){

  const element =
    document.createElement(
      "div"
    );

  element.className =
    "percentage-ranking-row";


  const percentage =
    Number(
      row?.percentage
    );


  const safePercentage =
    Number.isFinite(percentage)
      ? Math.max(
          0,
          Math.min(
            100,
            percentage
          )
        )
      : 0;


  element.style.setProperty(
    "--bar-percent",
    `${safePercentage}%`
  );


  const bar =
    document.createElement(
      "span"
    );

  bar.className =
    "percentage-ranking-bar";


  const position =
    document.createElement(
      "span"
    );

  position.className =
    "percentage-ranking-position";

  position.textContent =
    String(index + 1);


  const name =
    document.createElement(
      "b"
    );

  name.textContent =
    row?.detail || "—";


  const value =
    document.createElement(
      "strong"
    );

  value.textContent =
    Number.isFinite(percentage)
      ? `${percentage.toFixed(1)}%`
      : "—";


  element.append(
    bar,
    position,
    name,
    value
  );


  return element;
}


function renderTrafficDetailList(
  container,
  rows
){

  if(!container){
    return;
  }


  container.innerHTML = "";


  const sorted =
    [...rows]
      .filter(row =>
        row &&
        row.detail
      )
      .sort(
        (a,b) =>
          Number(b.views || 0) -
          Number(a.views || 0)
      );


  if(!sorted.length){

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "traffic-detail-empty";

    empty.textContent =
      "データなし";

    container.appendChild(
      empty
    );

    return;
  }


  sorted.forEach(
    (row,index) => {

      container.appendChild(
        createTrafficDetailRow(
          row,
          index
        )
      );
    }
  );
}


function renderTrafficDetails(){

  const traffic =
    getSelectedVideoTraffic();


  /*
    HTML上では

    1個目 = 検索語
    2個目 = 外部サイト

    の順番。
  */

  const lists =
    document.querySelectorAll(
      "#individualMode .detail-two-column .percentage-ranking-list"
    );


  const searchContainer =
    lists[0];

  const externalContainer =
    lists[1];


  renderTrafficDetailList(
    searchContainer,
    traffic.searchTerms
  );


  renderTrafficDetailList(
    externalContainer,
    traffic.externalSites
  );
}

/* =========================================================
   COMPARE
========================================================= */

function renderCompareChart(
  metric = "dailyViews"
){

  const canvas =
    document.getElementById(
      "compareChart"
    );

  if(
    !canvas ||
    typeof Chart === "undefined"
  ){
    return;
  }


  destroyChart(
    "compare"
  );


  const showAverage =
    document
      .getElementById(
        "showAverageLine"
      )
      ?.checked || false;


  let labels =
    DUMMY.compare.dayLabels;

  let dataA;
  let dataB;
  let average;

  let percent = false;


  switch(metric){


    case "cumulativeViews":

      dataA =
        cumulative(
          DUMMY.compare.dailyViewsA
        );

      dataB =
        cumulative(
          DUMMY.compare.dailyViewsB
        );

      average =
        cumulative(
          DUMMY.compare.averageDailyViews
        );

      break;


    case "ctr":

      dataA =
        DUMMY.compare.ctrA;

      dataB =
        DUMMY.compare.ctrB;

      average =
        DUMMY.compare.averageCtr;

      percent = true;

      break;


    case "impressions":

      dataA =
        DUMMY.compare.impressionsA;

      dataB =
        DUMMY.compare.impressionsB;

      average =
        DUMMY.compare.averageImpressions;

      break;


    case "retention":

      /*
        COMPAREでは動画尺が違っても
        比較できるよう0～100%の進行率を使用。
      */
      labels =
        DUMMY.compare.retentionLabels;

      dataA =
        DUMMY.compare.retentionA;

      dataB =
        DUMMY.compare.retentionB;

      average =
        DUMMY.compare.averageRetention;

      percent = true;

      break;


    case "dailyViews":
    default:

      dataA =
        DUMMY.compare.dailyViewsA;

      dataB =
        DUMMY.compare.dailyViewsB;

      average =
        DUMMY.compare.averageDailyViews;

      break;
  }


  const datasets = [

    {
      label:"VIDEO A",

      data:dataA,

      borderColor:
        COLORS.chartYellow,

      backgroundColor:
        COLORS.chartYellow,

      pointBackgroundColor:
        COLORS.paper,

      pointBorderColor:
        COLORS.chartYellow,

      pointBorderWidth:2,

      pointRadius:4,

      pointHoverRadius:6,

      borderWidth:3,

      tension:.3
    },


{
  label:"VIDEO B",

  data:dataB,

  borderColor:
    COLORS.chartRed,

  backgroundColor:
    COLORS.chartRed,

  pointBackgroundColor:
    COLORS.paper,

  pointBorderColor:
    COLORS.chartRed,

  pointBorderWidth:3,

  pointRadius:4,

  pointHoverRadius:6,

  borderWidth:3,

  tension:.3
}
  ];


  if(showAverage){

    datasets.push(
      {
        label:"全動画平均",

        data:average,

        borderColor:
          COLORS.average,

        pointRadius:0,

        borderWidth:2,

        borderDash:[5,5],

        tension:.3
      }
    );
  }


  const options =
    lineChartOptions({
      percent,
      beginAtZero:
        metric !== "retention",
      showLegend:true
    });


  options.plugins.legend = {

    display:true,

    position:"top",

    align:"end",

    labels:{

      usePointStyle:true,

      pointStyle:"circle",

      boxWidth:8,

      boxHeight:8,

      padding:14,

      color:COLORS.ink,

      font:{
        size:
          window.innerWidth <= 800
            ? 8
            : 10,

        weight:"800"
      }
    }
  };


  if(metric === "retention"){

    options.scales.y.min = 0;
    options.scales.y.max = 100;

    /*
      Y軸＝視聴維持率
      X軸＝動画進行率
      両方%なので、X軸にも%ラベルをそのまま表示。
    */
    options.scales.x.ticks = {
      ...options.scales.x.ticks,
      autoSkip:false,
      maxRotation:0
    };
  }


  CHARTS.compare =
    new Chart(
      canvas,
      {

        type:"line",

        data:{
          labels,
          datasets
        },

        options
      }
    );
}


/* =========================================================
   MODE SWITCH
========================================================= */

function initModeSwitch(){

  document
    .querySelectorAll(
      ".analytics-mode-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const mode =
            button.dataset.mode;

          if(!mode){
            return;
          }

          setMode(mode);
        }
      );
    });
}


function setMode(mode){

  currentMode =
    mode;


  document
    .querySelectorAll(
      ".analytics-mode-btn"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.mode === mode
      );
    });


  document
    .querySelectorAll(
      ".analytics-mode"
    )
    .forEach(section => {

      section.classList.remove(
        "active"
      );
    });


  const target =
    document.getElementById(
      `${mode}Mode`
    );


  if(target){

    target.classList.add(
      "active"
    );
  }


  requestAnimationFrame(
    () => {

      Object.values(CHARTS)
        .forEach(chart => {

          chart?.resize();
        });
    }
  );


  try{

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "mode",
      mode
    );

    history.replaceState(
      null,
      "",
      url
    );

  }catch(error){
    /* no-op */
  }
}


/* =========================================================
   PERIOD BUTTONS
========================================================= */

function initPeriodButtons(){

  const buttons =
    document.querySelectorAll(
      ".period-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(item => {

          item.classList.remove(
            "active"
          );
        });


        button.classList.add(
          "active"
        );


     currentPeriod =
  button.dataset.period ||
  "all";

renderOverviewRealSummary();

renderOverviewPeriodChanges();

renderOverviewDailyChart(
  getActiveMetric(
    "overviewDaily"
  ) || "views"
);
      }
    );
  });
}


/* =========================================================
   CHART SWITCH
========================================================= */

function initChartSwitches(){

  document
    .querySelectorAll(
      "[data-chart-switch]"
    )
    .forEach(group => {

      const buttons =
        group.querySelectorAll(
          ".chart-switch-btn"
        );


      buttons.forEach(button => {

        button.addEventListener(
          "click",
          () => {

            buttons.forEach(item => {

              item.classList.remove(
                "active"
              );
            });


            button.classList.add(
              "active"
            );


            const groupName =
              group.dataset
                .chartSwitch;

            const metric =
              button.dataset.metric;


            switch(groupName){


              case "overviewDaily":

                renderOverviewDailyChart(
                  metric
                );

                break;


              case "individualViews":

                renderIndividualViewsChart(
                  metric
                );

                break;


              case "individualReach":

                renderIndividualReachChart(
                  metric
                );

                break;


              case "compare":

                renderCompareChart(
                  metric
                );

                break;
            }
          }
        );
      });
    });
}


function getActiveMetric(
  groupName
){

  return document
    .querySelector(
      `[data-chart-switch="${groupName}"] .chart-switch-btn.active`
    )
    ?.dataset.metric ||
    null;
}


/* =========================================================
   PERFORMANCE COMPACT MENUS
========================================================= */

function closeAllCompactMenus(
  except = null
){

  document
    .querySelectorAll(
      ".compact-menu-panel"
    )
    .forEach(panel => {

      if(panel !== except){
        panel.hidden = true;
      }
    });


  document
    .querySelectorAll(
      ".compact-menu-btn"
    )
    .forEach(button => {

      const panelId =
        button.id === "memberFilterButton"
          ? "memberFilterPanel"
          : "rankingMetricPanel";

      const panel =
        document.getElementById(
          panelId
        );

      button.setAttribute(
        "aria-expanded",
        panel && !panel.hidden
          ? "true"
          : "false"
      );
    });
}


/* =========================================================
   COMPACT MENUS
========================================================= */

function initCompactMenus(){

  const memberButton =
    document.getElementById(
      "memberFilterButton"
    );

  const memberPanel =
    document.getElementById(
      "memberFilterPanel"
    );

  const rankingButton =
    document.getElementById(
      "rankingMetricButton"
    );

  const rankingPanel =
    document.getElementById(
      "rankingMetricPanel"
    );


  function togglePanel(
    button,
    panel
  ){

    if(
      !button ||
      !panel
    ){
      return;
    }


    const willOpen =
      panel.hidden;


    closeAllCompactMenus(
      willOpen
        ? panel
        : null
    );


    panel.hidden =
      !willOpen;


    button.setAttribute(
      "aria-expanded",
      willOpen
        ? "true"
        : "false"
    );
  }


  memberButton?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      togglePanel(
        memberButton,
        memberPanel
      );
    }
  );


  rankingButton?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      togglePanel(
        rankingButton,
        rankingPanel
      );
    }
  );


  memberPanel
    ?.querySelectorAll(
      ".compact-menu-option"
    )
    .forEach(option => {

      option.addEventListener(
        "click",
        () => {

          memberPanel
            .querySelectorAll(
              ".compact-menu-option"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );
            });


          option.classList.add(
            "active"
          );


          const label =
            document.getElementById(
              "memberFilterLabel"
            );


if(label){

  label.textContent =
    option.dataset.member ||
    "すべて";
}


currentRankingMember =
  option.dataset.member ||
  "";

renderOverviewRanking();

closeAllCompactMenus();
        }
      );
    });


  rankingPanel
    ?.querySelectorAll(
      ".compact-menu-option"
    )
    .forEach(option => {

      option.addEventListener(
        "click",
        () => {

          rankingPanel
            .querySelectorAll(
              ".compact-menu-option"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );
            });


          option.classList.add(
            "active"
          );


          const label =
            document.getElementById(
              "rankingMetricLabel"
            );


          if(label){

            label.textContent =
              option.textContent
                .trim();
          }


         currentRankingMetric =
  option.dataset.rankingMetric ||
  "views";

renderOverviewRanking();

closeAllCompactMenus();
        }
      );
    });


  document.addEventListener(
    "click",
    event => {

      if(
        !event.target.closest(
          ".compact-menu"
        )
      ){

        closeAllCompactMenus();
      }
    }
  );
}
/* =========================================================
   VIDEO PICKER
========================================================= */

function initVideoPicker(){

  const modal =
    document.getElementById(
      "videoPickerModal"
    );

  const closeButton =
    document.getElementById(
      "videoPickerClose"
    );

  const search =
    document.getElementById(
      "videoPickerSearch"
    );

  if(!modal){
    return;
  }


  document
    .querySelectorAll(
      ".video-picker-trigger"
    )
    .forEach(trigger => {

      trigger.addEventListener(
        "click",
        () => {

          currentPickerTarget =
            trigger.dataset
              .pickerTarget ||
            null;


          modal.classList.add(
            "open"
          );

          modal.setAttribute(
            "aria-hidden",
            "false"
          );

          document.body.style
            .overflow =
            "hidden";


          if(search){

            search.value = "";

            filterVideoPicker(
              ""
            );
          }
        }
      );
    });


  function closePicker(){

    modal.classList.remove(
      "open"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style
      .overflow = "";

    currentPickerTarget =
      null;
  }


  closeButton?.addEventListener(
    "click",
    closePicker
  );


  modal.addEventListener(
    "click",
    event => {

      if(event.target === modal){

        closePicker();
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if(
        event.key === "Escape" &&
        modal.classList.contains(
          "open"
        )
      ){

        closePicker();
      }
    }
  );


  search?.addEventListener(
    "input",
    () => {

      filterVideoPicker(
        search.value
      );
    }
  );


modal.addEventListener(
  "click",
  event => {

    const item =
      event.target.closest(
        ".video-picker-item"
      );

    if(!item){
      return;
    }

    const id =
      item.dataset.videoId;

    const video =
      REAL_VIDEOS.find(
        videoItem =>
          videoItem.id === id
      );

    if(!video){
      return;
    }

    applyPickedVideo(
      currentPickerTarget,
      video
    );

    closePicker();
  }
);
}


/* =========================================================
   VIDEO PICKER FILTER
========================================================= */

function filterVideoPicker(
  query
){

  const normalized =
    String(query || "")
      .trim()
      .toLowerCase();


  document
    .querySelectorAll(
      ".video-picker-item"
    )
    .forEach(item => {

      const title =
        String(
          item.dataset.videoTitle ||
          item.textContent ||
          ""
        )
        .toLowerCase();


      item.hidden =
        normalized !== "" &&
        !title.includes(
          normalized
        );
    });
}


/* =========================================================
   PICKED VIDEO
========================================================= */

function applyPickedVideo(
  target,
  video
){

  if(target === "individual"){

    setIndividualVideo(
      video
    );

    return;
  }


  if(target === "compareA"){

    setCompareVideo(
      "A",
      video
    );

    return;
  }


  if(target === "compareB"){

    setCompareVideo(
      "B",
      video
    );
  }
}


/* =========================================================
   INDIVIDUAL VIDEO
========================================================= */

/* =========================================================
   INDIVIDUAL REAL METRICS
========================================================= */

function formatInteger(value){

  if(
    value === null ||
    value === undefined
  ){
    return "—";
  }

  return Number(value)
    .toLocaleString("ja-JP");
}


function formatPercent(value){

  if(
    value === null ||
    value === undefined
  ){
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}


function formatDuration(seconds){

  if(
    seconds === null ||
    seconds === undefined
  ){
    return "—";
  }

  const total =
    Math.round(Number(seconds));

  const minutes =
    Math.floor(total / 60);

  const remain =
    total % 60;

  return `${minutes}:${String(remain).padStart(2,"0")}`;
}


function formatWatchHours(minutes){

  if(
    minutes === null ||
    minutes === undefined
  ){
    return "—";
  }

  const hours =
    Number(minutes) / 60;

  if(hours >= 100){
    return Math.round(hours)
      .toLocaleString("ja-JP");
  }

  return hours
    .toFixed(1)
    .replace(/\.0$/,"");
}


/*
  ラベル名からカードを取得
*/
function findMetricCard(
  selector,
  label
){

  return [
    ...document.querySelectorAll(
      selector
    )
  ].find(card => {

    const name =
      card.querySelector(
        ".metric-name, span"
      );

    return (
      name &&
      name.textContent
        .trim() === label
    );
  });
}


/*
  上部6カード
*/
function updateMainIndividualMetric(
  label,
  value
){

  const card =
    findMetricCard(
      "#individualMode .individual-metric-grid .metric-card",
      label
    );

  if(!card){
    return;
  }

  const element =
    card.querySelector(
      ".metric-value"
    );

  if(element){
    element.textContent =
      value;
  }
}


/*
  mini metric
*/
function updateIndividualMiniMetric(
  label,
  value
){

  const cards =
    document.querySelectorAll(
      "#individualMode .mini-metric"
    );

  for(const card of cards){

    const name =
      card.querySelector("span");

    if(
      !name ||
      name.textContent
        .trim() !== label
    ){
      continue;
    }

    const strong =
      card.querySelector(
        "strong"
      );

    if(strong){
      strong.textContent =
        value;
    }

    return;
  }
}


/*
  DAY1 / DAY3 / DAY7
*/
function updateVelocityCard(
  day,
  milestone
){

  const cards =
    document.querySelectorAll(
      "#individualMode .velocity-card"
    );

  const card =
    [...cards].find(item => {

      const label =
        item.querySelector("span");

      return (
        label &&
        label.textContent
          .trim() === `DAY ${day}`
      );
    });


  if(!card){
    return;
  }


  const strong =
    card.querySelector(
      "strong"
    );


  if(strong){

    strong.textContent =
      milestone
        ? formatInteger(
            milestone.views
          )
        : "—";
  }
}


/*
  DAY1→DAY3 / DAY3→DAY7 の増加
*/
function updateVelocityIncrease(
  index,
  from,
  to
){

  const connectors =
    document.querySelectorAll(
      "#individualMode .velocity-connector"
    );

  const connector =
    connectors[index];

  if(!connector){
    return;
  }

  const strong =
    connector.querySelector(
      ".velocity-increase strong"
    );

  if(!strong){
    return;
  }


  if(
    !from ||
    !to
  ){
    strong.textContent = "—";
    return;
  }


  if(
    from.views === null ||
    from.views === undefined ||
    to.views === null ||
    to.views === undefined
  ){
    strong.textContent = "—";
    return;
  }


  const fromViews =
    Number(from.views);

  const toViews =
    Number(to.views);


  if(
    !Number.isFinite(fromViews) ||
    !Number.isFinite(toViews)
  ){
    strong.textContent = "—";
    return;
  }


  const increase =
    toViews -
    fromViews;


  strong.textContent =
    `${increase >= 0 ? "+" : ""}${increase.toLocaleString("ja-JP")}`;
}

/* =========================================================
   INDIVIDUAL AVERAGE / RANK
========================================================= */

/*
  動画から比較用の指標値を取得
*/
function getIndividualMetricValue(
  video,
  metric
){

  const summary =
    video?.analytics?.summary || {};


  switch(metric){

　　case "views":
  　　return (
   　　 summary.views !== null &&
   　　 summary.views !== undefined &&
   　　 Number.isFinite(Number(summary.views))
 　　 )
    　　? Number(summary.views)
    　　: null;


　　case "engagedViews":
  　　return (
   　　 summary.engagedViews !== null &&
   　　 summary.engagedViews !== undefined &&
  　　  Number.isFinite(Number(summary.engagedViews))
　　  )
  　　  ? Number(summary.engagedViews)
  　　  : null;


　　case "watchMinutes":
 　　 return (
   　　 summary.watchMinutes !== null &&
　　    summary.watchMinutes !== undefined &&
   　　 Number.isFinite(Number(summary.watchMinutes))
　　  )
　　    ? Number(summary.watchMinutes)
   　　 : null;


　　case "averageViewDuration":
 　　 return (
    　　summary.averageViewDuration !== null &&
    　　summary.averageViewDuration !== undefined &&
  　　  Number.isFinite(Number(summary.averageViewDuration))
　　  )
  　　  ? Number(summary.averageViewDuration)
    　　: null;


　　case "averageViewPercentage":
  　　return (
   　　 summary.averageViewPercentage !== null &&
   　　 summary.averageViewPercentage !== undefined &&
 　　   Number.isFinite(Number(summary.averageViewPercentage))
 　　 )
  　　  ? Number(summary.averageViewPercentage)
   　　 : null;


 　　case "subscribersGained":
  　　 return (
 　　    summary.subscribersGained !== null &&
 　　    summary.subscribersGained !== undefined &&
 　　    Number.isFinite(Number(summary.subscribersGained))
 　  )
 　　    ? Number(summary.subscribersGained)
   　　   : null;


    case "impressions": {

      const reach =
        getVideoReachSummary(
          video?.id
        );

      return (
        reach &&
        reach.impressions !== null &&
        reach.impressions !== undefined &&
        Number.isFinite(
          Number(reach.impressions)
        )
      )
        ? Number(reach.impressions)
        : null;
    }


    case "ctr": {

      const reach =
        getVideoReachSummary(
          video?.id
        );

      return (
        reach &&
        reach.clickRate !== null &&
        reach.clickRate !== undefined &&
        Number.isFinite(
          Number(reach.clickRate)
        )
      )
        ? Number(reach.clickRate)
        : null;
    }


    default:
      return null;
  }
}


/*
  全動画平均を計算
*/
function getIndividualMetricAverage(
  metric
){

  const values =
    REAL_VIDEOS
      .map(video =>
        getIndividualMetricValue(
          video,
          metric
        )
      )
      .filter(value =>
        value !== null &&
        Number.isFinite(value)
      );


  if(!values.length){
    return null;
  }


  return (
    values.reduce(
      (sum,value) =>
        sum + value,
      0
    ) /
    values.length
  );
}


/*
  選択動画の順位を計算

  大きい数字ほど上位。
  同値の場合は同順位。
*/
function getIndividualMetricRank(
  video,
  metric
){

  const selectedValue =
    getIndividualMetricValue(
      video,
      metric
    );


  if(selectedValue === null){
    return null;
  }


  const values =
    REAL_VIDEOS
      .map(item =>
        getIndividualMetricValue(
          item,
          metric
        )
      )
      .filter(value =>
        value !== null &&
        Number.isFinite(value)
      );


  if(!values.length){
    return null;
  }


  const rank =
    1 +
    values.filter(
      value =>
        value > selectedValue
    ).length;


  return {
    rank,
    total:values.length
  };
}

/*
  INDIVIDUAL上部カードの
  全動画平均・順位を更新
*/
function updateIndividualAverageRank(
  label,
  metric,
  formatter
){

  const video =
    getSelectedIndividualVideo();

  if(!video){
    return;
  }


  const card =
    findMetricCard(
      "#individualMode .individual-metric-grid .metric-card",
      label
    );

  if(!card){
    return;
  }


  const average =
    getIndividualMetricAverage(
      metric
    );

  const rank =
    getIndividualMetricRank(
      video,
      metric
    );


  /*
    カード内の
    「全動画平均」
  */
 const averageElement =
  card.querySelector(
    ".metric-average, .metric-context-average, [data-role='average']"
  );

  if(averageElement){

    averageElement.textContent =
      average === null
        ? "全動画平均 —"
        : `全動画平均 ${formatter(
            average
          )}`;
  }


  /*
    カード内の
    「○位 / ○本」
  */
  const rankElement =
  card.querySelector(
    ".metric-rank, .metric-context-rank, [data-role='rank']"
  );

  if(rankElement){

    rankElement.textContent =
      rank
        ? `${rank.rank}位 / ${rank.total}本`
        : "—";
  }
}


/*
  選択動画の上部カードについて
  平均・順位をまとめて更新
*/
function renderIndividualAverageRanks(){

  updateIndividualAverageRank(
    "再生数",
    "views",
    value =>
      formatInteger(
        Math.round(value)
      )
  );


  updateIndividualAverageRank(
    "Engaged Views",
    "engagedViews",
    value =>
      formatInteger(
        Math.round(value)
      )
  );


  updateIndividualAverageRank(
    "平均再生率",
    "averageViewPercentage",
    value =>
      formatPercent(value)
  );


  updateIndividualAverageRank(
    "平均再生時間",
    "averageViewDuration",
    value =>
      formatDuration(value)
  );


  updateIndividualAverageRank(
    "総再生時間",
    "watchMinutes",
    value =>
      `${formatWatchHours(value)}時間`
  );

  updateIndividualAverageRank(
    "クリック率",
    "ctr",
    value =>
      `${Number(value).toFixed(2)}%`
  );

}

/* =========================================================
   INDIVIDUAL VELOCITY AVERAGE / RANK
========================================================= */

/*
  指定DAYのmilestone値を取得
*/
function getVelocityMetricValue(
  video,
  day
){

  const milestone =
    video?.analytics
      ?.milestones
      ?.[`day${day}`];

  if(
    !milestone ||
    milestone.views === null ||
    milestone.views === undefined
  ){
    return null;
  }


  const value =
    Number(
      milestone.views
    );


  return Number.isFinite(value)
    ? value
    : null;
}


/*
  DAY1 / DAY3 / DAY7の
  全動画平均・順位を取得
*/
function getVelocityAverageRank(
  selectedVideo,
  day
){

  const selectedValue =
    getVelocityMetricValue(
      selectedVideo,
      day
    );


  const values =
    REAL_VIDEOS
      .map(video =>
        getVelocityMetricValue(
          video,
          day
        )
      )
      .filter(value =>
        value !== null &&
        Number.isFinite(value)
      );


  if(
    selectedValue === null ||
    !values.length
  ){

    return {
      average:null,
      rank:null,
      total:values.length
    };
  }


  const average =
    values.reduce(
      (sum,value) =>
        sum + value,
      0
    ) /
    values.length;


  const rank =
    1 +
    values.filter(
      value =>
        value > selectedValue
    ).length;


  return {
    average,
    rank,
    total:values.length
  };
}


/*
  DAYカードの平均・順位表示
*/
function renderVelocityAverageRanks(){

  const video =
    getSelectedIndividualVideo();

  if(!video){
    return;
  }


  const cards =
    document.querySelectorAll(
      "#individualMode .velocity-card"
    );


  [1,3,7].forEach(day => {

    const card =
      [...cards].find(item => {

        const label =
          item.querySelector(
            "span"
          );

        return (
          label &&
          label.textContent
            .trim() === `DAY ${day}`
        );
      });


    if(!card){
      return;
    }


    const result =
      getVelocityAverageRank(
        video,
        day
      );


    /*
      全動画平均
    */
    const averageElement =
      card.querySelector(
        ".velocity-average"
      );


    if(averageElement){

      averageElement.textContent =
        result.average === null
          ? "全動画平均 —"
          : `全動画平均 ${formatInteger(
              Math.round(
                result.average
              )
            )}`;
    }


    /*
      順位
    */
    const rankElement =
      card.querySelector(
        ".velocity-rank"
      );


    if(rankElement){

      rankElement.textContent =
        result.rank === null
          ? "—"
          : `${result.rank}位 / ${result.total}本`;
    }

  });
}
/* =========================================================
   INDIVIDUAL DETAIL AVERAGE / RANK
========================================================= */

/*
  mini-metric の
  平均・順位を更新
*/
function updateIndividualMiniAverageRank(
  label,
  metric,
  formatter
){

  const video =
    getSelectedIndividualVideo();

  if(!video){
    return;
  }


  const cards =
    document.querySelectorAll(
      "#individualMode .mini-metric"
    );


  const card =
    [...cards].find(item => {

      const name =
        item.querySelector("span");

      return (
        name &&
        name.textContent
          .trim() === label
      );
    });


  if(!card){
    return;
  }


  const average =
    getIndividualMetricAverage(
      metric
    );

  const rank =
    getIndividualMetricRank(
      video,
      metric
    );


  /*
    平均
  */
  const averageElement =
    card.querySelector(
      ".mini-metric-average, .metric-average"
    );


  if(averageElement){

    averageElement.textContent =
      average === null
        ? "全動画平均 —"
        : `全動画平均 ${formatter(
            average
          )}`;
  }


  /*
    順位
  */
  const rankElement =
    card.querySelector(
      ".mini-metric-rank, .metric-rank"
    );


  if(rankElement){

    rankElement.textContent =
      rank
        ? `${rank.rank}位 / ${rank.total}本`
        : "—";
  }
}


  /*
    WATCH PERFORMANCE
    ENGAGEMENT
    REACH
    の平均・順位をまとめて更新
  */
function renderIndividualDetailAverageRanks(){

  /*
    REACH
  */

  const reachCards =
    document.querySelectorAll(
      "#individualMode .reach-summary .mini-metric"
    );


  [
    {
      label:"インプレッション",
      metric:"impressions",
      formatter:value =>
        formatInteger(
          Math.round(value)
        )
    },
    {
      label:"クリック率",
      metric:"ctr",
      formatter:value =>
        `${Number(value).toFixed(2)}%`
    }
  ].forEach(config => {

    const card =
      [...reachCards].find(item =>
        item.querySelector("span")
          ?.textContent.trim() ===
        config.label
      );

    if(!card){
      return;
    }


    const average =
      getIndividualMetricAverage(
        config.metric
      );

    const rank =
      getIndividualMetricRank(
        getSelectedIndividualVideo(),
        config.metric
      );


    const small =
      card.querySelector("small");

    if(!small){
      return;
    }


    const averageText =
      average === null
        ? "平均 —"
        : `平均 ${config.formatter(
            average
          )}`;


    const rankText =
      rank
        ? `${rank.rank}位 / ${rank.total}本`
        : "—";


    small.textContent =
      `${averageText} ・ ${rankText}`;

  });


  /*
    WATCH PERFORMANCE
  */

  updateIndividualMiniAverageRank(
    "総再生時間",
    "watchMinutes",
    value =>
      `${formatWatchHours(value)}時間`
  );


  updateIndividualMiniAverageRank(
    "平均再生時間",
    "averageViewDuration",
    value =>
      formatDuration(value)
  );


  updateIndividualMiniAverageRank(
    "平均再生率",
    "averageViewPercentage",
    value =>
      formatPercent(value)
  );


  /*
    ENGAGEMENT
  */

  updateIndividualMiniAverageRank(
    "高評価数",
    "likes",
    value =>
      formatInteger(
        Math.round(value)
      )
  );
   
  updateIndividualMiniAverageRank(
    "高評価率",
    "likeRate",
    value =>
      `${Number(value).toFixed(2)}%`
  );


  updateIndividualMiniAverageRank(
    "コメント数",
    "comments",
    value =>
      formatInteger(
        Math.round(value)
      )
  );


  updateIndividualMiniAverageRank(
    "登録者獲得",
    "subscribersGained",
    value => {

      const rounded =
        Math.round(value);

      return rounded > 0
        ? `+${formatInteger(rounded)}`
        : formatInteger(rounded);
    }
  );




}

/*
  選択動画の実データを画面へ反映
*/
function renderIndividualRealMetrics(){

  const video =
    getSelectedIndividualVideo();

  if(
    !video ||
    !video.analytics
  ){
    return;
  }


  const summary =
    video.analytics.summary || {};

　const dataApi =
    video.dataApi || {};

  const reachSummary =
    getVideoReachSummary(
      video.id
    );


  const reachCards =
    document.querySelectorAll(
      "#individualMode .reach-summary .mini-metric"
    );

  reachCards.forEach(card => {

    const label =
      card.querySelector("span")
        ?.textContent.trim();

    const strong =
      card.querySelector("strong");


    if(!strong){
      return;
    }


    if(label === "インプレッション"){

      strong.textContent =
        reachSummary &&
        reachSummary.impressions !== null &&
        reachSummary.impressions !== undefined
          ? formatInteger(
              reachSummary.impressions
            )
          : "—";

    }


    if(label === "クリック率"){

      strong.textContent =
        reachSummary &&
        reachSummary.clickRate !== null &&
        reachSummary.clickRate !== undefined &&
        Number.isFinite(
          Number(reachSummary.clickRate)
        )
          ? `${Number(
              reachSummary.clickRate
            ).toFixed(2)}%`
          : "—";

    }

  });


  const milestones =
    video.analytics.milestones || {};


  /*
    上6カード
  */

  updateMainIndividualMetric(
    "再生数",
    dataApi.viewCount === null ||
    dataApi.viewCount === undefined
      ? "—"
      : formatInteger(
          dataApi.viewCount
        )
  );
   
  updateMainIndividualMetric(
    "クリック率",
    reachSummary &&
    Number.isFinite(
      reachSummary.clickRate
    )
      ? `${reachSummary.clickRate.toFixed(2)}%`
      : "—"
  );

  updateMainIndividualMetric(
    "Engaged Views",
    formatInteger(
      summary.engagedViews
    )
  );

  updateMainIndividualMetric(
    "平均再生率",
    formatPercent(
      summary.averageViewPercentage
    )
  );

  updateMainIndividualMetric(
    "平均再生時間",
    formatDuration(
      summary.averageViewDuration
    )
  );

  updateMainIndividualMetric(
    "総再生時間",
    formatWatchHours(
      summary.watchMinutes
    )
  );


  /*
    初速
  */

  const day1 =
    milestones.day1 || null;

  const day3 =
    milestones.day3 || null;

  const day7 =
    milestones.day7 || null;


  updateVelocityCard(
    1,
    day1
  );

  updateVelocityCard(
    3,
    day3
  );

  updateVelocityCard(
    7,
    day7
  );


  updateVelocityIncrease(
    0,
    day1,
    day3
  );

  updateVelocityIncrease(
    1,
    day3,
    day7
  );


  /*
    WATCH PERFORMANCE
  */

  updateIndividualMiniMetric(
    "総再生時間",
    summary.watchMinutes === null ||
    summary.watchMinutes === undefined
      ? "—"
      : `${formatWatchHours(
          summary.watchMinutes
        )}時間`
  );

  updateIndividualMiniMetric(
    "平均再生時間",
    formatDuration(
      summary.averageViewDuration
    )
  );

  updateIndividualMiniMetric(
    "平均再生率",
    formatPercent(
      summary.averageViewPercentage
    )
  );


  /*
    平均再生時間マーカー
  */

  /*
    平均再生時間マーカー
  */

  const retentionMarker =
    document.getElementById(
      "retentionAverageTimeMarker"
    );

  const retentionMarkerValue =
    retentionMarker?.querySelector(
      "strong"
    );

  const averageViewDuration =
    (
      summary.averageViewDuration !== null &&
      summary.averageViewDuration !== undefined
    )
      ? Number(
          summary.averageViewDuration
        )
      : null;

  const durationSeconds =
    Number(
      video?.analytics?.duration ||
      video?.dataApi?.durationSeconds ||
      0
    );

  if(retentionMarkerValue){

    retentionMarkerValue.textContent =
      Number.isFinite(
        averageViewDuration
      )
        ? formatDuration(
            averageViewDuration
          )
        : "—";
  }


  if(retentionMarker){

    let averagePosition =
      (
        summary.averageViewPercentage !== null &&
        summary.averageViewPercentage !== undefined
      )
        ? Number(
            summary.averageViewPercentage
          )
        : null;

    /*
      平均再生率が取れない場合だけ、
      平均再生時間 ÷ 動画尺で計算
    */
    if(
      !Number.isFinite(
        averagePosition
      ) &&
      Number.isFinite(
        averageViewDuration
      ) &&
      Number.isFinite(
        durationSeconds
      ) &&
      durationSeconds > 0
    ){

      averagePosition =
        (
          averageViewDuration /
          durationSeconds
        ) * 100;
    }


    if(
      Number.isFinite(
        averagePosition
      )
    ){

      averagePosition =
        Math.max(
          0,
          Math.min(
            100,
            averagePosition
          )
        );

      retentionMarker.style.left =
        `${averagePosition}%`;

      retentionMarker.style.display =
        "";

    }else{

      retentionMarker.style.display =
        "none";
    }
  }


  /*
    ENGAGEMENT

    高評価率は現データだけでは
    正しく算出できないのでまだ触らない。

    終了画面もReporting API待ち。
  */

  updateIndividualMiniMetric(
    "高評価数",
    dataApi.likeCount === null ||
    dataApi.likeCount === undefined
      ? "—"
      : formatInteger(
          dataApi.likeCount
        )
  );

     const likeRate =
    getIndividualMetricValue(
      video,
      "likeRate"
    );

  updateIndividualMiniMetric(
    "高評価率",
    likeRate === null
      ? "—"
      : `${likeRate.toFixed(2)}%`
  );

  updateIndividualMiniMetric(
    "コメント数",
    dataApi.commentCount === null ||
    dataApi.commentCount === undefined
      ? "—"
      : formatInteger(
          dataApi.commentCount
        )
  );

  updateIndividualMiniMetric(
    "登録者獲得",
    summary.subscribersGained === null ||
    summary.subscribersGained === undefined
      ? "—"
      : `+${Number(
          summary.subscribersGained
        ).toLocaleString("ja-JP")}`
  );



     /*
    全動画平均・順位
  */
 renderIndividualAverageRanks();
 renderVelocityAverageRanks();
 renderIndividualDetailAverageRanks();
}

function setIndividualVideo(
  video
){

  selectedIndividualVideoId =
    video.id;

  currentReachWindow =
    "first14";

  currentReachStart = 0;

  updateReachWindowButtons();

  renderIndividualRealMetrics();

  const title =
    document.getElementById(
      "individualSelectedTitle"
    );

  const date =
    document.getElementById(
      "individualSelectedDate"
    );

  const thumb =
    document.querySelector(
      "#individualVideoPickerTrigger .individual-video-thumb"
    );


  if(title){

    title.textContent =
      video.title;
  }


  if(date){

    date.textContent =
      formatPublishedAtJP(
        video.publishedAt
      );
  }


  if(thumb){

    if(video.thumbnail){

      thumb.src =
        video.thumbnail;

      thumb.style.visibility =
        "visible";

    }else{

      /*
        API接続後は通常サムネあり。
        ダミー動画に画像がない場合は
        既存画像を壊さない。
      */
    }
  }


  /*
    ダミー段階では全動画で
    同じAnalytics値を表示。
  */

  renderIndividualViewsChart(
    getActiveMetric(
      "individualViews"
    ) || "views"
  );

  renderRetentionChart();

  renderIndividualReachChart(
    getActiveMetric(
      "individualReach"
    ) || "impressions"
  );

　renderTrafficSourceChart();
　renderTrafficDetails();
  renderIndividualShares();
}


/* =========================================================
   COMPARE VIDEO
========================================================= */

function setCompareVideo(
  side,
  video
){

  const title =
    document.getElementById(
      `compareVideo${side}Title`
    );

  const date =
    document.getElementById(
      `compareVideo${side}Date`
    );


  if(title){

    title.textContent =
      video.shortTitle ||
      video.title;
  }


  if(date){

    date.textContent =
      formatPublishedAtJP(
        video.publishedAt
      );
  }


  const card =
    document.getElementById(
      `compareVideo${side}Trigger`
    );


  if(card){

    const existingImage =
      card.querySelector(
        ".compare-video-thumb"
      );

    const placeholder =
      card.querySelector(
        ".compare-thumb-placeholder"
      );


    if(video.thumbnail){

      if(existingImage){

        existingImage.src =
          video.thumbnail;

      }else{

        const img =
          document.createElement(
            "img"
          );

        img.className =
          "compare-video-thumb";

        img.src =
          video.thumbnail;

        img.alt = "";


        placeholder?.replaceWith(
          img
        );
      }

    }else{

      if(existingImage){

        const replacement =
          document.createElement(
            "div"
          );

        replacement.className =
          "compare-thumb-placeholder";

        replacement.textContent =
          `VIDEO ${side}`;

        existingImage.replaceWith(
          replacement
        );
      }
    }
  }


  renderCompareChart(
    getActiveMetric(
      "compare"
    ) || "dailyViews"
  );
}


/* =========================================================
   REACH WINDOW BUTTON
========================================================= */

function initReachWindowButtons(){

  const buttons =
    document.querySelectorAll(
      ".reach-window-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(item => {

          item.classList.remove(
            "active"
          );
        });


        button.classList.add(
          "active"
        );


        currentReachWindow =
          button.dataset
            .reachWindow ||
          "first14";


        if(
          currentReachWindow ===
          "first14"
        ){

          currentReachStart = 0;

        }else{

          currentReachStart =
            Math.max(
              0,
              getSelectedVideoReachData()
                .length -
              14
            );
        }


        renderIndividualReachChart(
          getActiveMetric(
            "individualReach"
          ) ||
          "impressions"
        );
      }
    );
  });
}


/* =========================================================
   REACH ARROWS
========================================================= */

function initReachNavigation(){

  const prev =
    document.getElementById(
      "reachScrollPrev"
    );

  const next =
    document.getElementById(
      "reachScrollNext"
    );


  prev?.addEventListener(
    "click",
    () => {

      currentReachWindow =
        "custom";


      currentReachStart =
        Math.max(
          0,
          currentReachStart - 14
        );


      updateReachWindowButtons();


      renderIndividualReachChart(
        getActiveMetric(
          "individualReach"
        ) ||
        "impressions"
      );
    }
  );


  next?.addEventListener(
    "click",
    () => {

      currentReachWindow =
        "custom";


      const maxStart =
        Math.max(
          0,
          getSelectedVideoReachData()
            .length -
          14
        );


      currentReachStart =
        Math.min(
          maxStart,
          currentReachStart + 14
        );


      updateReachWindowButtons();


      renderIndividualReachChart(
        getActiveMetric(
          "individualReach"
        ) ||
        "impressions"
      );
    }
  );
}


/* =========================================================
   REACH WINDOW ACTIVE BUTTON
========================================================= */

function updateReachWindowButtons(){

  const buttons =
    document.querySelectorAll(
      ".reach-window-btn"
    );


  buttons.forEach(button => {

    button.classList.remove(
      "active"
    );
  });


  if(currentReachStart === 0){

    document
      .querySelector(
        '[data-reach-window="first14"]'
      )
      ?.classList.add(
        "active"
      );

    return;
  }


  const maxStart =
    Math.max(
      0,
      DUMMY.individual
        .reachLabels
        .length -
      14
    );


  if(
    currentReachStart ===
    maxStart
  ){

    document
      .querySelector(
        '[data-reach-window="current"]'
      )
      ?.classList.add(
        "active"
      );
  }
}


/* =========================================================
   COMPARE AVERAGE
========================================================= */

function initAverageToggle(){

  const checkbox =
    document.getElementById(
      "showAverageLine"
    );


  if(!checkbox){
    return;
  }


  /*
    初期状態はON。
    HTMLにもcheckedを付けているが、
    JS側でも念のため揃える。
  */
  checkbox.checked = true;


  checkbox.addEventListener(
    "change",
    () => {

      renderCompareChart(
        getActiveMetric(
          "compare"
        ) ||
        "dailyViews"
      );
    }
  );
}


/* =========================================================
   OUTSIDE TOOLTIP DISMISS
========================================================= */

function initOutsideTooltipDismiss(){

  document.addEventListener(
    "pointerdown",
    event => {

      if(
        event.target.closest?.(
          "canvas"
        )
      ){
        return;
      }


      Object.values(CHARTS)
        .forEach(chart => {

          if(!chart){
            return;
          }


          try{

            chart.setActiveElements(
              []
            );


            if(chart.tooltip){

              chart.tooltip
                .setActiveElements(
                  [],
                  {x:0,y:0}
                );
            }


            chart.update(
              "none"
            );

          }catch(error){

            /* no-op */
          }
        });
    }
  );
}


/* =========================================================
   URL MODE
========================================================= */

function applyModeFromUrl(){

  try{

    const params =
      new URLSearchParams(
        window.location.search
      );


    const mode =
      params.get(
        "mode"
      );


    if(
      mode === "overview" ||
      mode === "individual" ||
      mode === "compare"
    ){

      setMode(
        mode
      );
    }

  }catch(error){

    /* no-op */
  }
}


/* =========================================================
   RESIZE
========================================================= */

let resizeTimer = null;


function initResizeHandler(){

  window.addEventListener(
    "resize",
    () => {

      clearTimeout(
        resizeTimer
      );


      resizeTimer =
        setTimeout(
          () => {

            Object
              .values(CHARTS)
              .forEach(chart => {

                chart?.resize();
              });

          },
          120
        );
    }
  );
}


/* =========================================================
   INITIAL VIDEO DISPLAY
========================================================= */

function renderInitialVideoSelections(){

  const individualVideo =
  REAL_VIDEOS[0];

const compareVideoA =
  REAL_VIDEOS[0];

const compareVideoB =
  REAL_VIDEOS[1];


  if(individualVideo){

    const individualDate =
      document.getElementById(
        "individualSelectedDate"
      );

    if(individualDate){

      individualDate.textContent =
        formatPublishedAtJP(
          individualVideo.publishedAt
        );
    }
  }


  if(compareVideoA){

    const dateA =
      document.getElementById(
        "compareVideoADate"
      );

    if(dateA){

      dateA.textContent =
        formatPublishedAtJP(
          compareVideoA.publishedAt
        );
    }
  }


  if(compareVideoB){

    const dateB =
      document.getElementById(
        "compareVideoBDate"
      );

    if(dateB){

      dateB.textContent =
        formatPublishedAtJP(
          compareVideoB.publishedAt
        );
    }
  }
     selectedIndividualVideoId =
    individualVideo?.id ||
    null;

  selectedCompareVideoAId =
    compareVideoA?.id ||
    null;

  selectedCompareVideoBId =
    compareVideoB?.id ||
    null;
}


/* =========================================================
   INITIAL CHARTS
========================================================= */

function renderInitialCharts(){

  renderOverviewDailyChart(
    "views"
  );

  renderIndividualViewsChart(
    "views"
  );

  renderRetentionChart();

  renderIndividualReachChart(
    "impressions"
  );

　renderTrafficSourceChart();
　renderTrafficDetails();

  renderCompareChart(
    "dailyViews"
  );
}


/* =========================================================
   INIT
========================================================= */

async function init(){

await loadAnalyticsData();

await loadRootVideoData();

await loadReachData();

buildRealVideoPicker();

renderOverviewRealSummary();

renderOverviewPeriodChanges();

renderOverviewRanking();

  renderHeader();

  setupChartDefaults();

  renderInitialVideoSelections();
   renderIndividualRealMetrics();


  /*
    UIイベントを先に登録。
    Chartエラーが起きても
    ページ切替などが死なないようにする。
  */

  initModeSwitch();

  initPeriodButtons();

  initChartSwitches();

  initCompactMenus();

  initVideoPicker();

  initReachWindowButtons();

  initReachNavigation();

  initAverageToggle();

  initOutsideTooltipDismiss();

  initResizeHandler();


  /*
    グラフは最後。
  */

  try{

    renderInitialCharts();

  }catch(error){

    console.error(
      "Analytics chart error:",
      error
    );
  }


  applyModeFromUrl();
}


if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

}else{

  init();
}
