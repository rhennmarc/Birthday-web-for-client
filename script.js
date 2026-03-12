(function () {
  "use strict";

  const config = {
    countdown: 3,
    rainChars: "HAPPYBIRTHDAY",
    rainColor1: "#ff69b4",
    rainColor2: "#ffffff",
    textColor: "#ff9999",
    mainText: "HAPPY|BIRTHDAY|MY LOVE",
    showBook: true,
    showHearts: true,
    photos: [],
  };
  const defaultPhotos = Array.from(
    { length: 10 },
    (_, i) => `images/${i + 1}.jpg`,
  );

  /* ── DOM ── */
  const canvas = document.getElementById("main-canvas"),
    ctx = canvas.getContext("2d");
  const starrySky = document.getElementById("starry-sky");
  const sparkleLayer = document.getElementById("sparkle-layer");
  const memoryBook = document.getElementById("memory-book");
  const bookCoverPanel = document.getElementById("book-cover-panel");
  const bookOpenPanel = document.getElementById("book-open-panel");
  const coverCard = document.getElementById("cover-card");
  const photoLeft = document.getElementById("photo-left");
  const photoRight = document.getElementById("photo-right");
  const pageTurnWrap = document.getElementById("page-turn-wrapper");
  const turnFrontPhoto = document.getElementById("turn-photo-front");
  const turnBackPhoto = document.getElementById("turn-photo-back");
  const spreadProgress = document.getElementById("spread-progress");
  const bookTapHint = document.getElementById("book-tap-hint");
  const bookMessageCard = document.getElementById("book-message-card");
  const heartGallery = document.getElementById("heart-gallery");
  const heartCardsLayer = document.getElementById("heart-cards-layer");
  const galleryTitle = document.getElementById("gallery-title");
  const floatingHearts = document.getElementById("floating-hearts");
  const confettiLayer = document.getElementById("confetti-layer");
  const playBtn = document.getElementById("play-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsOverlay = document.getElementById("settings-overlay");
  const applySettingsBtn = document.getElementById("apply-settings");
  const audioUpload = document.getElementById("audio-upload");
  const audioPlayer = document.getElementById("audio-player");
  const bgMusic = document.getElementById("bg-music");
  const photoUpload = document.getElementById("photo-upload");
  const photoPreview = document.getElementById("photo-preview");
  const landscapePrompt = document.getElementById("landscape-prompt");

  let isPlaying = false,
    rainAnimId = null,
    heartsInterval = null;

  /* ── EASING ── */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ── INIT ── */
  function init() {
    config.photos = [...defaultPhotos];
    bgMusic.src = "Happy_Birthday.mp3";
    bgMusic.loop = true;
    resizeCanvas();
    window.addEventListener("resize", () => { resizeCanvas(); checkOrientation(); });
    window.addEventListener("orientationchange", checkOrientation);
    checkOrientation();
    playBtn.addEventListener("click", togglePlay);
    settingsBtn.addEventListener("click", openSettings);
    closeSettingsBtn.addEventListener("click", closeSettings);
    settingsOverlay.addEventListener("click", closeSettings);
    applySettingsBtn.addEventListener("click", applySettings);
    audioUpload.addEventListener("change", handleAudioUpload);
    photoUpload.addEventListener("change", handlePhotoUpload);
    initRain();
    startRainAnimation();
  }
  function checkOrientation() {
    landscapePrompt.style.display =
      window.innerHeight > window.innerWidth && window.innerWidth < 768 ? "" : "none";
  }
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initRain();
  }
  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ── RAIN ── */
  const FS = 20, TRAIL = 8, EVERY = 5;
  let streams = [], fc = 0;
  function rc() {
    const s = config.rainChars;
    return s[Math.floor(Math.random() * s.length)];
  }
  function initRain() {
    const cols = Math.floor(canvas.width / FS);
    streams = [];
    fc = 0;
    for (let c = 0; c < cols; c++)
      streams.push({
        x: c * FS,
        y: Math.random() * canvas.height - canvas.height,
        spd: 0.8 + Math.random() * 0.9,
        chars: Array.from({ length: TRAIL }, rc),
        ph: Math.floor(Math.random() * EVERY),
      });
  }
  function drawRain() {
    fc++;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${FS}px 'Courier New',monospace`;
    for (const s of streams) {
      if (fc % EVERY === s.ph)
        for (let i = 0; i < s.chars.length; i++)
          if (Math.random() < 0.4) s.chars[i] = rc();
      for (let i = 0; i < TRAIL; i++) {
        const cy = s.y - i * FS;
        if (cy < -FS || cy > canvas.height) continue;
        const a = i === 0 ? 1 : Math.max(0, 1 - (i / TRAIL) * 1.4);
        ctx.fillStyle = hexToRgba(i === 0 ? config.rainColor2 : config.rainColor1, a);
        ctx.fillText(s.chars[i], s.x, cy);
      }
      s.y += s.spd;
      if (s.y - TRAIL * FS > canvas.height) {
        s.y = -FS * (2 + Math.random() * 6);
        s.spd = 0.8 + Math.random() * 0.9;
        s.chars = Array.from({ length: TRAIL }, rc);
      }
    }
  }
  function startRainAnimation() {
    function a() { drawRain(); rainAnimId = requestAnimationFrame(a); }
    a();
  }
  function stopRainAnimation() {
    if (rainAnimId) { cancelAnimationFrame(rainAnimId); rainAnimId = null; }
  }

  /* ── DOT MATRIX ── */
  function getDots(text, fontSize) {
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const oc = off.getContext("2d");
    oc.font = `bold ${fontSize}px Arial,sans-serif`;
    oc.textAlign = "center";
    oc.textBaseline = "middle";
    oc.fillStyle = "white";
    oc.fillText(text, off.width / 2, off.height / 2);
    const id = oc.getImageData(0, 0, off.width, off.height),
      dots = [],
      ds = 5,
      step = ds + 2;
    for (let y = 0; y < off.height; y += step)
      for (let x = 0; x < off.width; x += step)
        if (id.data[(y * off.width + x) * 4 + 3] > 128) dots.push({ x, y });
    return { dots, dotSize: ds };
  }
  function drawDots(dots, dotSize, color, alpha) {
    ctx.fillStyle = hexToRgba(color, alpha);
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  async function animateCountdown(num) {
    const fs = Math.min(canvas.width * 0.4, 300),
      { dots, dotSize } = getDots(String(num), fs);
    const dur = 1500,
      cx = canvas.width / 2,
      cy = canvas.height / 2;
    const pts = dots.map((d) => {
      const a = Math.random() * Math.PI * 2,
        r = Math.max(canvas.width, canvas.height) * (0.3 + Math.random() * 0.55);
      return { tx: d.x, ty: d.y, sx: cx + Math.cos(a) * r, sy: cy + Math.sin(a) * r };
    });
    const t0 = performance.now();
    await new Promise((res) => {
      function f(now) {
        if (!isPlaying) { res(); return; }
        const p = Math.min((now - t0) / dur, 1);
        drawRain();
        if (p < 0.45) {
          const t = easeOutCubic(p / 0.45);
          ctx.save();
          ctx.shadowBlur = lerp(0, 48, t);
          ctx.shadowColor = config.textColor;
          ctx.fillStyle = hexToRgba(config.textColor, lerp(0.1, 1, t));
          for (const pt of pts) {
            ctx.beginPath();
            ctx.arc(lerp(pt.sx, pt.tx, t), lerp(pt.sy, pt.ty, t), dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (p < 0.75) {
          const t = (p - 0.45) / 0.3,
            pulse = 1 + Math.sin(t * Math.PI * 2.5) * 0.028;
          ctx.save();
          ctx.shadowBlur = 30 + Math.sin(t * Math.PI * 3) * 14;
          ctx.shadowColor = config.textColor;
          ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
          drawDots(dots, dotSize, config.textColor, 1);
          ctx.restore();
        } else {
          const t = easeInOutCubic((p - 0.75) / 0.25),
            sc = lerp(1, 1.75, t);
          ctx.save();
          ctx.shadowBlur = lerp(30, 0, t);
          ctx.shadowColor = config.textColor;
          ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
          drawDots(dots, dotSize, config.textColor, lerp(1, 0, t));
          ctx.restore();
        }
        if (p < 1) requestAnimationFrame(f);
        else res();
      }
      requestAnimationFrame(f);
    });
  }
  async function animateWord(word) {
    const fs = Math.min(canvas.width * 0.12, 200),
      { dots, dotSize } = getDots(word.trim(), fs);
    const dur = 2600,
      cx = canvas.width / 2,
      cy = canvas.height / 2;
    const pts = dots.map((d) => ({
      tx: d.x, ty: d.y,
      sx: d.x + (Math.random() - 0.5) * canvas.width * 0.65,
      sy: canvas.height + 60 + Math.random() * canvas.height * 0.35,
    }));
    const t0 = performance.now();
    await new Promise((res) => {
      function f(now) {
        if (!isPlaying) { res(); return; }
        const p = Math.min((now - t0) / dur, 1);
        drawRain();
        if (p < 0.24) {
          const t = easeOutCubic(p / 0.24);
          ctx.save();
          ctx.shadowBlur = lerp(0, 34, t);
          ctx.shadowColor = config.textColor;
          ctx.fillStyle = hexToRgba(config.textColor, lerp(0, 1, t));
          for (const pt of pts) {
            ctx.beginPath();
            ctx.arc(lerp(pt.sx, pt.tx, t), lerp(pt.sy, pt.ty, t), dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (p < 0.78) {
          const t = (p - 0.24) / 0.54,
            pulse = 1 + Math.sin(t * Math.PI * 2.2) * 0.018;
          ctx.save();
          ctx.shadowBlur = 22 + Math.sin(t * Math.PI * 2.7) * 10;
          ctx.shadowColor = config.textColor;
          ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
          drawDots(dots, dotSize, config.textColor, 1);
          ctx.restore();
        } else {
          const t = easeInOutCubic((p - 0.78) / 0.22);
          ctx.save();
          ctx.shadowBlur = lerp(22, 0, t);
          ctx.shadowColor = config.textColor;
          ctx.translate(0, lerp(0, -28, t));
          drawDots(dots, dotSize, config.textColor, lerp(1, 0, t));
          ctx.restore();
        }
        if (p < 1) requestAnimationFrame(f);
        else res();
      }
      requestAnimationFrame(f);
    });
  }

  /* ── STARS / SPARKLES / CONFETTI ── */
  function createStars() {
    starrySky.innerHTML = "";
    for (let i = 0; i < 200; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const sz = 0.8 + Math.random() * 2.5;
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${sz}px;height:${sz}px;--duration:${1.5 + Math.random() * 4}s;--delay:${Math.random() * 6}s`;
      starrySky.appendChild(s);
    }
  }
  function burstSparkles(n) {
    sparkleLayer.classList.remove("hidden");
    const cl = ["#ff69b4", "#ffb6c1", "#fff", "#ffd700", "#e91e63", "#ffc0cb"];
    for (let i = 0; i < (n || 18); i++) {
      const sp = document.createElement("div");
      sp.className = "sparkle";
      const ang = Math.random() * Math.PI * 2,
        d1 = 30 + Math.random() * 60,
        d2 = 80 + Math.random() * 130,
        dur = 0.6 + Math.random() * 0.8;
      sp.style.cssText = `left:${5 + Math.random() * 90}%;top:${5 + Math.random() * 90}%;--dur:${dur}s;--sz:${10 + Math.random() * 18}px;--col:${cl[Math.floor(Math.random() * cl.length)]};--tx1:${Math.cos(ang) * d1}px;--ty1:${Math.sin(ang) * d1}px;--tx2:${Math.cos(ang) * d2}px;--ty2:${Math.sin(ang) * d2}px;`;
      sparkleLayer.appendChild(sp);
      setTimeout(() => sp.remove(), dur * 1000 + 100);
    }
  }
  function launchConfetti(n) {
    const p = ["#ff69b4","#ff1493","#ffd700","#98ff98","#87ceeb","#f5a0c0","#fff"];
    for (let i = 0; i < (n || 80); i++)
      setTimeout(() => {
        const c = document.createElement("div");
        c.className = "confetti-piece";
        c.style.cssText = `left:${15 + Math.random() * 70}%;top:-10px;background:${p[Math.floor(Math.random() * p.length)]};--dur:${1.5 + Math.random() * 2.5}s;--dx:${(Math.random() - 0.5) * 220}px;border-radius:${Math.random() > 0.5 ? "50%" : "2px"};width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;`;
        confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), 5000);
      }, Math.random() * 900);
  }

  /* ═══════════════════════════════════════════════════════════
     HEART GALLERY — dense overlapping layout like screenshot
  ═══════════════════════════════════════════════════════════ */
  function buildHeartGallery() {
    heartCardsLayer.innerHTML = "";
    const photos = config.photos,
      vw = window.innerWidth,
      vh = window.innerHeight;
    const isMobile = vw < 768;
    const N = isMobile ? 12 : 14;

    /* Heart parametric constants */
    const HX = 1.18, HW = 16 * HX;
    const HH_UP = 12.3, HH_DOWN = 17.0;

    /* ── Card size ── */
    const CW = Math.round(Math.min(vw * (isMobile ? 0.13 : 0.115), 130));
    const CH = Math.round(CW * 1.26);

    /* ── Scale: target heart to ~58% viewport width, capped by height ── */
    const targetHeartW = Math.min(vw * 0.58, 700);
    const scaleByW = (targetHeartW - CW * 0.5) / (2 * HW);
    const scaleByH = (vh * 0.80 - CH * 0.5) / (HH_UP + HH_DOWN);
    const scale = Math.min(scaleByW, scaleByH);

    /* Container */
    const layerW = Math.round(2 * HW * scale + CW);
    const layerH = Math.round((HH_UP + HH_DOWN) * scale + CH);
    const originX = layerW / 2;
    const originY = CH / 2 + HH_UP * scale;

    heartCardsLayer.style.cssText = `position:relative;width:${layerW}px;height:${layerH}px;`;

    /* Arc-length sampling for even distribution */
    const SAMPLES = 9000;
    const hpts = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * 2 * Math.PI;
      hpts.push({
        hx: 16 * Math.pow(Math.sin(t), 3) * HX,
        hy: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
      });
    }
    const cumLen = [0];
    for (let i = 1; i < hpts.length; i++) {
      const dx = hpts[i].hx - hpts[i - 1].hx,
        dy = hpts[i].hy - hpts[i - 1].hy;
      cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    function arcPt(target) {
      let lo = 0, hi = SAMPLES;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (cumLen[m] < target) lo = m + 1;
        else hi = m;
      }
      if (lo === 0) return { ...hpts[0] };
      const span = cumLen[lo] - cumLen[lo - 1],
        frac = span > 0 ? (target - cumLen[lo - 1]) / span : 0;
      return {
        hx: hpts[lo - 1].hx + frac * (hpts[lo].hx - hpts[lo - 1].hx),
        hy: hpts[lo - 1].hy + frac * (hpts[lo].hy - hpts[lo - 1].hy),
      };
    }
    const positions = Array.from({ length: N }, (_, i) =>
      arcPt(((i / N + 0.04) * totalLen) % totalLen),
    );

    for (let i = 0; i < N; i++) {
      const { hx, hy } = positions[i];
      const sx = originX + hx * scale,
        sy = originY - hy * scale;

      /* Natural outward rotation from heart center */
      const outAng = Math.atan2(-(sy - originY), sx - originX) * (180 / Math.PI);
      const rot = outAng * 0.08 + (Math.random() - 0.5) * 12;

      /* Z-index: lower cards (bottom of heart) render on top */
      const zIdx = Math.round(10 + (sy / layerH) * 20);

      const card = document.createElement("div");
      card.className = "heart-photo-card";
      card.style.cssText = `
        left:${sx - CW / 2}px;
        top:${sy - CH / 2}px;
        width:${CW}px;
        height:${CH}px;
        --delay:${i * 0.14}s;
        --rot:${rot}deg;
        z-index:${zIdx};
      `;

      const img = document.createElement("img");
      img.src = photos[i % photos.length];
      img.alt = `Photo ${(i % photos.length) + 1}`;
      img.onerror = function () {
        card.style.background = "linear-gradient(135deg,#ff69b4,#c71585)";
        this.style.display = "none";
      };
      card.appendChild(img);

      if (i % 3 === 0) {
        const deco = document.createElement("div");
        deco.className = "card-deco";
        deco.innerHTML = "&#x1F495;";
        card.appendChild(deco);
      }
      heartCardsLayer.appendChild(card);
    }
  }

  /* ── FLOATING HEARTS ── */
  function startFloatingHearts() {
    if (heartsInterval) clearInterval(heartsInterval);
    heartsInterval = setInterval(() => {
      const h = document.createElement("div");
      h.className = "floating-heart";
      const em = ["❤","💕","💖","💗","💓","✨","🌸","🎀"],
        cl = ["#ff69b4","#ff1493","#e91e63","#f48fb1","#ffc0cb"];
      h.innerHTML = em[Math.floor(Math.random() * em.length)];
      h.style.cssText = `left:${Math.random() * 100}%;bottom:0;font-size:${14 + Math.random() * 18}px;--duration:${5 + Math.random() * 5}s;color:${cl[Math.floor(Math.random() * cl.length)]}`;
      floatingHearts.appendChild(h);
      setTimeout(() => h.remove(), 12000);
    }, 340);
  }
  function stopFloatingHearts() {
    if (heartsInterval) { clearInterval(heartsInterval); heartsInterval = null; }
    floatingHearts.innerHTML = "";
  }

  /* ═══════════════════════════════════════════════════════════
     MEMORY BOOK — FULL-WIDTH COVER FLIP (improved animation)
  ═══════════════════════════════════════════════════════════ */
  function getSpreads() {
    return Array.from({ length: 5 }, (_, i) => ({
      left:  config.photos[i * 2]     || defaultPhotos[i * 2],
      right: config.photos[i * 2 + 1] || defaultPhotos[i * 2 + 1],
    }));
  }
  function setSpreadProgress(idx) {
    spreadProgress.querySelectorAll(".spread-dot")
      .forEach((d, i) => d.classList.toggle("active", i === idx));
  }
  let bookTapResolve = null;
  function waitForBookTap() {
    return new Promise((res) => {
      if (!isPlaying) { res(); return; }
      bookTapHint.style.opacity = "1";
      bookTapResolve = res;
      memoryBook.addEventListener("click", onBookTap, { once: true });
    });
  }
  function onBookTap() {
    bookTapHint.style.opacity = "0";
    if (bookTapResolve) { bookTapResolve(); bookTapResolve = null; }
  }
  function cancelBookTap() {
    memoryBook.removeEventListener("click", onBookTap);
    bookTapHint.style.opacity = "0";
    if (bookTapResolve) { bookTapResolve(); bookTapResolve = null; }
  }

  async function showMemoryBook() {
    if (!config.showBook) return;
    const spreads = getSpreads();

    /* Reset */
    coverCard.style.transition = "none";
    coverCard.style.transform = "rotateY(0deg)";
    bookMessageCard.classList.add("hidden");
    photoLeft.src = spreads[0].left;
    photoRight.src = spreads[0].right;

    memoryBook.classList.remove("hidden");
    bookOpenPanel.style.cssText = "";
    bookOpenPanel.classList.remove("hidden");
    bookCoverPanel.classList.remove("hidden");
    bookTapHint.style.opacity = "0";

    burstSparkles(14);

    /* ── Idle "breathing" animation while waiting for tap ── */
    let breatheId = null;
    let breatheActive = true;
    const breatheStart = performance.now();
    function animateBreathe(now) {
      if (!breatheActive) return;
      const t = (now - breatheStart) / 1000;
      const tiltY = Math.sin(t * 0.8) * 3;
      const tiltX = Math.cos(t * 0.5) * 1.5;
      const scale = 1 + Math.sin(t * 1.1) * 0.008;
      coverCard.style.transform =
        `rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale(${scale})`;
      breatheId = requestAnimationFrame(animateBreathe);
    }
    breatheId = requestAnimationFrame(animateBreathe);

    /* Wait for tap */
    await new Promise((res) => {
      if (!isPlaying) { res(); return; }
      coverCard.addEventListener("click", res, { once: true });
    });

    /* Stop breathing */
    breatheActive = false;
    if (breatheId) cancelAnimationFrame(breatheId);
    breatheId = null;
    if (!isPlaying) return;

    /* ── Phase 1: Snap to neutral + wind-up resist ── */
    coverCard.style.transition = "transform 0.12s ease-out";
    coverCard.style.transform = "rotateY(0deg) rotateX(0deg) scale(1)";
    await sleep(130);
    if (!isPlaying) return;

    /* ── Phase 2: Wind-up tilt forward (feel of resistance) ── */
    coverCard.style.transition = "transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)";
    coverCard.style.transform = "rotateY(8deg) rotateX(-2deg) scale(1.01)";
    await sleep(210);
    if (!isPlaying) return;

    /* ── Phase 3: Main flip — spine pivot, dramatic easing ── */
    coverCard.style.transition =
      "transform 1.6s cubic-bezier(0.77,0,0.175,1)";
    coverCard.style.transform = "rotateY(-180deg)";

    /* Progressive shadow that blooms then fades */
    setTimeout(() => {
      const sh = document.createElement("div");
      sh.className = "cover-flip-shadow";
      bookCoverPanel.appendChild(sh);
      sh.getBoundingClientRect();
      sh.style.opacity = "1";
      setTimeout(() => {
        sh.style.transition = "opacity 0.6s ease";
        sh.style.opacity = "0";
        setTimeout(() => sh.remove(), 650);
      }, 500);
    }, 200);

    /* Glow pulse on the cover edge at midpoint */
    setTimeout(() => {
      if (!isPlaying) return;
      coverCard.style.filter = "drop-shadow(0 0 28px rgba(255,105,180,0.95))";
      setTimeout(() => {
        coverCard.style.filter = "drop-shadow(0 28px 55px rgba(0,0,0,.75))";
      }, 400);
    }, 650);

    /* Sparkles at midpoint */
    setTimeout(() => { if (isPlaying) burstSparkles(14); }, 800);

    await sleep(1700);
    if (!isPlaying) return;

    /* ── Phase 4: Cleanup, reveal book ── */
    document.querySelectorAll(".cover-flip-shadow").forEach((e) => e.remove());
    bookCoverPanel.classList.add("hidden");
    coverCard.style.cssText = "";
    setSpreadProgress(0);
    burstSparkles(10);

    bookMessageCard.classList.remove("hidden");

    /* Page turns */
    for (let i = 1; i < spreads.length; i++) {
      await waitForBookTap();
      if (!isPlaying) return;
      await flipPage(spreads[i]);
      setSpreadProgress(i);
      burstSparkles(8);
    }
    if (!isPlaying) return;
    await waitForBookTap();
    if (!isPlaying) return;
    cancelBookTap();

    /* Fade out */
    bookMessageCard.style.transition = "opacity .5s";
    bookMessageCard.style.opacity = "0";
    bookOpenPanel.style.transition = "opacity .5s,transform .5s";
    bookOpenPanel.style.opacity = "0";
    bookOpenPanel.style.transform = "scale(.84)";
    await sleep(540);
    memoryBook.classList.add("hidden");
    bookOpenPanel.style.cssText = "";
    bookOpenPanel.classList.add("hidden");
    bookMessageCard.style.cssText = "";
    bookMessageCard.classList.add("hidden");
  }

  async function flipPage(spread) {
    turnFrontPhoto.src = photoRight.src;
    turnBackPhoto.src = spread.left;
    pageTurnWrap.style.transition = "none";
    pageTurnWrap.style.transform = "rotateY(0deg)";
    pageTurnWrap.style.visibility = "visible";
    photoRight.src = spread.right;
    await sleep(30);
    pageTurnWrap.style.transition = "transform 1.1s cubic-bezier(.645,.045,.355,1)";
    pageTurnWrap.style.transform = "rotateY(-180deg)";
    await sleep(1150);
    photoLeft.src = spread.left;
    pageTurnWrap.style.transition = "none";
    pageTurnWrap.style.transform = "rotateY(0deg)";
    pageTurnWrap.style.visibility = "hidden";
  }

  /* ── MAIN SEQUENCE ── */
  function togglePlay() {
    if (isPlaying) {
      resetAll();
      playBtn.querySelector(".play-icon").innerHTML = "&#9654;";
    } else {
      startSequence();
      playBtn.querySelector(".play-icon").innerHTML = "&#9646;&#9646;";
    }
  }
  function hideAllScenes() {
    [starrySky, sparkleLayer, memoryBook, heartGallery].forEach((el) =>
      el.classList.add("hidden"),
    );
    canvas.style.display = "";
    stopFloatingHearts();
  }
  function resetAll() {
    isPlaying = false;
    cancelBookTap();
    hideAllScenes();
    stopRainAnimation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiLayer.innerHTML = "";
    document.querySelectorAll(".cover-flip-shadow").forEach((e) => e.remove());
    coverCard.style.cssText = "";
    bookMessageCard.style.cssText = "";
    bookMessageCard.classList.add("hidden");
    initRain();
    startRainAnimation();
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  async function startSequence() {
    isPlaying = true;

    /* ── Countdown (no music yet) ── */
    for (let i = config.countdown; i >= 1; i--) {
      if (!isPlaying) return;
      await animateCountdown(i);
    }

    /* ── Music starts AFTER countdown ── */
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});

    /* ── Word animation ── */
    for (const w of config.mainText.split("|")) {
      if (!isPlaying) return;
      await animateWord(w);
    }
    if (!isPlaying) return;

    stopRainAnimation();
    await fadeCanvasOut();
    canvas.style.display = "none";
    createStars();
    starrySky.classList.remove("hidden");
    sparkleLayer.classList.remove("hidden");
    starrySky.style.opacity = "0";
    await animateOpacity(starrySky, 0, 1, 1100);
    burstSparkles(22);
    if (!isPlaying) return;
    await sleep(500);
    if (!isPlaying) return;
    await showMemoryBook();
    if (!isPlaying) return;
    await sleep(300);
    buildHeartGallery();
    heartGallery.classList.remove("hidden");
    galleryTitle.classList.remove("hidden");
    launchConfetti(100);
    burstSparkles(26);
    if (config.showHearts) startFloatingHearts();
  }

  /* ── HELPERS ── */
  function fadeCanvasOut() {
    return new Promise((res) => {
      let op = 1;
      function f() {
        op -= 0.018;
        ctx.fillStyle = `rgba(0,0,0,${1 - op})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (op > 0) requestAnimationFrame(f);
        else res();
      }
      f();
    });
  }
  function animateOpacity(el, from, to, dur) {
    return new Promise((res) => {
      const t0 = performance.now();
      function f(now) {
        const p = Math.min((now - t0) / dur, 1);
        el.style.opacity = from + (to - from) * p;
        if (p < 1) requestAnimationFrame(f);
        else res();
      }
      requestAnimationFrame(f);
    });
  }

  /* ── SETTINGS ── */
  function openSettings() { settingsPanel.classList.remove("hidden"); }
  function closeSettings() { settingsPanel.classList.add("hidden"); }
  function applySettings() {
    config.countdown = parseInt(
      document.querySelector('input[name="countdown"]:checked').value,
    );
    config.rainChars = document.getElementById("rain-chars").value || "HAPPYBIRTHDAY";
    config.rainColor1 = document.getElementById("rain-color1").value;
    config.rainColor2 = document.getElementById("rain-color2").value;
    config.mainText = document.getElementById("main-text-input").value || "HAPPY|BIRTHDAY";
    config.textColor = document.getElementById("text-color").value;
    config.showBook = document.getElementById("toggle-book").checked;
    config.showHearts = document.getElementById("toggle-hearts").checked;
    closeSettings();
  }
  function handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    bgMusic.src = url;
  }
  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files).slice(0, 10);
    if (!files.length) return;
    config.photos = [];
    photoPreview.innerHTML = "";
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      config.photos.push(url);
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Preview";
      photoPreview.appendChild(img);
    });
    while (config.photos.length < 10)
      config.photos.push(defaultPhotos[config.photos.length % defaultPhotos.length]);
  }

  document.addEventListener("DOMContentLoaded", init);
})();