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

let REAL_VIDEOS = [];

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
            data.publishedDate ||
            "",

          publishedAt:
            data.publishedDate
              ? `${data.publishedDate}T00:00:00+09:00`
              : null,

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
          return Number(
            row.engagedViews || 0
          );
        }

        return Number(
          row.views || 0
        );

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

  const number = Number(value || 0);

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

function getOverviewSeries(metric){

  const source =
    DUMMY.overview;


  let values;
  let average;
  let percent = false;


  switch(metric){

    case "engaged":

      values =
        cumulative(source.engaged);

      average =
        cumulative(source.averageEngaged);

      break;


    case "impressions":

      values =
        [...source.impressions];

      average =
        [...source.averageImpressions];

      break;


    case "ctr":

      values =
        [...source.ctr];

      average =
        [...source.averageCtr];

      percent = true;

      break;


    case "views":
    default:

      values =
        cumulative(source.views);

      average =
        cumulative(source.averageViews);

      break;
  }


  let count =
    currentPeriod;


  if(currentPeriod !== "all"){

    count =
      Math.min(
        Number(currentPeriod),
        source.labels.length
      );
  }


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
        video.publishedDate
      ){

        const current =
          new Date(
            `${row.date}T00:00:00Z`
          );

        const published =
          new Date(
            `${video.publishedDate}T00:00:00Z`
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

      if(engaged){
        return Number(
          row.engagedViews ?? 0
        );
      }

      return Number(
        row.views ?? 0
      );
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


  CHARTS.retention =
    new Chart(
      canvas,
      {

        type:"line",

        data:{

          labels:
            DUMMY.individual
              .retentionLabels,

          datasets:[

            {
              label:"この動画",

              data:
                DUMMY.individual
                  .retention,

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

              tension:.36
            },


            {
              label:"全動画平均",

              data:
                DUMMY.individual
                  .averageRetention,

              borderColor:
                COLORS.average,

              pointRadius:0,

              borderWidth:2,

              borderDash:[5,5],

              tension:.36
            }

          ]
        },


        options:{

          ...lineChartOptions({
            percent:true
          }),

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
                label(context){
                  return `${context.dataset.label}: ${context.parsed.y}%`;
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

  const total =
    DUMMY.individual
      .reachLabels.length;

  if(currentReachWindow === "current"){

    currentReachStart =
      Math.max(
        0,
        total - 14
      );
  }


  const start =
    Math.max(
      0,
      Math.min(
        currentReachStart,
        total - 14
      )
    );


  const end =
    Math.min(
      total,
      start + 14
    );


  return {
    start,
    end,

    labels:
      DUMMY.individual
        .reachLabels
        .slice(start,end),

    impressions:
      DUMMY.individual
        .impressions
        .slice(start,end),

    ctr:
      DUMMY.individual
        .ctr
        .slice(start,end)
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

  label.textContent =
    `DAY ${slice.start + 1} – DAY ${slice.end}`;
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
  const fixedYMax =
    isCtr
      ? Math.ceil(
          Math.max(
            ...DUMMY.individual.ctr
          )
        )
      : Math.ceil(
          Math.max(
            ...DUMMY.individual.impressions
          ) / 5000
        ) * 5000;


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
    "trafficSource"
  );


  CHARTS.trafficSource =
    new Chart(
      canvas,
      {

        type:"bar",

        plugins:[
          trafficValuePlugin
        ],

        data:{

          labels:
            DUMMY.individual
              .trafficLabels,

          datasets:[
            {
              data:
                DUMMY.individual
                  .traffic,

              backgroundColor:
                COLORS.chartYellowAlt,

              borderColor:
                COLORS.chartYellow,

              borderWidth:2,

              borderRadius:8,

              barThickness:
                window.innerWidth <= 800
                  ? 18
                  : 25
            }
          ]
        },


        options:{

          indexAxis:"y",

          responsive:true,

          maintainAspectRatio:false,

          layout:{
            padding:{
              right:45
            }
          },

          plugins:{

            legend:{
              display:false
            },

            tooltip:{

              backgroundColor:"#111",

              displayColors:false,

              callbacks:{
                label(context){
                  return `${context.parsed.x}%`;
                }
              }
            }
          },


          scales:{

            x:{

              beginAtZero:true,

              suggestedMax:55,

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

                color:COLORS.ink,

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 8
                      : 10,

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


          /*
            ダミー段階では値の入れ替えは未実装。
            API接続後に実データでソートする。
          */

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


  const increase =
    Number(to.views || 0) -
    Number(from.views || 0);


  strong.textContent =
    `+${increase.toLocaleString("ja-JP")}`;
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


  const milestones =
    video.analytics.milestones || {};


  /*
    上6カード

    クリック率はまだReporting API側なので
    この段階では触らない。
  */

  updateMainIndividualMetric(
    "再生数",
    formatInteger(
      summary.views
    )
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

  const retentionMarker =
    document.querySelector(
      "#retentionAverageTimeMarker strong"
    );

  if(retentionMarker){

    retentionMarker.textContent =
      formatDuration(
        summary.averageViewDuration
      );
  }


  /*
    ENGAGEMENT

    高評価率は現データだけでは
    正しく算出できないのでまだ触らない。

    終了画面もReporting API待ち。
  */

  updateIndividualMiniMetric(
    "高評価数",
    formatInteger(
      summary.likes
    )
  );

  updateIndividualMiniMetric(
    "コメント数",
    formatInteger(
      summary.comments
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
}

function setIndividualVideo(
  video
){

  selectedIndividualVideoId =
    video.id;

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
              DUMMY.individual
                .reachLabels
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
          DUMMY.individual
            .reachLabels
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

  renderCompareChart(
    "dailyViews"
  );
}


/* =========================================================
   INIT
========================================================= */

async function init(){

  await loadAnalyticsData();

  buildRealVideoPicker();

  renderHeader();

  setupChartDefaults();

  renderInitialVideoSelections();


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
