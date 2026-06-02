(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const controls = document.getElementById("controls");
  const mgDir = document.getElementById("mgDir");
  const mgGap = document.getElementById("mgGap");
  const mgBg = document.getElementById("mgBg");
  const mgFormat = document.getElementById("mgFormat");
  const mergeBtn = document.getElementById("mergeBtn");
  const clearBtn = document.getElementById("clearBtn");
  const inputList = document.getElementById("inputList");
  const output = document.getElementById("output");
  const summary = document.getElementById("summary");

  document.getElementById("year").textContent = new Date().getFullYear();

  /** @type {{file: File, url: string}[]} */
  let items = [];
  let outURL = null;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    incoming.forEach((file) => items.push({ file, url: URL.createObjectURL(file) }));
    controls.hidden = false;
    clearBtn.hidden = false;
    renderInputs();
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

  function renderInputs() {
    inputList.innerHTML = "";
    if (!items.length) return;
    const wrap = document.createElement("div");
    wrap.className = "input-thumbs";
    items.forEach((it, i) => {
      const box = document.createElement("div");
      box.className = "it";
      const img = document.createElement("img");
      img.src = it.url;
      img.alt = it.file.name;
      const idx = document.createElement("span");
      idx.className = "it-idx";
      idx.textContent = i + 1;
      box.appendChild(img);
      box.appendChild(idx);
      wrap.appendChild(box);
    });
    inputList.appendChild(wrap);
    const hint = document.createElement("p");
    hint.className = "dropzone-hint";
    hint.style.marginTop = "8px";
    hint.textContent = "按上面的编号顺序拼接（即添加顺序）。要调整顺序请清空后按目标顺序重新选择。";
    inputList.appendChild(hint);
  }

  function loadImg(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const u = URL.createObjectURL(file);
      img.onload = () => resolve({ img, url: u });
      img.onerror = () => { URL.revokeObjectURL(u); reject(new Error("无法读取图片")); };
      img.src = u;
    });
  }

  mergeBtn.addEventListener("click", async () => {
    if (!items.length) return;
    mergeBtn.disabled = true;
    mergeBtn.textContent = "拼接中…";
    summary.hidden = true;

    const loaded = [];
    for (const it of items) {
      try { loaded.push(await loadImg(it.file)); } catch (e) { console.error(e); }
    }

    try {
      if (!loaded.length) throw new Error("没有可用的图片");
      const dir = mgDir.value; // 'v' | 'h'
      const gap = Math.max(0, parseInt(mgGap.value, 10) || 0);
      const bg = mgBg.value;
      const outMime = mgFormat.value;

      const canvas = document.createElement("canvas");
      let drawn;

      if (dir === "v") {
        const targetW = Math.min.apply(null, loaded.map((o) => o.img.naturalWidth));
        const sizes = loaded.map((o) => ({
          w: targetW,
          h: Math.round((o.img.naturalHeight * targetW) / o.img.naturalWidth),
        }));
        const totalH = sizes.reduce((s, x) => s + x.h, 0) + gap * (loaded.length - 1);
        canvas.width = targetW;
        canvas.height = totalH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let y = 0;
        loaded.forEach((o, i) => { ctx.drawImage(o.img, 0, y, sizes[i].w, sizes[i].h); y += sizes[i].h + gap; });
        drawn = { w: targetW, h: totalH };
      } else {
        const targetH = Math.min.apply(null, loaded.map((o) => o.img.naturalHeight));
        const sizes = loaded.map((o) => ({
          h: targetH,
          w: Math.round((o.img.naturalWidth * targetH) / o.img.naturalHeight),
        }));
        const totalW = sizes.reduce((s, x) => s + x.w, 0) + gap * (loaded.length - 1);
        canvas.width = totalW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let x = 0;
        loaded.forEach((o, i) => { ctx.drawImage(o.img, x, 0, sizes[i].w, sizes[i].h); x += sizes[i].w + gap; });
        drawn = { w: totalW, h: targetH };
      }

      await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("拼接结果过大，浏览器无法生成。请减少图片数量或改用横向/缩小后再试。")); return; }
          if (outURL) URL.revokeObjectURL(outURL);
          outURL = URL.createObjectURL(blob);
          const ext = outMime === "image/png" ? "png" : "jpg";
          renderOutput(outURL, "拼接图_" + Date.now() + "." + ext, drawn, blob.size);
          resolve();
        }, outMime, 0.92);
      });
    } catch (err) {
      output.innerHTML = "";
      summary.hidden = false;
      summary.style.background = "#fdecec";
      summary.style.borderColor = "#f5c2c2";
      summary.style.color = "#b42318";
      summary.textContent = "拼接失败：" + err.message;
    } finally {
      loaded.forEach((o) => URL.revokeObjectURL(o.url));
      mergeBtn.disabled = false;
      mergeBtn.textContent = "重新拼接";
    }
  });

  function renderOutput(url, name, drawn, size) {
    output.innerHTML = "";
    const box = document.createElement("div");
    box.className = "merge-output";

    const img = document.createElement("img");
    img.className = "merge-preview";
    img.src = url;
    img.alt = "拼接结果预览";

    const meta = document.createElement("p");
    meta.className = "result-meta";
    meta.textContent = `尺寸 ${drawn.w}×${drawn.h} · ${formatBytes(size)}`;

    const a = document.createElement("a");
    a.className = "btn btn-secondary";
    a.href = url;
    a.download = name;
    a.textContent = "下载拼接图";
    a.style.display = "inline-block";
    a.style.textDecoration = "none";

    box.appendChild(img);
    box.appendChild(meta);
    box.appendChild(a);
    output.appendChild(box);
  }

  clearBtn.addEventListener("click", () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    items = [];
    inputList.innerHTML = "";
    output.innerHTML = "";
    if (outURL) { URL.revokeObjectURL(outURL); outURL = null; }
    summary.hidden = true;
    controls.hidden = true;
    clearBtn.hidden = true;
    mergeBtn.textContent = "开始拼接";
  });
})();
