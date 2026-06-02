(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const controls = document.getElementById("controls");
  const format = document.getElementById("format");
  const quality = document.getElementById("quality");
  const qualityVal = document.getElementById("qualityVal");
  const qualityRow = document.getElementById("qualityRow");
  const convertBtn = document.getElementById("convertBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const clearBtn = document.getElementById("clearBtn");
  const results = document.getElementById("results");
  const summary = document.getElementById("summary");

  document.getElementById("year").textContent = new Date().getFullYear();

  /** @type {{file: File, blob: Blob|null, url: string|null, name: string, srcType: string, outType?: string}[]} */
  let items = [];

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function extFor(mime) {
    return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  }

  function labelFor(mime) {
    if (mime === "image/png") return "PNG";
    if (mime === "image/webp") return "WebP";
    if (mime === "image/jpeg") return "JPG";
    return (mime || "图片").replace("image/", "").toUpperCase();
  }

  function baseName(name) {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
  }

  // PNG 是无损格式，质量参数无效，转 PNG 时隐藏质量滑块
  function syncQualityRow() {
    qualityRow.style.display = format.value === "image/png" ? "none" : "";
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    incoming.forEach((file) =>
      items.push({ file, blob: null, url: null, name: file.name, srcType: file.type })
    );
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
  format.addEventListener("change", syncQualityRow);

  // 把图片重新编码为目标格式
  function encode(img, w, h, mime, q) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      // JPG 不支持透明，填白底，避免透明区域变黑
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("转换失败"))), mime, q);
    });
  }

  function convertOne(item) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objURL = URL.createObjectURL(item.file);
      img.onload = async function () {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const mime = format.value;
          const q = parseInt(quality.value, 10) / 100;
          const outBlob = await encode(img, w, h, mime, q);
          URL.revokeObjectURL(objURL);
          if (item.url) URL.revokeObjectURL(item.url);
          item.blob = outBlob;
          item.outType = mime;
          item.url = URL.createObjectURL(outBlob);
          item.name = baseName(item.file.name) + "." + extFor(mime);
          resolve(item);
        } catch (err) {
          URL.revokeObjectURL(objURL);
          reject(err);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objURL); reject(new Error("无法读取图片")); };
      img.src = objURL;
    });
  }

  convertBtn.addEventListener("click", async () => {
    if (!items.length) return;
    convertBtn.disabled = true;
    convertBtn.textContent = "转换中…";
    for (const item of items) {
      try { await convertOne(item); } catch (err) { console.error(err); }
      renderResults();
    }
    convertBtn.disabled = false;
    convertBtn.textContent = "重新转换";
    downloadAllBtn.hidden = items.every((i) => !i.blob);
    renderSummary();
  });

  function renderResults() {
    results.innerHTML = "";
    items.forEach((item) => {
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
        meta.innerHTML =
          labelFor(item.srcType) + '<span class="arrow">→</span>' + labelFor(item.outType) +
          " · " + formatBytes(item.file.size) + '<span class="arrow">→</span>' + formatBytes(item.blob.size);
      } else {
        meta.textContent = labelFor(item.srcType) + " · " + formatBytes(item.file.size) + " · 待转换";
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
    summary.hidden = false;
    summary.textContent = `已转换 ${done.length} 张图片，点每张右侧「下载」或「打包下载全部」。`;
  }

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
      }, i * 250);
    });
  });

  clearBtn.addEventListener("click", () => {
    items.forEach((i) => { if (i.url) URL.revokeObjectURL(i.url); });
    items = [];
    results.innerHTML = "";
    summary.hidden = true;
    controls.hidden = true;
    downloadAllBtn.hidden = true;
    clearBtn.hidden = true;
    convertBtn.textContent = "开始转换";
  });

  syncQualityRow();
})();
