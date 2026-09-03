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
