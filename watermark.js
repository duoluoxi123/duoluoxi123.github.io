(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const controls = document.getElementById("controls");
  const wmText = document.getElementById("wmText");
  const wmPos = document.getElementById("wmPos");
  const wmSize = document.getElementById("wmSize");
  const wmSizeVal = document.getElementById("wmSizeVal");
  const wmOpacity = document.getElementById("wmOpacity");
  const wmOpacityVal = document.getElementById("wmOpacityVal");
  const wmColor = document.getElementById("wmColor");
  const wmAngle = document.getElementById("wmAngle");
  const wmAngleVal = document.getElementById("wmAngleVal");
  const applyBtn = document.getElementById("applyBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const clearBtn = document.getElementById("clearBtn");
  const results = document.getElementById("results");
  const summary = document.getElementById("summary");

  document.getElementById("year").textContent = new Date().getFullYear();

  /** @type {{file: File, blob: Blob|null, url: string|null, name: string}[]} */
  let items = [];

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function outMimeFor(type) {
    if (type === "image/png") return "image/png";
    if (type === "image/webp") return "image/webp";
    return "image/jpeg";
  }

  function extFor(mime) {
    return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  }

  function baseName(name) {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
  }

  wmSize.addEventListener("input", () => { wmSizeVal.textContent = wmSize.value; });
  wmOpacity.addEventListener("input", () => { wmOpacityVal.textContent = wmOpacity.value; });
  wmAngle.addEventListener("input", () => { wmAngleVal.textContent = wmAngle.value; });

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

  // 在画布上绘制水印（平铺或单个位置）
  function drawWatermark(ctx, w, h, o) {
    const text = (o.text || "").trim();
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = o.opacity;
    ctx.fillStyle = o.color;
    ctx.font = "bold " + o.fontSize + "px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textBaseline = "middle";
    const rad = (o.angle || 0) * Math.PI / 180;

    if (o.pos === "tile") {
      ctx.textAlign = "center";
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      const tw = Math.max(ctx.measureText(text).width, 1);
      const stepX = tw + o.fontSize * 2.2;
      const stepY = o.fontSize * 3;
      const diag = Math.sqrt(w * w + h * h);
      let row = 0;
      for (let y = -diag; y <= diag; y += stepY) {
        const rowOffset = (row % 2) * (stepX / 2); // 交错排列更自然
        for (let x = -diag; x <= diag; x += stepX) {
          ctx.fillText(text, x + rowOffset, y);
        }
        row++;
      }
    } else {
      const margin = Math.max(o.fontSize * 0.6, 12);
      let x, y, align;
      switch (o.pos) {
        case "tl": x = margin; y = margin + o.fontSize / 2; align = "left"; break;
        case "tr": x = w - margin; y = margin + o.fontSize / 2; align = "right"; break;
        case "bl": x = margin; y = h - margin - o.fontSize / 2; align = "left"; break;
        case "br": x = w - margin; y = h - margin - o.fontSize / 2; align = "right"; break;
        default: x = w / 2; y = h / 2; align = "center"; break;
      }
      ctx.textAlign = align;
      ctx.translate(x, y);
      ctx.rotate(rad);
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
  }

  function applyOne(item) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objURL = URL.createObjectURL(item.file);
      img.onload = function () {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          const mime = outMimeFor(item.file.type);
          if (mime === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);

          const fontSize = Math.max(12, Math.round(Math.min(w, h) * (parseInt(wmSize.value, 10) / 100)));
          drawWatermark(ctx, w, h, {
            text: wmText.value,
            pos: wmPos.value,
            fontSize: fontSize,
            opacity: parseInt(wmOpacity.value, 10) / 100,
            color: wmColor.value,
            angle: parseInt(wmAngle.value, 10),
          });

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objURL);
              if (item.url) URL.revokeObjectURL(item.url);
              if (!blob) { reject(new Error("生成失败")); return; }
              item.blob = blob;
              item.url = URL.createObjectURL(blob);
              item.name = baseName(item.file.name) + "_watermark." + extFor(mime);
              resolve(item);
            },
            mime,
            0.92
          );
        } catch (err) {
          URL.revokeObjectURL(objURL);
          reject(err);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objURL); reject(new Error("无法读取图片")); };
      img.src = objURL;
    });
  }

  applyBtn.addEventListener("click", async () => {
    if (!items.length) return;
    if (!wmText.value.trim()) { wmText.focus(); return; }
    applyBtn.disabled = true;
    applyBtn.textContent = "处理中…";
    for (const item of items) {
      try { await applyOne(item); } catch (err) { console.error(err); }
      renderResults();
    }
    applyBtn.disabled = false;
    applyBtn.textContent = "重新生成";
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
      meta.textContent = item.blob ? "已加水印 · " + formatBytes(item.blob.size) : formatBytes(item.file.size) + " · 待处理";
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
    summary.textContent = `已为 ${done.length} 张图片添加水印，点每张右侧「下载」或「打包下载全部」。`;
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
    applyBtn.textContent = "添加水印";
  });
})();
