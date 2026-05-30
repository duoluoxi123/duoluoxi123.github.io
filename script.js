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
  const targetSize = document.getElementById("targetSize");
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

  // ---- 把图片按指定尺寸/格式/质量编码为 Blob ----
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
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("编码失败"))), mime, q);
    });
  }

  // ---- 目标大小压缩：二分质量 + 自动缩小尺寸，尽量压到 targetBytes 以内 ----
  async function compressToTarget(img, baseW, baseH, mime, targetBytes) {
    const lossy = mime === "image/jpeg" || mime === "image/webp";
    let w = baseW, h = baseH;
    let smallest = null; // 全局最小（达不到目标时兜底）
    for (let round = 0; round < 9; round++) {
      if (lossy) {
        let lo = 0.05, hi = 1.0, found = null;
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          const blob = await encode(img, w, h, mime, mid);
          if (!smallest || blob.size < smallest.size) smallest = blob;
          if (blob.size <= targetBytes) { found = blob; lo = mid; } else { hi = mid; }
        }
        if (found) return { blob: found, hitTarget: true };
      } else {
        // PNG 等无损格式：质量参数无效，只能靠缩小尺寸
        const blob = await encode(img, w, h, mime, 1);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= targetBytes) return { blob, hitTarget: true };
      }
      // 当前尺寸压不到目标 → 缩小尺寸再来一轮
      w = Math.round(w * 0.8);
      h = Math.round(h * 0.8);
      if (w < 40 || h < 40) break;
    }
    return { blob: smallest, hitTarget: false };
  }

  // ---- 核心：压缩单张图片 ----
  function compressOne(item) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objURL = URL.createObjectURL(item.file);
      img.onload = async function () {
        try {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const limit = parseInt(maxWidth.value, 10) || 0;
          if (limit > 0 && w > limit) {
            h = Math.round((h * limit) / w);
            w = limit;
          }
          const mime = format.value;
          const targetKB = parseInt(targetSize.value, 10) || 0;

          let outBlob;
          if (targetKB > 0) {
            const r = await compressToTarget(img, w, h, mime, targetKB * 1024);
            outBlob = r.blob;
            item.hitTarget = r.hitTarget;
          } else {
            const q = parseInt(quality.value, 10) / 100;
            outBlob = await encode(img, w, h, mime, q);
            item.hitTarget = null;
          }
          URL.revokeObjectURL(objURL);
          if (item.url) URL.revokeObjectURL(item.url);

          // 绝不输出比原图更大的文件：若重新编码反而更大，则保留原图
          if (!outBlob || outBlob.size >= item.file.size) {
            item.blob = item.file;
            item.optimized = true;
            item.url = URL.createObjectURL(item.file);
            item.name = item.file.name;
          } else {
            item.blob = outBlob;
            item.optimized = false;
            item.url = URL.createObjectURL(outBlob);
            item.name = baseName(item.file.name) + "_compressed." + extFor(mime);
          }
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
        if (item.optimized) {
          meta.innerHTML =
            formatBytes(item.file.size) +
            ' <span class="save">已是最优 · 保留原图</span>';
        } else {
          const saved = Math.max(0, Math.round((1 - item.blob.size / item.file.size) * 100));
          let tail = ' <span class="save">省 ' + saved + "%</span>";
          if (item.hitTarget === false) {
            tail = ' <span class="save warn">已压到最小，仍超目标</span>';
          }
          meta.innerHTML =
            formatBytes(item.file.size) +
            '<span class="arrow">→</span>' +
            formatBytes(item.blob.size) +
            tail;
        }
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
    const keptCount = done.filter((i) => i.optimized).length;
    summary.hidden = false;
    let text = `已处理 ${done.length} 张图片：${formatBytes(before)} → ${formatBytes(after)}，共节省 ${saved}%`;
    if (keptCount > 0) text += `（其中 ${keptCount} 张已是最优，保留原图）`;
    summary.textContent = text;
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
