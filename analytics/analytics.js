/* =========================================================
   VIDEO ANALYTICS
   analytics/analytics.js

   Phase 1:
   外観確認用ダミーデータ
   後から YouTube Analytics / Reporting API に置換
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
  green: "#35C759",
  paper: "#FFFFFF",
  grid: "rgba(17,17,17,.10)",
  average: "rgba(17,17,17,.25)"
};

const CHARTS = {};

let currentMode = "overview";
let currentPeriod = "30";



/* =========================================================
   DUMMY DATA

   API接続時は、この部分を取得データに置き換える。
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

    views: [
      9140, 10240, 8810, 12420, 10780,
      11940, 12820, 11140, 13840, 14920,
      13310, 15780, 14120, 16920, 15810,
      17480, 19020, 18210, 24910, 22180,
      19820, 20710, 21940, 22820, 24120,
      23680, 25210, 26340, 24820, 27910
    ],

    engaged: [
      7310, 8260, 7040, 10020, 8610,
      9480, 10320, 8950, 11120, 11980,
      10620, 12720, 11310, 13640, 12780,
      14120, 15320, 14720, 20180, 17840,
      16020, 16780, 17720, 18540, 19520,
      19080, 20420, 21410, 20080, 22640
    ],

    impressions: [
      81200, 89400, 77400, 103400, 91200,
      98800, 105200, 93100, 112400, 120800,
      108200, 126400, 116200, 135400, 128100,
      141200, 151800, 147400, 194200, 181600,
      163400, 169800, 178200, 184800, 194600,
      190400, 201200, 209800, 202400, 218600
    ],

    ctr: [
      7.3, 7.7, 7.1, 8.0, 7.5,
      7.8, 8.1, 7.6, 8.2, 8.4,
      7.9, 8.5, 8.1, 8.7, 8.3,
      8.6, 8.8, 8.4, 9.2, 8.9,
      8.5, 8.6, 8.7, 8.8, 8.9,
      8.7, 9.0, 9.1, 8.8, 9.2
    ]
  },


  individual: {

    labels: [
      "DAY 1",
      "DAY 2",
      "DAY 3",
      "DAY 4",
      "DAY 5",
      "DAY 6",
      "DAY 7",
      "DAY 8",
      "DAY 9",
      "DAY 10",
      "DAY 11",
      "DAY 12",
      "DAY 13",
      "DAY 14"
    ],

    views: [
      1824,
      1211,
      906,
      742,
      614,
      523,
      472,
      391,
      337,
      301,
      268,
      244,
      219,
      198
    ],

    engaged: [
      1518,
      1012,
      771,
      631,
      522,
      446,
      399,
      331,
      286,
      254,
      227,
      207,
      186,
      168
    ],

    impressions: [
      19240,
      15180,
      12640,
      10820,
      9240,
      8160,
      7380,
      6420,
      5780,
      5210,
      4810,
      4460,
      4180,
      3910
    ],

    ctr: [
      9.42,
      9.18,
      8.94,
      8.61,
      8.43,
      8.21,
      8.09,
      7.94,
      7.81,
      7.72,
      7.64,
      7.57,
      7.49,
      7.41
    ],

    retentionLabels: [
      "0%",
      "10%",
      "20%",
      "30%",
      "40%",
      "50%",
      "60%",
      "70%",
      "80%",
      "90%",
      "100%"
    ],

    retention: [
      100,
      87,
      81,
      77,
      73,
      69,
      66,
      62,
      58,
      53,
      47
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
      1824,
      1211,
      906,
      742,
      614,
      523,
      472
    ],

    dailyViewsB: [
      1411,
      1328,
      1081,
      921,
      842,
      811,
      817
    ],

    averageDailyViews: [
      1310,
      1050,
      742,
      610,
      528,
      471,
      429
    ],


    impressionsA: [
      19240,
      15180,
      12640,
      10820,
      9240,
      8160,
      7380
    ],

    impressionsB: [
      18100,
      16900,
      15200,
      13800,
      12700,
      11900,
      11200
    ],

    averageImpressions: [
      14800,
      12900,
      11100,
      9800,
      8900,
      8100,
      7500
    ],


    ctrA: [
      9.42,
      9.18,
      8.94,
      8.61,
      8.43,
      8.21,
      8.09
    ],

    ctrB: [
      7.84,
      7.91,
      8.03,
      8.10,
      8.17,
      8.24,
      8.31
    ],

    averageCtr: [
      7.18,
      7.21,
      7.24,
      7.28,
      7.31,
      7.34,
      7.37
    ],


    retentionLabels: [
      "0%",
      "10%",
      "20%",
      "30%",
      "40%",
      "50%",
      "60%",
      "70%",
      "80%",
      "90%",
      "100%"
    ],

    retentionA: [
      100,
      87,
      81,
      77,
      73,
      69,
      66,
      62,
      58,
      53,
      47
    ],

    retentionB: [
      100,
      91,
      86,
      82,
      79,
      76,
      73,
      70,
      66,
      62,
      57
    ],

    averageRetention: [
      100,
      85,
      79,
      74,
      70,
      66,
      62,
      58,
      54,
      49,
      44
    ]
  }
};



/* =========================================================
   HEADER
========================================================= */

function formatDateJP(date){

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  return `${y}/${m}/${d}`;
}


function formatDateTimeJP(date){

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}/${m}/${d} ${h}:${min}`;
}


function getDaysSinceStart(){

  const start = new Date(`${START_DATE}T00:00:00`);
  const now = new Date();

  const diff =
    now.getTime() -
    start.getTime();

  return Math.max(
    1,
    Math.floor(diff / 86400000) + 1
  );
}


function renderHeader(){

  const now = new Date();

  const periodText =
    document.getElementById("periodText");

  const dayCount =
    document.getElementById("dayCount");

  const updatedDesktop =
    document.getElementById("updatedAtDesktop");

  const updatedMobile =
    document.getElementById("updatedAtMobile");


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

    updatedDesktop.textContent =
      updated;
  }


  if(updatedMobile){

    updatedMobile.textContent =
      updated;
  }
}



/* =========================================================
   CHART DEFAULTS
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
    280;

  Chart.defaults.responsive =
    true;

  Chart.defaults.maintainAspectRatio =
    false;
}



/* =========================================================
   COMMON CHART OPTIONS
========================================================= */

function lineChartOptions({
  percent = false,
  beginAtZero = true
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
        display:false
      },

      tooltip:{

        backgroundColor:"#111",

        titleColor:"#fff",
        bodyColor:"#fff",

        padding:10,

        displayColors:false,

        callbacks:{

          label(context){

            const value =
              context.parsed.y;

            if(percent){

              return `${value.toLocaleString()}%`;
            }

            return value.toLocaleString();
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

            return compactNumber(value);
          }
        }
      }
    }
  };
}



/* =========================================================
   FORMAT
========================================================= */

function compactNumber(value){

  const number =
    Number(value || 0);

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



/* =========================================================
   CHART DESTROY
========================================================= */

function destroyChart(name){

  if(CHARTS[name]){

    CHARTS[name].destroy();

    delete CHARTS[name];
  }
}



/* =========================================================
   OVERVIEW DAILY CHART
========================================================= */

function renderOverviewDailyChart(
  metric = "views"
){

  const canvas =
    document.getElementById(
      "overviewDailyChart"
    );

  if(!canvas){
    return;
  }


  destroyChart(
    "overviewDaily"
  );


  const config = {

    views:{
      label:"再生数",
      values:DUMMY.overview.views,
      percent:false
    },

    engaged:{
      label:"Engaged Views",
      values:DUMMY.overview.engaged,
      percent:false
    },

    impressions:{
      label:"インプレッション",
      values:DUMMY.overview.impressions,
      percent:false
    },

    ctr:{
      label:"CTR",
      values:DUMMY.overview.ctr,
      percent:true
    }
  };


  const selected =
    config[metric] ||
    config.views;


  CHARTS.overviewDaily =
    new Chart(
      canvas,
      {
        type:"line",

        data:{

          labels:
            DUMMY.overview.labels,

          datasets:[
            {
              label:selected.label,

              data:selected.values,

              borderColor:
                COLORS.ink,

              backgroundColor:
                COLORS.yellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.ink,

              pointBorderWidth:2,

              pointRadius:
                window.innerWidth <= 800
                  ? 2
                  : 3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.32,

              fill:false
            }
          ]
        },

        options:
          lineChartOptions({
            percent:selected.percent,
            beginAtZero:
              !selected.percent
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

  if(!canvas){
    return;
  }


  destroyChart(
    "individualViews"
  );


  const isEngaged =
    metric === "engaged";


  CHARTS.individualViews =
    new Chart(
      canvas,
      {
        type:"line",

        data:{

          labels:
            DUMMY.individual.labels,

          datasets:[
            {
              label:
                isEngaged
                  ? "Engaged Views"
                  : "再生数",

              data:
                isEngaged
                  ? DUMMY.individual.engaged
                  : DUMMY.individual.views,

              borderColor:
                COLORS.ink,

              backgroundColor:
                COLORS.yellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.ink,

              pointBorderWidth:2,

              pointRadius:3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.3
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

  if(!canvas){
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
              label:"視聴維持率",

              data:
                DUMMY.individual
                  .retention,

              borderColor:
                COLORS.ink,

              backgroundColor:
                COLORS.yellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.ink,

              pointBorderWidth:2,

              pointRadius:3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.36,

              fill:false
            }
          ]
        },

        options:{
          ...lineChartOptions({
            percent:true,
            beginAtZero:true
          }),

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

                font:{
                  size:
                    window.innerWidth <= 800
                      ? 8
                      : 10,

                  weight:"700"
                },

                callback(value){
                  return `${value}%`;
                }
              }
            }
          }
        }
      }
    );
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

  if(!canvas){
    return;
  }


  destroyChart(
    "individualReach"
  );


  const isCtr =
    metric === "ctr";


  CHARTS.individualReach =
    new Chart(
      canvas,
      {
        type:"line",

        data:{

          labels:
            DUMMY.individual.labels,

          datasets:[
            {
              label:
                isCtr
                  ? "CTR"
                  : "インプレッション",

              data:
                isCtr
                  ? DUMMY.individual.ctr
                  : DUMMY.individual.impressions,

              borderColor:
                COLORS.ink,

              backgroundColor:
                COLORS.yellow,

              pointBackgroundColor:
                COLORS.paper,

              pointBorderColor:
                COLORS.ink,

              pointBorderWidth:2,

              pointRadius:3,

              pointHoverRadius:5,

              borderWidth:3,

              tension:.32
            }
          ]
        },

        options:
          lineChartOptions({
            percent:isCtr,
            beginAtZero:!isCtr
          })
      }
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

  if(!canvas){
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
                COLORS.yellow,

              borderColor:
                COLORS.ink,

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
   COMPARE HELPERS
========================================================= */

function cumulative(values){

  let total = 0;

  return values.map(value => {

    total += value;

    return total;
  });
}



/* =========================================================
   COMPARE CHART
========================================================= */

function renderCompareChart(
  metric = "dailyViews"
){

  const canvas =
    document.getElementById(
      "compareChart"
    );

  if(!canvas){
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
        COLORS.ink,

      backgroundColor:
        COLORS.yellow,

      pointBackgroundColor:
        COLORS.yellow,

      pointBorderColor:
        COLORS.ink,

      pointBorderWidth:2,

      pointRadius:4,

      pointHoverRadius:6,

      borderWidth:3,

      tension:.32
    },


    {
      label:"VIDEO B",

      data:dataB,

      borderColor:
        COLORS.green,

      backgroundColor:
        COLORS.green,

      pointBackgroundColor:
        COLORS.paper,

      pointBorderColor:
        COLORS.green,

      pointBorderWidth:3,

      pointRadius:4,

      pointHoverRadius:6,

      borderWidth:3,

      tension:.32
    }
  ];


  if(showAverage){

    datasets.push({

      label:"全動画平均",

      data:average,

      borderColor:
        COLORS.average,

      backgroundColor:
        COLORS.average,

      pointRadius:0,

      borderWidth:2,

      borderDash:[5,5],

      tension:.32
    });
  }


  const options =
    lineChartOptions({
      percent,
      beginAtZero:
        metric !== "retention"
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

  const buttons =
    document.querySelectorAll(
      ".analytics-mode-btn"
    );


  buttons.forEach(button => {

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

  currentMode = mode;


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


  /*
    display:none → block の後で
    Chart.js のサイズを再計算
  */

  requestAnimationFrame(() => {

    Object.values(CHARTS)
      .forEach(chart => {

        if(chart){
          chart.resize();
        }
      });
  });


  /*
    URLにも残す。
    API接続後、
    Video collections → Individual
    へ直接飛ばすのにも使える。
  */

  try{

    const url =
      new URL(window.location.href);

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
    // 無視
  }
}



/* =========================================================
   PERIOD BUTTON
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
          "30";


        /*
          Phase 1では見た目確認のみ。

          API接続後はここで
          7 / 30 / 90 / 累計
          の実データを再描画する。
        */

        renderOverviewDailyChart(
          getActiveMetric(
            "overviewDaily"
          )
        );
      }
    );
  });
}



/* =========================================================
   CHART SWITCHES
========================================================= */

function initChartSwitches(){

  const switchGroups =
    document.querySelectorAll(
      "[data-chart-switch]"
    );


  switchGroups.forEach(group => {

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
            group.dataset.chartSwitch;

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


function getActiveMetric(groupName){

  const group =
    document.querySelector(
      `[data-chart-switch="${groupName}"]`
    );


  if(!group){
    return null;
  }


  return group
    .querySelector(
      ".chart-switch-btn.active"
    )
    ?.dataset.metric || null;
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


  checkbox.addEventListener(
    "change",
    () => {

      renderCompareChart(
        getActiveMetric(
          "compare"
        ) || "dailyViews"
      );
    }
  );
}



/* =========================================================
   HELP CONTENT
========================================================= */

const HELP_CONTENT = {

  engagedViews:{

    title:"Engaged Views",

    text:
      "動画が再生開始直後だけで終わらず、実際の視聴としてカウントされた回数を見るための指標です。通常の再生数とあわせて見ることで、再生がどれだけ実質的な視聴につながったかを確認できます。"
  },


  impressions:{

    title:"インプレッション",

    text:
      "YouTube上で動画のサムネイルが視聴者に表示された回数です。ホーム画面や検索結果、関連動画などで、動画がどれだけ視聴候補として露出したかを見るために使います。"
  },


  ctr:{

    title:"CTR",

    text:
      "サムネイルが表示された回数のうち、どれくらいの割合が視聴につながったかを示す指標です。サムネイルやタイトルが視聴者の興味を引けているかを見る目安になります。"
  },


  averagePercentageViewed:{

    title:"平均再生率",

    text:
      "動画全体の長さに対して、視聴者が平均して何％まで視聴したかを示します。長さの違う動画同士でも、視聴の深さを比較しやすい指標です。"
  },


  retention:{

    title:"視聴維持率",

    text:
      "動画の各地点で、視聴者がどれくらい残っているかを表します。グラフが大きく下がった場所では離脱が多く、維持されている場所では視聴が続いていると考えられます。"
  },


  trafficSource:{

    title:"流入元",

    text:
      "視聴者がどこから動画へたどり着いたかを示します。ホームなどのブラウジング機能、関連動画、YouTube検索、外部サイトなどに分けて確認できます。"
  },


  endScreenCtr:{

    title:"終了画面CTR",

    text:
      "動画の終了画面に表示した要素が、どれくらいクリックされたかを見るための割合です。動画を見終えた視聴者を次の動画へ誘導できているかを見る目安になります。"
  }
};



/* =========================================================
   HELP MODAL
========================================================= */

function initHelpModal(){

  const modal =
    document.getElementById(
      "helpModal"
    );

  const title =
    document.getElementById(
      "helpModalTitle"
    );

  const text =
    document.getElementById(
      "helpModalText"
    );

  const close =
    document.getElementById(
      "closeHelpModal"
    );


  if(
    !modal ||
    !title ||
    !text
  ){
    return;
  }


  document
    .querySelectorAll(
      ".help-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          const key =
            button.dataset.help;

          const content =
            HELP_CONTENT[key];


          if(!content){
            return;
          }


          title.textContent =
            content.title;

          text.textContent =
            content.text;


          modal.classList.add(
            "open"
          );

          modal.setAttribute(
            "aria-hidden",
            "false"
          );

          document.body.style.overflow =
            "hidden";
        }
      );
    });


  function closeModal(){

    modal.classList.remove(
      "open"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow =
      "";
  }


  close?.addEventListener(
    "click",
    closeModal
  );


  modal.addEventListener(
    "click",
    event => {

      if(event.target === modal){

        closeModal();
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if(
        event.key === "Escape" &&
        modal.classList.contains("open")
      ){

        closeModal();
      }
    }
  );
}



/* =========================================================
   VIDEO SELECT DUMMY INTERACTION
========================================================= */

function initVideoSelectors(){

  const individual =
    document.getElementById(
      "individualVideoSelect"
    );


  /*
    Phase 1では選択UIの動作確認だけ。

    API接続後は、
    videoId → analytics data
    を読み込んで全セクションを更新。
  */

  individual?.addEventListener(
    "change",
    () => {

      renderIndividualViewsChart(
        getActiveMetric(
          "individualViews"
        ) || "views"
      );

      renderIndividualReachChart(
        getActiveMetric(
          "individualReach"
        ) || "impressions"
      );

      renderRetentionChart();
      renderTrafficSourceChart();
    }
  );


  const compareA =
    document.getElementById(
      "compareVideoA"
    );

  const compareB =
    document.getElementById(
      "compareVideoB"
    );


  function refreshCompare(){

    renderCompareChart(
      getActiveMetric(
        "compare"
      ) || "dailyViews"
    );
  }


  compareA?.addEventListener(
    "change",
    refreshCompare
  );

  compareB?.addEventListener(
    "change",
    refreshCompare
  );
}



/* =========================================================
   MOBILE TOOLTIP DISMISS

   グラフ外をタップしたら
   Chart.js tooltip を即閉じる。
========================================================= */

function initOutsideTooltipDismiss(){

  document.addEventListener(
    "pointerdown",
    event => {

      const clickedCanvas =
        event.target.closest?.(
          ".analytics-chart-wrap canvas"
        );


      if(clickedCanvas){
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

              chart.tooltip.setActiveElements(
                [],
                {x:0,y:0}
              );
            }


            chart.update(
              "none"
            );

          }catch(error){
            // Chart.js の状態差は無視
          }
        });
    }
  );
}



/* =========================================================
   URL MODE

   analytics.html?mode=individual
   analytics.html?mode=compare
   に対応。

   後で
   ?mode=individual&video=VIDEO_ID
   に発展できる。
========================================================= */

function applyModeFromUrl(){

  try{

    const params =
      new URLSearchParams(
        window.location.search
      );


    const mode =
      params.get("mode");


    if(
      mode === "overview" ||
      mode === "individual" ||
      mode === "compare"
    ){

      setMode(mode);
    }

  }catch(error){
    // 無視
  }
}



/* =========================================================
   RESIZE

   PC ↔ スマホでサイズを変えたときに
   グラフを再計算。
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

            Object.values(CHARTS)
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
   INITIAL RENDER
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

function init(){

  renderHeader();

  setupChartDefaults();

  initModeSwitch();

  initPeriodButtons();

  initChartSwitches();

  initAverageToggle();

  initHelpModal();

  initVideoSelectors();

  initOutsideTooltipDismiss();

  initResizeHandler();

  renderInitialCharts();

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
