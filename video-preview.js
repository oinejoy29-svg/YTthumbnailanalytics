
/* ============================================
   VIDEO COLLECTION - LOCAL VIDEO PREVIEWS
   IndexedDB / Thumbnail similarity
============================================ */

(() => {
  "use strict";

  const DB_NAME = "joy-video-previews";
  const STORE_NAME = "previews";
  const DB_VERSION = 1;
  const HASH_THRESHOLD = 5;

  const $p = id => document.getElementById(id);

  let db = null;
  let previews = [];
  let editingId = null;
  let selectedImage = null;
  let imageUrls = [];
  let checking = false;

  const getVideos = () => {
    try {
      return Array.isArray(DATA?.videos)
        ? DATA.videos
        : [];
    } catch {
      return [];
    }
  };

  const escapeText = value =>
    String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transaction(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = action(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadPreviews() {
    previews = await transaction(
      "readonly",
      store => store.getAll()
    );
  }

  async function savePreview(preview) {
    await transaction(
      "readwrite",
      store => store.put(preview)
    );
    await loadPreviews();
  }

  async function deletePreview(id) {
    await transaction(
      "readwrite",
      store => store.delete(id)
    );
    await loadPreviews();
  }

  /* ---------- Image hashing ---------- */

  async function imageHash(source) {
    let bitmap;

    try {
      bitmap = await createImageBitmap(source);

      const canvas = document.createElement("canvas");
      canvas.width = 9;
      canvas.height = 8;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: true
      });

      ctx.drawImage(bitmap, 0, 0, 9, 8);

      const pixels = ctx.getImageData(0, 0, 9, 8).data;
      const gray = [];

      for (let i = 0; i < pixels.length; i += 4) {
        gray.push(
          pixels[i] * 0.299 +
          pixels[i + 1] * 0.587 +
          pixels[i + 2] * 0.114
        );
      }

      let hash = "";

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = y * 9 + x;
          hash += gray[i] > gray[i + 1] ? "1" : "0";
        }
      }

      return hash;
    } finally {
      bitmap?.close();
    }
  }

  function hashDistance(a, b) {
    if (!a || !b || a.length !== b.length) {
      return Infinity;
    }

    let distance = 0;

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) distance++;
    }

    return distance;
  }

  async function hashRemoteImage(url) {
    if (!/^https:\/\//i.test(url || "")) {
      return null;
    }

    try {
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit"
      });

      if (!response.ok) return null;

      const blob = await response.blob();

      if (!blob.type.startsWith("image/")) {
        return null;
      }

      return await imageHash(blob);
    } catch (error) {
      // CORSなどで取得できない場合は削除しない。
      console.debug(
        "Thumbnail comparison unavailable:",
        error
      );
      return null;
    }
  }

  /* ---------- Automatic cleanup ---------- */

  async function cleanupPublishedPreviews() {
    if (checking || !previews.length) return;

    const videos = getVideos();

    if (!videos.length) return;

    checking = true;

    try {
      const hashCache = new Map();
      const usedVideoIds = new Set();

      const ordered = [...previews].sort(
        (a, b) => a.createdAt - b.createdAt
      );

      for (const preview of ordered) {
        if (!preview.hash) continue;

        const knownIds = new Set(
          preview.knownVideoIds || []
        );

        const candidates = videos.filter(video => {
          const id = String(video.id || "");

          return id &&
            !knownIds.has(id) &&
            !usedVideoIds.has(id) &&
            video.thumbnail;
        });

        let bestMatch = null;
        let bestDistance = Infinity;

        for (const video of candidates) {
          const id = String(video.id);

          if (!hashCache.has(id)) {
            hashCache.set(
              id,
              await hashRemoteImage(video.thumbnail)
            );
          }

          const remoteHash = hashCache.get(id);
          const distance = hashDistance(
            preview.hash,
            remoteHash
          );

          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = video;
          }
        }

        if (
          bestMatch &&
          bestDistance <= HASH_THRESHOLD
        ) {
          await deletePreview(preview.id);
          usedVideoIds.add(String(bestMatch.id));

          console.info(
            "Published preview automatically removed:",
            preview.title,
            bestMatch.id
          );
        }
      }
    } finally {
      checking = false;
      renderPreviewCards();
    }
  }

  /* ---------- Cards ---------- */

  function clearImageUrls() {
    for (const url of imageUrls) {
      URL.revokeObjectURL(url);
    }
    imageUrls = [];
  }

  function renderPreviewCards() {
    const grid = $p("videoGrid");
    const sort = $p("sortSelect")?.value;
    const tag = $p("tagSelect")?.value;

    if (!grid) return;

    grid.querySelectorAll(
      ".video-card-preview"
    ).forEach(card => card.remove());

    clearImageUrls();

    // プレビューは新着順・全メンバー時のみ表示。
    if (sort !== "newest" || tag) return;

    const sorted = [...previews].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const fragment = document.createDocumentFragment();

    for (const preview of sorted) {
      const url = URL.createObjectURL(preview.image);
      imageUrls.push(url);

      const card = document.createElement("article");

      card.className = "video-card video-card-preview";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        "プレビューを編集"
      );

      card.innerHTML = `
        <span class="video-status-sticker video-status-preview">
          PREVIEW
        </span>

        <img src="${url}" alt="" loading="lazy">

        <div class="video-info">
          <div class="video-title">
            ${escapeText(preview.title)}
          </div>

          <div class="video-meta">
            <span class="preview-card-note">
              未投稿・編集する
            </span>
          </div>
        </div>
      `;

      const open = () => openEditor(preview.id);

      card.addEventListener("click", open);

      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });

      fragment.appendChild(card);
    }

    grid.prepend(fragment);
  }

  /* ---------- Modal ---------- */

  function showError(message) {
    const element = $p("videoPreviewError");
    if (!element) return;

    element.textContent = message;
    element.hidden = !message;
  }

  function showImage(blob) {
    const area = $p("videoPreviewImageArea");
    const image = $p("videoPreviewImageDisplay");

    if (image.dataset.objectUrl) {
      URL.revokeObjectURL(image.dataset.objectUrl);
      delete image.dataset.objectUrl;
    }

    if (!blob) {
      image.removeAttribute("src");
      area.hidden = true;
      return;
    }

    const url = URL.createObjectURL(blob);

    image.src = url;
    image.dataset.objectUrl = url;
    area.hidden = false;
  }

  function openEditor(id = null) {
    const preview = previews.find(
      item => item.id === id
    );

    editingId = preview?.id || null;
    selectedImage = null;

    $p("videoPreviewForm").reset();

    $p("videoPreviewTitle").value =
      preview?.title || "";

    $p("videoPreviewModalTitle").textContent =
      preview ? "プレビューを編集" : "新動画プレビュー";

    $p("deleteVideoPreview").hidden = !preview;

    showImage(preview?.image || null);
    showError("");

    $p("videoPreviewModal").classList.add("open");
    $p("videoPreviewModal").setAttribute(
      "aria-hidden", "false"
    );

  }

  function closeEditor() {
    $p("videoPreviewModal").classList.remove("open");
    $p("videoPreviewModal").setAttribute(
      "aria-hidden", "true"
    );

    showImage(null);
    editingId = null;
    selectedImage = null;
  }

  async function handleSave(event) {
    event.preventDefault();
    showError("");

    const title = $p("videoPreviewTitle").value.trim();
    const existing = previews.find(
      item => item.id === editingId
    );

    const image = selectedImage || existing?.image;

    if (!title || !image) {
      showError("タイトルとサムネイル画像を指定してください。");
      return;
    }

    const saveButton = $p("saveVideoPreview");
    saveButton.disabled = true;

    try {
      const hash = selectedImage || !existing?.hash
        ? await imageHash(image)
        : existing.hash;

      const preview = {
        id: existing?.id || crypto.randomUUID(),
        title,
        image,
        hash,
        createdAt: existing?.createdAt || Date.now(),
        knownVideoIds: existing?.knownVideoIds ||
          getVideos().map(video => String(video.id))
      };

      await savePreview(preview);

      closeEditor();
      renderPreviewCards();
      await cleanupPublishedPreviews();

    } catch (error) {
      console.error(error);
      showError("保存できませんでした。画像や保存容量を確認してください。");
    } finally {
      saveButton.disabled = false;
    }
  }

  async function handleDelete() {
    if (!editingId) return;

    if (!confirm("このプレビューを削除しますか？")) {
      return;
    }

    try {
      await deletePreview(editingId);
      closeEditor();
      renderPreviewCards();
    } catch (error) {
      console.error(error);
      showError("削除に失敗しました。");
    }
  }

  /* ---------- Integration ---------- */

  function setupEvents() {
    $p("addVideoPreview")?.addEventListener(
      "click",
      () => openEditor()
    );

    $p("closeVideoPreview")?.addEventListener(
      "click",
      closeEditor
    );

    $p("cancelVideoPreview")?.addEventListener(
      "click",
      closeEditor
    );

    $p("videoPreviewForm")?.addEventListener(
      "submit",
      handleSave
    );

    $p("deleteVideoPreview")?.addEventListener(
      "click",
      handleDelete
    );

    $p("videoPreviewImage")?.addEventListener(
      "change",
      event => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (
          !["image/png", "image/jpeg", "image/webp"]
            .includes(file.type)
        ) {
          showError("PNG・JPEG・WebP画像を選択してください。");
          event.target.value = "";
          return;
        }

        selectedImage = file;
        showImage(file);
        showError("");
      }
    );

    $p("videoPreviewModal")?.addEventListener(
      "click",
      event => {
        if (event.target.id === "videoPreviewModal") {
          closeEditor();
        }
      }
    );

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        $p("videoPreviewModal")?.classList.contains("open")
      ) {
        closeEditor();
      }
    });
  }

  async function initialize() {
    if (!$p("videoGrid") || !$p("videoPreviewForm")) {
      console.error("Video preview HTML is missing.");
      return;
    }

    setupEvents();

    try {
      db = await openDatabase();
      await loadPreviews();
    } catch (error) {
      console.error("IndexedDB initialization failed:", error);
      alert("プレビュー保存機能を利用できません。ブラウザの保存設定を確認してください。");
      return;
    }

    // 既存のrenderVideosを拡張する。
    // DATA.videosや既存の分析データは変更しない。
    if (typeof renderVideos === "function") {
      const originalRenderVideos = renderVideos;

      renderVideos = function (...args) {
        const result = originalRenderVideos.apply(this, args);
        renderPreviewCards();
        return result;
      };
    }

    renderPreviewCards();

    // data.jsonの読み込み完了を待って照合する。
    let attempts = 0;

    const waitForVideos = setInterval(async () => {
      attempts++;

      if (getVideos().length) {
        clearInterval(waitForVideos);
        await cleanupPublishedPreviews();
      } else if (attempts >= 60) {
        clearInterval(waitForVideos);
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
