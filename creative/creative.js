/* =========================================================
   STREAM CLIPS
========================================================= */

const STREAM_STORAGE_KEY =
  "creativeDeskStreamClips";

const STREAM_SEEN_KEY =
  "creativeDeskSeenStreams";

const STREAM_POSTED_KEY =
  "creativeDeskPostedStreams";

const STREAM_EXPIRED_KEY =
  "creativeDeskExpiredStreams";

const STREAM_EXCLUDE_DAYS =
  7;


let streamClips = [];
let streamSeenIds = new Set();
let streamPostedIds = new Set();
let streamExpiredIds = new Set();


async function loadStreamClips() {

  try {

    const response = await fetch(
      "streams.json",
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    try {

      streamPostedIds =
        new Set(
          JSON.parse(
            localStorage.getItem(
              STREAM_POSTED_KEY
            ) || "[]"
          )
        );

    } catch (error) {

      streamPostedIds =
        new Set();

    }


    try {

      streamExpiredIds =
        new Set(
          JSON.parse(
            localStorage.getItem(
              STREAM_EXPIRED_KEY
            ) || "[]"
          )
        );

    } catch (error) {

      streamExpiredIds =
        new Set();

    }


    streamClips =
      (
        Array.isArray(
          data.videos
        )
          ? data.videos
          : []
      ).filter(
        clip =>
          !streamPostedIds.has(
            clip.id
          ) &&
          !streamExpiredIds.has(
            clip.id
          )
      );


    loadStreamState();
    removeExpiredStreams();
    renderStreamClips();
    markCurrentStreamsAsSeen();


  } catch (error) {

    console.error(
      "Stream clips load failed:",
      error
    );


    streamClips = [];

    renderStreamClips();

  }

}


function loadStreamState() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          STREAM_STORAGE_KEY
        ) || "{}"
      );

    const seen =
      JSON.parse(
        localStorage.getItem(
          STREAM_SEEN_KEY
        ) || "[]"
      );

    streamSeenIds =
      new Set(seen);


    streamClips =
      streamClips.map(
        clip => ({
          ...clip,
          status:
            saved[clip.id]?.status ||
            null,
          note:
            saved[clip.id]?.note ||
            "",
          excludedAt:
            saved[clip.id]?.excludedAt ||
            null
        })
      );

  } catch (error) {

    console.error(
      "Stream state load failed:",
      error
    );

  }

}

function removeExpiredStreams() {

  const now =
    Date.now();

  const limit =
    STREAM_EXCLUDE_DAYS *
    24 *
    60 *
    60 *
    1000;


  streamClips =
    streamClips.filter(
      clip => {

        if (
          clip.status !==
          "excluded"
        ) {
          return true;
        }


        if (
          !clip.excludedAt
        ) {
          return true;
        }


        const expired =
          now -
          clip.excludedAt >=
          limit;


        if (expired) {

          streamExpiredIds.add(
            clip.id
          );

          return false;

        }


        return true;

      }
    );


  localStorage.setItem(
    STREAM_EXPIRED_KEY,
    JSON.stringify(
      [...streamExpiredIds]
    )
  );

}


function saveStreamState() {

  const saved = {};


  streamClips.forEach(
    clip => {

      saved[clip.id] = {
        status: clip.status || null,
        note: clip.note || "",
        excludedAt:
          clip.excludedAt || null
      };

    }
  );


  localStorage.setItem(
    STREAM_STORAGE_KEY,
    JSON.stringify(saved)
  );

}


function saveSeenStreams() {

  localStorage.setItem(
    STREAM_SEEN_KEY,
    JSON.stringify(
      [...streamSeenIds]
    )
  );

}


/* =========================================================
   CARD
========================================================= */

function createStreamCard(
  clip,
  isNew
) {

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "stream-clip-card";


  if (isNew) {

    const dot =
      document.createElement(
        "span"
      );

    dot.className =
      "stream-new-dot";

    dot.setAttribute(
      "aria-label",
      "新着"
    );

    card.appendChild(dot);

  }


  const thumbnailLink =
    document.createElement("a");

  thumbnailLink.className =
    "stream-thumbnail-link";

  thumbnailLink.href =
    clip.url;

  thumbnailLink.target =
    "_blank";

  thumbnailLink.rel =
    "noopener noreferrer";


  const thumbnail =
    document.createElement("img");

  thumbnail.className =
    "stream-thumbnail";

  thumbnail.src =
    clip.thumbnail;

  thumbnail.alt = "";


  thumbnailLink.appendChild(
    thumbnail
  );


  const body =
    document.createElement("div");

  body.className =
    "stream-clip-body";


  const titleLink =
    document.createElement("a");

  titleLink.className =
    "stream-title-link";

  titleLink.href =
    clip.url;

  titleLink.target =
    "_blank";

  titleLink.rel =
    "noopener noreferrer";


  const title =
    document.createElement("h4");

  title.className =
    "stream-title";

  title.textContent =
    clip.displayTitle;


  titleLink.appendChild(title);


  const actions =
    document.createElement("div");

  actions.className =
    "stream-actions";


  const candidateButton =
    createStatusButton(
      clip,
      "candidate",
      "候補"
    );


  const excludedButton =
    createStatusButton(
      clip,
      "excluded",
      "除外"
    );


  actions.append(
    candidateButton,
    excludedButton
  );


  if (
    clip.status ===
    "candidate"
  ) {

    const postedButton =
      document.createElement(
        "button"
      );

    postedButton.type =
      "button";

    postedButton.className =
      "stream-posted-btn";

    postedButton.textContent =
      "投稿済み";


    postedButton.addEventListener(
      "click",
      () => {

        const confirmed =
          window.confirm(
            "投稿済みにして一覧から削除しますか？"
          );


        if (!confirmed) {
          return;
        }


        streamPostedIds.add(
          clip.id
        );


        localStorage.setItem(
          STREAM_POSTED_KEY,
          JSON.stringify(
            [...streamPostedIds]
          )
        );


        streamClips =
          streamClips.filter(
            item =>
              item.id !== clip.id
          );


        saveStreamState();
        renderStreamClips();

      }
    );


    actions.appendChild(
      postedButton
    );

  }


  body.append(
    titleLink,
    actions
  );


  const noteWrap =
    document.createElement("div");

  noteWrap.className =
    "stream-note-wrap";


  const noteLabel =
    document.createElement("span");

  noteLabel.className =
    "stream-note-label";

  noteLabel.textContent =
    "メモ";


  const note =
    document.createElement("input");

  note.className =
    "stream-note";

  note.type =
    "text";

  note.value =
    clip.note || "";

  note.placeholder =
    "タイムスタンプ・内容など";


  note.addEventListener(
    "input",
    () => {

      clip.note =
        note.value;

      saveStreamState();

    }
  );


  noteWrap.append(
    noteLabel,
    note
  );


  card.append(
    thumbnailLink,
    body,
    noteWrap
  );


  return card;

}


/* =========================================================
   STATUS
========================================================= */

function createStatusButton(
  clip,
  status,
  label
) {

  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    `stream-status-btn ${status}`;


  if (
    clip.status === status
  ) {

    button.classList.add(
      "active"
    );

  }


  button.textContent =
    label;


  button.addEventListener(
    "click",
    () => {

      const turningOff =
        clip.status === status;


      clip.status =
        turningOff
          ? null
          : status;


      if (
        clip.status ===
        "excluded"
      ) {

        clip.excludedAt =
          Date.now();

      } else {

        clip.excludedAt =
          null;

      }


      saveStreamState();
      renderStreamClips();

    }
  );


  return button;

}


/* =========================================================
   RENDER
========================================================= */

function renderStreamClips() {

  const list =
    document.getElementById(
      "streamClipsList"
    );

  const reviewedList =
    document.getElementById(
      "streamReviewedList"
    );

  const empty =
    document.getElementById(
      "streamEmpty"
    );

  const newCount =
    document.getElementById(
      "streamNewCount"
    );


  if (
    !list ||
    !reviewedList ||
    !empty ||
    !newCount
  ) {
    return;
  }


  list.innerHTML = "";
  reviewedList.innerHTML = "";


  const active =
    streamClips.filter(
      clip =>
        clip.status !==
        "excluded"
    );


  const reviewed =
    streamClips.filter(
      clip =>
        clip.status ===
        "excluded"
    );


  const newItems =
    streamClips.filter(
      clip =>
        !streamSeenIds.has(
          clip.id
        )
    );


  newCount.textContent =
    `新着 ${newItems.length}件`;

  newCount.hidden =
    newItems.length === 0;


  active.forEach(
    clip => {

      list.appendChild(
        createStreamCard(
          clip,
          !streamSeenIds.has(
            clip.id
          )
        )
      );

    }
  );


  reviewed.forEach(
    clip => {

      reviewedList.appendChild(
        createStreamCard(
          clip,
          !streamSeenIds.has(
            clip.id
          )
        )
      );

    }
  );


  empty.hidden =
    active.length !== 0;

}


/* =========================================================
   REVIEWED TOGGLE
========================================================= */

const streamReviewedToggle =
  document.getElementById(
    "streamReviewedToggle"
  );


if (streamReviewedToggle) {

  streamReviewedToggle.addEventListener(
    "click",
    () => {

      const reviewedList =
        document.getElementById(
          "streamReviewedList"
        );


      const opening =
        reviewedList.hidden;


      reviewedList.hidden =
        !opening;


      streamReviewedToggle.textContent =
        opening
          ? "確認済みを閉じる"
          : "確認済みを表示";

    }
  );

}


/* =========================================================
   START
========================================================= */

function markCurrentStreamsAsSeen() {

  const unseenAtOpen =
    streamClips
      .filter(
        clip =>
          !streamSeenIds.has(
            clip.id
          )
      )
      .map(
        clip => clip.id
      );


  if (
    unseenAtOpen.length === 0
  ) {
    return;
  }


  window.setTimeout(
    () => {

      unseenAtOpen.forEach(
        id =>
          streamSeenIds.add(id)
      );

      saveSeenStreams();

    },
    1000
  );

}


loadStreamClips

/* =========================================================
   ≒JOY SCHEDULE
========================================================= */

const scheduleCalendarGrid =
  document.getElementById(
    "scheduleCalendarGrid"
  );

const scheduleMonthTitle =
  document.getElementById(
    "scheduleMonthTitle"
  );

const schedulePrevMonth =
  document.getElementById(
    "schedulePrevMonth"
  );

const scheduleNextMonth =
  document.getElementById(
    "scheduleNextMonth"
  );

const scheduleToday =
  new Date();

let scheduleCurrentYear =
  scheduleToday.getFullYear();

let scheduleCurrentMonth =
  scheduleToday.getMonth();

const scheduleTestEvents = [
  {
    date: "2026-09-20",
    genre: "LIVE",
    title: "≒JOY 全国ツアー 東京公演",
    status: "default"
  },
  {
    date: "2026-09-23",
    genre: "BOOK",
    title: "≒JOY STYLE BOOK 発売",
    status: "selected"
  },
  {
    date: "2026-09-23",
    genre: "TV",
    title: "音楽特番 出演",
    status: "ready"
  },
  {
    date: "2026-09-27",
    genre: "RELEASE",
    title: "≒JOY ニューシングル発売",
    status: "default"
  },
  {
    date: "2026-09-30",
    genre: "BIRTHDAY",
    title: "メンバー誕生日",
    status: "selected"
  }
];


function renderScheduleCalendar() {

  if (
    !scheduleCalendarGrid ||
    !scheduleMonthTitle
  ) {
    return;
  }

  scheduleMonthTitle.textContent =
    `${scheduleCurrentYear}年${scheduleCurrentMonth + 1}月`;

  scheduleCalendarGrid.innerHTML =
    "";

  const firstDay =
    new Date(
      scheduleCurrentYear,
      scheduleCurrentMonth,
      1
    );

  const lastDate =
    new Date(
      scheduleCurrentYear,
      scheduleCurrentMonth + 1,
      0
    ).getDate();

  const firstDayIndex =
    firstDay.getDay();

  const totalCells =
    Math.ceil(
      (
        firstDayIndex +
        lastDate
      ) / 7
    ) * 7;

  for (
    let cellIndex = 0;
    cellIndex < totalCells;
    cellIndex += 1
  ) {

    const day =
      cellIndex -
      firstDayIndex +
      1;

    const dayCell =
      document.createElement(
        "div"
      );

    dayCell.className =
      "schedule-day";

    if (
      day >= 1 &&
      day <= lastDate
    ) {

      const dayNumber =
        document.createElement(
          "div"
        );

      dayNumber.className =
        "schedule-day-number";

      dayNumber.textContent =
        day;

      dayCell.appendChild(
        dayNumber
      );

      const isToday =
        scheduleCurrentYear ===
          scheduleToday.getFullYear() &&
        scheduleCurrentMonth ===
          scheduleToday.getMonth() &&
        day ===
          scheduleToday.getDate();

      if (isToday) {
        dayCell.classList.add(
          "today"
        );
      }

      const dateKey =
        `${scheduleCurrentYear}-${String(
          scheduleCurrentMonth + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;

      const dayEvents =
        scheduleTestEvents.filter(
          event =>
            event.date ===
            dateKey
        );

      dayEvents.forEach(
        event => {

          const eventButton =
            document.createElement(
              "button"
            );

          eventButton.type =
            "button";

          eventButton.className =
            `schedule-event genre-${event.genre.toLowerCase()} status-${event.status}`;

          eventButton.innerHTML =
            `
              <span class="schedule-event-dot"></span>
              <span class="schedule-event-label">${event.genre}</span>
            `;

          dayCell.appendChild(
            eventButton
          );

        }
      );

    } else {

      dayCell.classList.add(
        "empty"
      );

    }

    scheduleCalendarGrid.appendChild(
      dayCell
    );

  }

}


schedulePrevMonth?.addEventListener(
  "click",
  () => {

    scheduleCurrentMonth -= 1;

    if (
      scheduleCurrentMonth < 0
    ) {
      scheduleCurrentMonth = 11;
      scheduleCurrentYear -= 1;
    }

    renderScheduleCalendar();

  }
);


scheduleNextMonth?.addEventListener(
  "click",
  () => {

    scheduleCurrentMonth += 1;

    if (
      scheduleCurrentMonth > 11
    ) {
      scheduleCurrentMonth = 0;
      scheduleCurrentYear += 1;
    }

    renderScheduleCalendar();

  }
);


renderScheduleCalendar();
