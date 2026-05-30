(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const controls = document.getElementById("controls");
  const quality = document.getElementById("quality");
  const qualityVal = document.getElementById("qualityVal");
  const format = document.getElementById("format");
  const maxWidth = document.getElementById("maxWidth");
  const compressBtn = document.getElementById("compressBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const clearBtn = document.getElementById("clearBtn");
  const results = document.getElementById("results");
  const summary = document.getElementById("summary");

  document.getElementById("year").textContent = new Date().getFullYear();

  /** @type {{file: File, blob: Blob|null, url: string|null, name: string}[]} */
  let items = [];

  // ---- 工具函数 ----
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function extFor(mime) {
    return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  }

  function baseName(name) {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
  }

  // ---- 选择文件 ----
  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    incoming.forEach((file) => items.push({ file, blob: null, url: null, name: file.name }));
    controls.hidden = false;
    clearBtn.hidden = false;
    renderResults();
  }

  pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
  );
  dropzone.addEventListener("drop", (e) => { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

  quality.addEventListener("input", () => { qualityVal.textContent = quality.value; });

  // ---- 核心：压缩单张图片 ----
  function compressOne(item) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objURL = URL.createObjectURL(item.file);
      img.onload = function () {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const limit = parseInt(maxWidth.value, 10) || 0;
        if (limit > 0 && w > limit) {
          h = Math.round((h * limit) / w);
          w = limit;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        // PNG 透明背景保留；JPG 填白底避免透明变黑
        if (format.value === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objURL);
        const q = parseInt(quality.value, 10) / 100;
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("压缩失败"));
            if (item.url) URL.revokeObjectURL(item.url);
            item.blob = blob;
            item.url = URL.createObjectURL(blob);
            item.name = baseName(item.file.name) + "_compressed." + extFor(format.value);
            resolve(item);
          },
          format.value,
          q
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objURL); reject(new Error("无法读取图片")); };
      img.src = objURL;
    });
  }

  // ---- 批量压缩 ----
  compressBtn.addEventListener("click", async () => {
    if (!items.length) return;
    compressBtn.disabled = true;
    compressBtn.textContent = "压缩中…";
    for (const item of items) {
      try { await compressOne(item); } catch (err) { console.error(err); }
      renderResults();
    }
    compressBtn.disabled = false;
    compressBtn.textContent = "重新压缩";
    downloadAllBtn.hidden = items.every((i) => !i.blob);
    renderSummary();
  });

  // ---- 渲染结果 ----
  function renderResults() {
    results.innerHTML = "";
    items.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "result-card" + (item.blob ? "" : " pending");

      const thumb = document.createElement("img");
      thumb.className = "result-thumb";
      thumb.alt = item.file.name;
      thumb.src = item.url || URL.createObjectURL(item.file);

      const info = document.createElement("div");
      info.className = "result-info";
      const name = document.createElement("div");
      name.className = "result-name";
      name.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "result-meta";
      if (item.blob) {
        const saved = Math.max(0, Math.round((1 - item.blob.size / item.file.size) * 100));
        meta.innerHTML =
          formatBytes(item.file.size) +
          '<span class="arrow">→</span>' +
          formatBytes(item.blob.size) +
          ' <span class="save">省 ' + saved + "%</span>";
      } else {
        meta.textContent = formatBytes(item.file.size) + " · 待压缩";
      }
      info.appendChild(name);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "result-actions";
      if (item.blob) {
        const a = document.createElement("a");
        a.className = "download-link";
        a.href = item.url;
        a.download = item.name;
        a.textContent = "下载";
        actions.appendChild(a);
      }

      card.appendChild(thumb);
      card.appendChild(info);
      card.appendChild(actions);
      results.appendChild(card);
    });
  }

  function renderSummary() {
    const done = items.filter((i) => i.blob);
    if (!done.length) { summary.hidden = true; return; }
    const before = done.reduce((s, i) => s + i.file.size, 0);
    const after = done.reduce((s, i) => s + i.blob.size, 0);
    const saved = Math.max(0, Math.round((1 - after / before) * 100));
    summary.hidden = false;
    summary.textContent =
      `已压缩 ${done.length} 张图片：${formatBytes(before)} → ${formatBytes(after)}，共节省 ${saved}%`;
  }

  // ---- 打包下载（逐个触发下载，无需第三方库）----
  downloadAllBtn.addEventListener("click", () => {
    const done = items.filter((i) => i.blob);
    done.forEach((item, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = item.url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250); // 间隔触发，避免浏览器拦截
    });
  });

  // ---- 清空 ----
  clearBtn.addEventListener("click", () => {
    items.forEach((i) => { if (i.url) URL.revokeObjectURL(i.url); });
    items = [];
    results.innerHTML = "";
    summary.hidden = true;
    controls.hidden = true;
    downloadAllBtn.hidden = true;
    clearBtn.hidden = true;
    compressBtn.textContent = "开始压缩";
  });
})();
