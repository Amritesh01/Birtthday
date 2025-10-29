// main.js - merged & fixed version
document.addEventListener("DOMContentLoaded", function () {
  console.log("🎁 DOM Loaded - merged version");

  // CONFIG
  var radius = 200; // slightly closer zoom than original
  var autoRotate = true;
  var rotateSpeed = -60; // seconds per 360
  var imgWidth = 120;
  var imgHeight = 170;

  var bgMusicURL = 'music/setlove.mp3'; // change or set to null if you don't want music
  var bgMusicControls = false;

  // ELEMENTS
  var odrag = document.getElementById('drag-container');
  var ospin = document.getElementById('spin-container');
  var aImg = ospin ? ospin.getElementsByTagName('img') : [];
  var aVid = ospin ? ospin.getElementsByTagName('video') : [];
  var aEle = ospin ? [...aImg, ...aVid] : [];
  var gift = document.getElementById('gift');
  var cover = document.getElementById('cover');
  var canvasConfetti = window.confetti;
  var audioElem = null;
  var spinApplied = false;

  if (!odrag || !ospin) {
    console.warn("drag-container or spin-container missing — continuing but carousel won't run until present.");
  }

  // INITIAL SIZES
  if (ospin) {
    ospin.style.width = imgWidth + "px";
    ospin.style.height = imgHeight + "px";
  }
  var ground = document.getElementById('ground');
  if (ground) {
    ground.style.width = radius * 3 + "px";
    ground.style.height = radius * 3 + "px";
  }

  // INIT layout function (place items on circle)
  function init(delayTime) {
    if (!aEle) return;
    for (var i = 0; i < aEle.length; i++) {
      aEle[i].style.transform = "rotateY(" + (i * (360 / aEle.length)) + "deg) translateZ(" + radius + "px)";
      aEle[i].style.transition = "transform 1s";
      aEle[i].style.transitionDelay = delayTime || (aEle.length - i) / 4 + "s";
    }
  }

  // TRANSFORM state
  var sX, sY, nX, nY,
      desX = 0, desY = 0,
      tX = 0, tY = 10;

  // Apply camera-like transform to the container
  function applyTranform(obj) {
  if (!obj || !ospin) return;
  if (tY > 180) tY = 180;
  if (tY < -180) tY = -180;

  // Apply rotation to spin-container for realistic drag
  ospin.style.transform = "rotateX(" + (-tY) + "deg) rotateY(" + (tX) + "deg)";
}

  // play/pause auto spin
  function playSpin(yes) {
    if (!ospin) return;
    ospin.style.animationPlayState = (yes ? 'running' : 'paused');
  }

  // AUTO spin setup
  if (ospin && autoRotate) {
    var animationName = (rotateSpeed > 0 ? 'spin' : 'spinRevert');
    // use CSS animation class instead of style.animation to keep compatibility; but set style if needed:
    ospin.style.animation = `${animationName} ${Math.abs(rotateSpeed)}s infinite linear`;
  }

  // add bg music (optional)
  if (bgMusicURL && document.getElementById('music-container')) {
    var mc = document.getElementById('music-container');
    // prefer <audio> element in DOM so browser can show controls if requested
    var audioHTML = `<audio src="${bgMusicURL}" ${bgMusicControls ? 'controls' : ''} preload="auto" loop></audio>`;
    mc.innerHTML = audioHTML;
  }

  // GIFT reveal handling (if gift exists). If not present, skip to init centering.
  if (gift && cover && odrag) {
    gift.addEventListener('click', function () {
      console.log("🎁 Gift clicked!");
      gift.style.pointerEvents = 'none';
      gift.classList.add('open');

      // confetti
      if (canvasConfetti) {
        canvasConfetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      }

      // music play triggered by user gesture (best chance to autoplay)
      try {
        if (!audioElem) {
          audioElem = document.createElement('audio');
          audioElem.src = (bgMusicURL || '');
          audioElem.loop = true;
          audioElem.preload = 'auto';
          document.body.appendChild(audioElem);
        }
        if (audioElem && audioElem.src) {
          audioElem.play().then(() => console.log("🎶 Music started")).catch(err => console.warn("⚠️ Music blocked:", err));
        }
      } catch (e) {
        console.warn("⚠️ Audio setup failed", e);
      }

      // after lid animation (approx matching CSS)
      setTimeout(function () {
        cover.classList.add('fade-out');
        odrag.classList.remove('hidden');
        startAppAfterReveal();
      }, 1100);
    });
  } else {
    // if no gift/cover, just reveal immediately
    if (odrag) odrag.classList.remove('hidden');
    startAppAfterReveal();
  }

  // Start app after reveal
  function startAppAfterReveal() {
    console.log("🌟 startAppAfterReveal");
    // initial tilt
    tX = 0;
    tY = 12;
    applyTranform(odrag);

    // Make items invisible then spread them out
    aEle.forEach(el => {
      el.style.transform = "translateZ(0px) rotateY(0deg)";
      el.style.opacity = 0;
    });

    setTimeout(function () {
      // zoom/animation class if present in CSS
      if (odrag) odrag.classList.add('reveal-zoom');

      // arrange images on circle
      init();
      aEle.forEach((el) => {
        el.style.transition = "transform 2.6s cubic-bezier(0.25, 1, 0.3, 1), opacity 2s ease";
        el.style.opacity = 1;
      });

      setTimeout(function () {
        // glow text
        const birthdayText = document.querySelector('#drag-container p');
        if (birthdayText) birthdayText.classList.add('glow');

        // start rotation
        if (autoRotate && !spinApplied) {
          if (ospin) {
            ospin.classList.add('auto-spin');
            ospin.style.animationDuration = `${Math.abs(rotateSpeed)}s`;
          }
          spinApplied = true;
        }
        playSpin(true);
      }, 3000);

    }, 800);

    // restore image effects
    restoreImageEffects();
    // extras like canvas fireworks (you may have them elsewhere)
    try { startExtras(); } catch (e) { /* ignore if not defined */ }

    // hide cover after a short while
    setTimeout(function () {
      if (cover) cover.style.display = "none";
      console.log("✅ Reveal complete");
    }, 2200);
  }

  // restore image shadow etc
  function restoreImageEffects() {
    var imgs = document.querySelectorAll('#drag-container img');
    imgs.forEach(img => {
      img.style.boxShadow = "0 0 8px #fff";
      img.style.webkitBoxReflect = "below 10px linear-gradient(transparent, transparent, #0005)";
      img.style.transition = "all 1.2s ease";
    });
  }

  // START EXTRAS - very small canvas fireworks/hearts if you want (non-blocking)
  function startExtras() {
    var canvas = document.getElementById("canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    function random(min, max) { return Math.random() * (max - min) + min; }

    function Firework(x, y) {
      this.x = x; this.y = y;
      this.radius = random(2, 4);
      this.color = `hsl(${random(0, 360)}, 100%, 50%)`;
      this.vx = random(-3, 3); this.vy = random(-3, 3);
      this.life = 100;
    }
    Firework.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    };
    Firework.prototype.update = function () {
      this.x += this.vx; this.y += this.vy; this.life--;
    };

    function Heart(x, y) {
      this.x = x; this.y = y;
      this.size = random(20, 40);
      this.color = 'red';
      this.vy = random(-2, -1);
      this.opacity = 1;
    }
    Heart.prototype.draw = function () {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.bezierCurveTo(this.x - this.size / 2, this.y - this.size / 2,
        this.x - this.size, this.y + this.size / 3,
        this.x, this.y + this.size);
      ctx.bezierCurveTo(this.x + this.size, this.y + this.size / 3,
        this.x + this.size / 2, this.y - this.size / 2,
        this.x, this.y);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    Heart.prototype.update = function () {
      this.y += this.vy;
      this.opacity -= 0.01;
    };

    var fireworks = [], hearts = [];

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.1) fireworks.push(new Firework(random(0, canvas.width), random(0, canvas.height)));
      if (Math.random() < 0.05) hearts.push(new Heart(random(0, canvas.width), canvas.height));

      fireworks.forEach((f, i) => { f.draw(); f.update(); if (f.life <= 0) fireworks.splice(i, 1); });
      hearts.forEach((h, i) => { h.draw(); h.update(); if (h.opacity <= 0) hearts.splice(i, 1); });

      requestAnimationFrame(animate);
    }
    animate();
  }

  // POINTER-BASED DRAG (using the original working approach with inertia)
  // This logic will only operate after DOM is ready; dragging during cover visible has no effect.
  (function enablePointerDrag() {
    // Use document-level pointerdown like original; will operate even if items not yet spread
    document.onpointerdown = function (e) {
      if (!odrag) return;
      // stop auto-inertia timer
      clearInterval(odrag.timer);
      e = e || window.event;
      var sX = e.clientX, sY = e.clientY;

      this.onpointermove = function (e) {
        e = e || window.event;
        var nX = e.clientX, nY = e.clientY;
        desX = nX - sX;
        desY = nY - sY;
        tX += desX * 0.1;
        tY += desY * 0.1;
        applyTranform(odrag);
        sX = nX;
        sY = nY;
      };

      this.onpointerup = function (e) {
        // inertia emulate
        odrag.timer = setInterval(function () {
          desX *= 0.95;
          desY *= 0.95;
          tX += desX * 0.1;
          tY += desY * 0.1;
          applyTranform(odrag);
          playSpin(false);
          if (Math.abs(desX) < 0.5 && Math.abs(desY) < 0.5) {
            clearInterval(odrag.timer);
            playSpin(true);
          }
        }, 17);
        this.onpointermove = this.onpointerup = null;
      };

      return false;
    };

    // wheel to zoom in/out (adjust radius)
    document.onmousewheel = function(e) {
      e = e || window.event;
      var d = e.wheelDelta / 20 || -e.detail;
      radius += d;
      if (radius < 80) radius = 80;
      init(1);
    };
  })();

  // helper confetti function (button uses confetti())
  window.confetti = window.confetti || function(){};
  window.confettiClick = function () {
    if (window.confetti) window.confetti({ particleCount: 80, spread: 120, origin: { y: 0.6 } });
  };

  // RESIZE handling
  window.addEventListener('resize', function () {
    var canvas = document.getElementById("canvas");
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    if (ground) {
      ground.style.width = radius * 3 + "px";
      ground.style.height = radius * 3 + "px";
    }
    // re-init positions when size changes
    init();
    applyTranform(odrag);
  });

  // initial call for setups if no gift present
  init();
  applyTranform(odrag);
});
