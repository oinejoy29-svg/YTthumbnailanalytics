/* =========================================================
   STREAM CLIPS
========================================================= */

const STREAM_STORAGE_KEY =
  "creativeDeskStreamClips";

const STREAM_SEEN_KEY =
  "creativeDeskSeenStreams";

const STREAM_POSTED_KEY =
  "creativeDeskPostedStreams";


let streamClips = [];
let streamSeenIds = new Set();
let streamPostedIds = new Set();


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
          )
      );


    loadStreamState();
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
            ""
        })
      );

  } catch (error) {

    console.error(
      "Stream state load failed:",
      error
    );

  }

}


function saveStreamState() {

  const saved = {};


  streamClips.forEach(
    clip => {

      saved[clip.id] = {
        status: clip.status || null,
        note: clip.note || ""
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

      clip.status =
        clip.status === status
          ? null
          : status;


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


loadStreamClips();
