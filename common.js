/* =========================================================
   Common header
   Video collections / Subscriber analytics / Future outlook
========================================================= */

const COMMON_START_DATE = "2026-04-03";


function commonTodayJST() {

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    )
      .formatToParts(
        new Date()
      );


  const get = type =>
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


function commonFormatDate(
  dateString
) {

  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);


  return (
    `${year}/` +
    `${month}/` +
    `${day}`
  );

}


function commonDaysSinceStart() {

  const start =
    new Date(
      COMMON_START_DATE +
      "T00:00:00+09:00"
    );


  const today =
    new Date(
      commonTodayJST() +
      "T00:00:00+09:00"
    );


  return (
    Math.floor(
      (today - start) /
      86400000
    ) + 1
  );

}


function updateCommonHeader(
  data
) {

  const periodText =
    document.getElementById(
      "periodText"
    );

  const dayCount =
    document.getElementById(
      "dayCount"
    );

  const updatedAtDesktop =
    document.getElementById(
      "updatedAtDesktop"
    );

  const updatedAtMobile =
    document.getElementById(
      "updatedAtMobile"
    );


  /* -------------------------
     期間
  ------------------------- */

  const today =
    commonTodayJST();


  if (periodText) {

    periodText.textContent =
      `${commonFormatDate(
        COMMON_START_DATE
      )}～${commonFormatDate(
        today
      )}`;

  }


  /* -------------------------
     経過日数
  ------------------------- */

  if (dayCount) {

    dayCount.textContent =
      `（${commonDaysSinceStart()}日）`;

  }


  /* -------------------------
     最終更新
  ------------------------- */

  if (
    !data ||
    !data.updatedAt
  ) {

    if (updatedAtDesktop) {
      updatedAtDesktop.textContent =
        "—";
    }

    if (updatedAtMobile) {
      updatedAtMobile.textContent =
        "—";
    }

    return;

  }


  const date =
    new Date(
      data.updatedAt
    );


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
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23"
      }
    )
      .formatToParts(
        date
      );


  const get = type =>
    parts.find(
      part =>
        part.type === type
    )?.value || "";


  const updatedText =
    `${get("year")}/` +
    `${Number(
      get("month")
    )}/` +
    `${Number(
      get("day")
    )} ` +
    `${get("hour")}:` +
    `${get("minute")}`;


  if (updatedAtDesktop) {

    updatedAtDesktop.textContent =
      updatedText;

  }


  if (updatedAtMobile) {

    updatedAtMobile.textContent =
      updatedText;

  }

}
/* =========================================================
   GLOBAL HEADER / NAV
========================================================= */

function renderCommonHeader() {

  const root =
    document.getElementById(
      "globalHeader"
    );


  if (!root) {
    return;
  }


  const path =
    window.location.pathname;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const page =
    params.get("page");


  const isVideoAnalytics =
    path.includes(
      "/analytics/"
    );

  const isFuture =
    path.includes(
      "/future/"
    );


  let activePage =
    "home";


  if (isVideoAnalytics) {

    activePage =
      "videoAnalytics";

  } else if (isFuture) {

    activePage =
      "future";

  } else if (
    page === "videos"
  ) {

    activePage =
      "videos";

  } else if (
    page === "analytics"
  ) {

    activePage =
      "subscriberAnalytics";

  }


  const rootPrefix =
    isVideoAnalytics ||
    isFuture
      ? "../"
      : "";


  const navItem = (
    href,
    label,
    key
  ) => {

    const active =
      activePage === key;


    return `
      <a
        class="switch-btn${active ? " active" : ""}"
        href="${href}"
        ${active ? 'aria-current="page"' : ""}
      >
        ${label}
      </a>
    `;

  };


  root.innerHTML = `
    <header class="site-header">

      <div class="brand-block">

        <div class="eyebrow">
          ≒JOY / YouTube archive &amp; analytics
        </div>

        <h1>
          #切り抜くぞニアジョイ
        </h1>

      </div>


      <div class="header-info">

        <div class="analytics-label">

          <span class="desktop-analytics">
            YouTube analytics
          </span>

          <span class="mobile-analytics">
            YouTube archive &amp; analytics
          </span>

        </div>


        <div class="header-meta">

          <span id="periodText">
            2026/4/3～—
          </span>

          <span id="dayCount">
            （—日）
          </span>

          <span class="updated">

            <span class="updated-label">
              最終更新:
            </span>

            <span id="updatedAtDesktop">
              —
            </span>

            <span id="updatedAtMobile">
              —
            </span>

          </span>

        </div>

      </div>

    </header>


    <nav
      class="page-switch"
      aria-label="ページ切り替え"
    >

      ${navItem(
        `${rootPrefix}index.html`,
        "Home",
        "home"
      )}

      ${navItem(
        `${rootPrefix}index.html?page=videos`,
        "Video collections",
        "videos"
      )}

      ${navItem(
        `${rootPrefix}index.html?page=analytics`,
        "Subscriber analytics",
        "subscriberAnalytics"
      )}

      ${navItem(
        `${rootPrefix}analytics/analytics.html`,
        "Video analytics",
        "videoAnalytics"
      )}

      ${navItem(
        `${rootPrefix}future/future.html`,
        "Future outlook",
        "future"
      )}

    </nav>
  `;

}


/* HTMLが読み込まれたら共通部分を生成 */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    renderCommonHeader();


    const path =
      window.location.pathname;


    const dataPath =
      (
        path.includes(
          "/analytics/"
        ) ||
        path.includes(
          "/future/"
        )
      )
        ? "../data.json"
        : "data.json";


    try {

      const response =
        await fetch(
          dataPath +
          "?ts=" +
          Date.now(),
          {
            cache:
              "no-store"
          }
        );


      if (
        !response.ok
      ) {
        throw new Error(
          `data.json: ${response.status}`
        );
      }


      const data =
        await response.json();


      updateCommonHeader(
        data
      );

    } catch (
      error
    ) {

      console.error(
        "Common header data load failed:",
        error
      );

    }

  }
);

/* =========================================================
   SMOOTH PAGE TRANSITION
========================================================= */

document.addEventListener(
  "click",
  event => {

    const link =
      event.target.closest(
        ".page-switch a"
      );


    if (
      !link ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }


    const href =
      link.getAttribute(
        "href"
      );


    if (
      !href ||
      href.startsWith("#")
    ) {
      return;
    }


    event.preventDefault();


    document.body.classList.add(
      "page-leaving"
    );


    setTimeout(
      () => {
        window.location.href =
          link.href;
      },
      90
    );

  }
);
