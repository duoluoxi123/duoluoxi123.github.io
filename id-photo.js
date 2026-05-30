(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone"), fileInput = $("fileInput"), pickBtn = $("pickBtn"),
    controls = $("controls"), sizePreset = $("sizePreset"), customSizeWrap = $("customSizeWrap"),
    customW = $("customW"), customH = $("customH"), bgColor = $("bgColor"),
    targetSize = $("targetSize"), genBtn = $("genBtn"), clearBtn = $("clearBtn"),
    results = $("results"), summary = $("summary");

  let file = null;
  let resultUrl = null;

  function formatBytes(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  }

  function loadImage(f) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => { img._objUrl = url; resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("无法读取图片")); };
      img.src = url;
    });
  }

  // 居中裁剪(cover)到目标宽高，输出 JPEG Blob
  function render(img, src, dw, dh, q, bg) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      // JPEG 不支持透明，先铺底色（默认白）；选了底色则用所选色
      ctx.fillStyle = bg || "#ffffff";
      ctx.fillRect(0, 0, dw, dh);
      ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, dw, dh);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("生成失败"))), "image/jpeg", q);
    });
  }

  // 计算居中裁剪的源矩形（保证不变形、铺满目标比例）
  function coverRect(iw, ih, dw, dh) {
    const ta = dw / dh, ia = iw / ih;
    let sw, sh, sx, sy;
    if (ia > ta) { sh = ih; sw = ih * ta; sx = (iw - sw) / 2; sy = 0; }
    else { sw = iw; sh = iw / ta; sx = 0; sy = (ih - sh) / 2; }
    return { sx, sy, sw, sh };
  }

  // 固定尺寸下二分画质，压到目标大小内（证件照尺寸不能改，只能调画质）
  async function renderToTarget(img, src, dw, dh, bg, targetBytes) {
    let lo = 0.05, hi = 1, found = null, smallest = null;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const b = await render(img, src, dw, dh, mid, bg);
      if (!smallest || b.size < smallest.size) smallest = b;
      if (b.size <= targetBytes) { found = b; lo = mid; } else { hi = mid; }
    }
    return found ? { blob: found, hit: true } : { blob: smallest, hit: false };
  }

  function getDims() {
    if (sizePreset.value === "custom") {
      return [parseInt(customW.value, 10), parseInt(customH.value, 10)];
    }
    const parts = sizePreset.value.split("x");
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }

  function setFile(f) {
    if (!f || !f.type.startsWith("image/")) return;
    file = f;
    controls.hidden = false;
    clearBtn.hidden = false;
    summary.hidden = true;
    results.innerHTML = "";
  }

  async function generate() {
    if (!file) return;
    const [dw, dh] = getDims();
    if (!dw || !dh || dw < 1 || dh < 1) { alert("请填写有效的自定义尺寸（宽、高像素）"); return; }
    genBtn.disabled = true;
    genBtn.textContent = "生成中…";
    let img = null;
    try {
      img = await loadImage(file);
      const src = coverRect(img.naturalWidth, img.naturalHeight, dw, dh);
      const bg = bgColor.value || "#ffffff";
      const targetKB = parseInt(targetSize.value, 10) || 0;
      let blob, hit = null;
      if (targetKB > 0) {
        const r = await renderToTarget(img, src, dw, dh, bg, targetKB * 1024);
        blob = r.blob; hit = r.hit;
      } else {
        blob = await render(img, src, dw, dh, 0.92, bg);
      }
      showResult(blob, dw, dh, hit);
    } catch (e) {
      console.error(e);
      alert("生成失败，请换一张图片再试。");
    } finally {
      if (img && img._objUrl) URL.revokeObjectURL(img._objUrl);
      genBtn.disabled = false;
      genBtn.textContent = "重新生成";
    }
  }

  function showResult(blob, dw, dh, hit) {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    const name = "证件照_" + dw + "x" + dh + ".jpg";
    results.innerHTML = "";

    const card = document.createElement("div");
    card.className = "result-card";

    const thumb = document.createElement("img");
    thumb.className = "idp-thumb";
    thumb.src = resultUrl;
    thumb.alt = "证件照预览";

    const info = document.createElement("div");
    info.className = "result-info";
    const nm = document.createElement("div");
    nm.className = "result-name";
    nm.textContent = name;
    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.innerHTML = dw + "×" + dh + " 像素 · " + formatBytes(blob.size) +
      (hit === false ? ' <span class="save warn">已压到最小，仍超目标</span>' : "");
    info.appendChild(nm);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "result-actions";
    const a = document.createElement("a");
    a.className = "download-link";
    a.href = resultUrl;
    a.download = name;
    a.textContent = "下载";
    actions.appendChild(a);

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(actions);
    results.appendChild(card);

    summary.hidden = false;
    summary.textContent = "已生成 " + dw + "×" + dh + " 证件照，" + formatBytes(blob.size) + "，点击右侧下载。";
  }

  function clearAll() {
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    file = null;
    fileInput.value = "";
    results.innerHTML = "";
    summary.hidden = true;
    controls.hidden = true;
    clearBtn.hidden = true;
    genBtn.textContent = "生成证件照";
  }

  // ---- 事件 ----
  pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
  dropzone.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });

  sizePreset.addEventListener("change", () => {
    customSizeWrap.hidden = sizePreset.value !== "custom";
  });

  genBtn.addEventListener("click", generate);
  clearBtn.addEventListener("click", clearAll);
})();
