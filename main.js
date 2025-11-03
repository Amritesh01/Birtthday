// main.js - unified JS-driven rotation + pointer drag (drop-in replacement)
document.addEventListener("DOMContentLoaded", function () {
  console.log("🎁 DOM Loaded - unified working version");

  // ========== CONFIG ==========
  var radius = 170; // closer zoom (tweak 120-200)
  var autoRotate = true;
  var rotateSpeed = -60; // seconds per full rotation (negative = reverse)
  var imgWidth = 120;
  var imgHeight = 170;
  var bgMusicURL = 'music/setlove.mp3';
  var bgMusicControls = false;

  // ========== ELEMENTS ==========
  var odrag = document.getElementById('drag-container');
  var ospin = document.getElementById('spin-container');
  var gift = document.getElementById('gift');
  var cover = document.getElementById('cover');
  var canvasConfetti = window.confetti;
  var audioElem = null;
  var aImg = ospin ? ospin.getElementsByTagName('img') : [];
  var aVid = ospin ? ospin.getElementsByTagName('video') : [];
  var aEle = ospin ? [].slice.call(aImg).concat([].slice.call(aVid)) : [];
  var ground = document.getElementById('ground');

  if (!odrag || !ospin) console.warn('drag-container or spin-container missing - carousel may not initialize.');

  // Ensure ground sizing
  if (ground) {
    ground.style.width = radius * 3 + "px";
    ground.style.height = radius * 3 + "px";
  }

  // Ensure correct 3D context on container and spin
  if (odrag) {
    odrag.style.perspective = odrag.style.perspective || "1200px";
    odrag.style.transformStyle = odrag.style.transformStyle || "preserve-3d";
    odrag.style.touchAction = 'none'; // capture pointer moves
    odrag.style.position = odrag.style.position || 'relative';
  }
  if (ospin) {
    ospin.style.transformStyle = ospin.style.transformStyle || "preserve-3d";
    ospin.style.transformOrigin = ospin.style.transformOrigin || "50% 50%";
    ospin.style.willChange = 'transform';
    ospin.style.width = imgWidth + "px";
    ospin.style.height = imgHeight + "px";
  }

  // ========== STATE ==========
  var tX = 0, tY = 10;        // user tilt angles
  var velX = 0, velY = 0;     // velocity for inertia
  var autoRotateAngle = 0;    // JS driven auto rotate (degrees)
  var lastFrameTime = performance.now();
  var isDragging = false;
  var pointerId = null;
  var lastPointerX = 0, lastPointerY = 0;

  // ========== LAYOUT ==========
  function init(delayTime) {
    if (!aEle) return;
    for (var i = 0; i < aEle.length; i++) {
      var deg = i * (360 / aEle.length);
      aEle[i].style.transition = "transform 1s";
      aEle[i].style.transitionDelay = (delayTime ? delayTime + "s" : ((aEle.length - i) / 4) + "s");
      aEle[i].style.transform = "rotateY(" + deg + "deg) translateZ(" + radius + "px)";
      aEle[i].style.opacity = 1;
    }
  }

  // ========== APPLY TRANSFORM ==========
  // combine user tilt (tX,tY) and autoRotateAngle into ospin transform
  function applyTransform() {
    if (!ospin) return;
    // clamp tY so it stays reasonable
    if (tY > 80) tY = 80;
    if (tY < -80) tY = -80;
    // compose transforms: tilt X then rotate Y (auto + user)
    var totalY = tX + autoRotateAngle;
    ospin.style.transform = `rotateX(${ -tY }deg) rotateY(${ totalY }deg)`;
  }

  // ========== AUTO ROTATE (JS-driven) ==========
  function updateAutoRotate(dt) {
    if (!autoRotate) return;
    // rotateSpeed: seconds per full rotation. Convert to deg per ms.
    var degPerMs = (360 / (Math.abs(rotateSpeed) * 1000));
    var sign = rotateSpeed < 0 ? -1 : 1;
    autoRotateAngle += sign * degPerMs * dt;
    // keep in sensible range
    if (autoRotateAngle > 360 || autoRotateAngle < -360) autoRotateAngle %= 360;
  }

  // ========== MAIN RAF LOOP ==========
  function raf(now) {
    var dt = now - lastFrameTime;
    lastFrameTime = now;

    // apply inertia when not dragging
    if (!isDragging) {
      // damp velocities
      velX *= 0.95;
      velY *= 0.95;
      tX += velX * (dt / 16.67); // scale to approx per-frame
      tY += velY * (dt / 16.67);
      // slowly blend back to small tY if none
      if (Math.abs(velX) < 0.01 && Math.abs(velY) < 0.01) {
        // no-op, velocities small
      }
    }

    // update auto-rotate angle only when not dragging
    if (!isDragging) updateAutoRotate(dt);

    applyTransform();
    requestAnimationFrame(raf);
  }

  // start RAF
  requestAnimationFrame(raf);

  // ========== POINTER HANDLERS ==========
  function onPointerDown(e) {
    // Only respond with the left button (button 0) for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!ospin) return;

    isDragging = true;
    pointerId = e.pointerId;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    velX = velY = 0; // reset velocities
    // capture pointer so we still get moves outside element
    try { e.target.setPointerCapture(pointerId); } catch (err) {}
    // pause auto-rotate while dragging
    // (we keep autoRotate true but visually autoRotateAngle stops updating because isDragging true)
  }

  function onPointerMove(e) {
    if (!isDragging || e.pointerId !== pointerId) return;
    var dx = e.clientX - lastPointerX;
    var dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    // sensitivity tuning
    var sensitivityX = 0.25;
    var sensitivityY = 0.18;

    // update angles
    tX += dx * sensitivityX;
    tY += dy * sensitivityY;

    // store velocities for inertia (scaled)
    velX = dx * 0.15;
    velY = dy * 0.12;

    // while dragging, don't accumulate auto-rotation
    // applyTransform will use same autoRotateAngle but not update it
    applyTransform();
    e.preventDefault && e.preventDefault();
  }

  function onPointerUp(e) {
    if (!isDragging || e.pointerId !== pointerId) return;
    isDragging = false;
    try { e.target.releasePointerCapture(pointerId); } catch (err) {}
    pointerId = null;
    // inertia continues via RAF (velX/velY damping)
    // autoRotate resumes automatically because isDragging false
  }

  // Attach pointer listeners to odrag (if available) or document fallback
  var pointerTarget = odrag || document;
  pointerTarget.addEventListener('pointerdown', onPointerDown, {passive:false});
  window.addEventListener('pointermove', onPointerMove, {passive:false});
  window.addEventListener('pointerup', onPointerUp, {passive:false});
  window.addEventListener('pointercancel', onPointerUp);

  // ========== WHEEL TO ZOOM ==========
  window.addEventListener('wheel', function (e) {
    var delta = e.deltaY;
    // deltaY positive scroll down -> increase radius (move images further)
    radius += delta * 0.04;
    if (radius < 80) radius = 80;
    if (radius > 600) radius = 600;
    init(0);
    e.preventDefault && e.preventDefault();
  }, {passive:false});

  // ========== INIT / GIFT HANDLING / MUSIC / CONFETTI ==========
  // Keep original gift logic: click opens lid, plays confetti and audio, then reveal
  if (gift && cover && odrag) {
    gift.addEventListener('click', function () {
      gift.style.pointerEvents = 'none';
      gift.classList.add('open');

      if (canvasConfetti) canvasConfetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });

      // audio attempt
      try {
        if (!audioElem) {
          audioElem = document.createElement('audio');
          audioElem.src = bgMusicURL || '';
          audioElem.loop = true;
          audioElem.preload = 'auto';
          document.body.appendChild(audioElem);
        }
        if (audioElem && audioElem.src) {
          audioElem.play().catch(err => console.warn('Audio blocked:', err));
        }
      } catch (err) { console.warn('audio error', err); }

      setTimeout(function () {
  cover.classList.add('fade-out');

  // ===== Typing Wishes Sequence =====
  const wishScreen = document.getElementById('wish-screen');
  const wishText = document.getElementById('wish-text');

  if (wishScreen && wishText) {
    wishScreen.classList.remove('hidden');
    wishScreen.classList.add('show');
    typeWriter("Someone special deserves a magical surprise…", wishText, 70, () => {
      setTimeout(() => {
        wishScreen.classList.remove('show');
        setTimeout(() => {
          wishScreen.classList.add('hidden');
          odrag.classList.remove('hidden');
          startAppAfterReveal();
        }, 1000);
      }, 1500);
    });
  } else {
    // fallback: if wish screen missing, show carousel directly
    odrag.classList.remove('hidden');
    startAppAfterReveal();
  }
}, 1100);

// ===== Helper: Typewriter Effect =====
function typeWriter(text, element, delay, callback) {
  element.textContent = "";
  let i = 0;
  const timer = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if (i >= text.length) {
      clearInterval(timer);
      if (callback) callback();
    }
  }, delay);
}

    });
  } else {
    if (odrag) odrag.classList.remove('hidden');
    startAppAfterReveal();
  }

  function startAppAfterReveal() {
    // initial tilt and layout
    tX = 0; tY = 12;
    autoRotateAngle = 0;
    init();
    // ensure ospin has transform-style
    if (ospin) {
      ospin.style.transformStyle = 'preserve-3d';
      ospin.style.transformOrigin = '50% 50%';
      ospin.style.transform = `rotateX(${ -tY }deg) rotateY(${ tX }deg)`;
    }

    // small UI touches: glow text and start extras
    setTimeout(function () {
      const birthdayText = document.querySelector('#drag-container p');
      if (birthdayText) birthdayText.classList.add('glow');
    }, 1200);

    // start extras like fireworks
    startExtrasSafe();

    

    // hide cover to avoid intercepting pointers
    setTimeout(function () {
      if (cover) cover.style.display = "none";
    }, 2200);
  }

  // ========== SAFE START FOR EXTRAS ==========
  function startExtrasSafe() {
    try { startExtras(); } catch (e) { /* ignore if not defined */ }
  }

  // ========== RESTORE IMAGE EFFECTS (shadows etc) ==========
  function restoreImageEffects() {
    var imgs = document.querySelectorAll('#drag-container img');
    imgs.forEach(img => {
      img.style.boxShadow = "0 0 8px #fff";
      img.style.webkitBoxReflect = "below 10px linear-gradient(transparent, transparent, #0005)";
      img.style.transition = "all 1.2s ease";
    });
  }
  restoreImageEffects();

  // ========== START - layout init ==========
  init();
  applyTransform();

  // ========== RESIZE ==========
  window.addEventListener('resize', function () {
    if (ground) {
      ground.style.width = radius * 3 + "px";
      ground.style.height = radius * 3 + "px";
    }
    var canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    init();
    applyTransform();
  });

  // ========== helper confetti function for button ==========
  window.confettiClick = function () {
    if (window.confetti) window.confetti({ particleCount: 80, spread: 120, origin: { y: 0.6 } });
  };


  // === 🎈 BALLOON EFFECT ===
function startBalloons() {
  const container = document.getElementById('balloon-container');
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#f368e0', '#ff9ff3'];
  let balloonCount = 20; // number of balloons

  for (let i = 0; i < balloonCount; i++) {
    let balloon = document.createElement('div');
    balloon.classList.add('balloon');
    balloon.style.setProperty('--balloon-color', colors[Math.floor(Math.random() * colors.length)]);
    balloon.style.left = Math.random() * 100 + '%';
    balloon.style.animationDuration = 8 + Math.random() * 4 + 's';
    balloon.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(balloon);
  }
}
startBalloons();

});

// === Birthday Page Trigger ===
document.addEventListener('DOMContentLoaded', () => {
  const birthdayPage = document.getElementById('birthday-page');
  const backBtn = document.getElementById('backBtn');
  const button = document.querySelector('.button'); // your existing message button

  if (button) {
    button.addEventListener('click', () => {
      document.body.style.overflow = 'hidden';
      birthdayPage.classList.add('active');
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      birthdayPage.classList.remove('active');
      document.body.style.overflow = 'hidden';
    });
  }
});



// === Flip Card Logic ===
document.addEventListener('DOMContentLoaded', () => {
  const birthdayPage = document.getElementById('birthday-page');
  const flipCard = document.querySelector('.flip-card');
  const flipBtn = document.getElementById('flipBtn');

  if (!birthdayPage || !flipCard || !flipBtn) return;

  // show flip button 10 seconds after birthday page appears
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.attributeName === 'class' && birthdayPage.classList.contains('active')) {
        setTimeout(() => flipBtn.classList.add('show'), 2000);
      }
    });
  });
  observer.observe(birthdayPage, { attributes: true });

  // flip on image or button tap
  const doFlip = () => flipCard.classList.toggle('flipped');

  flipBtn.addEventListener('click', doFlip);
  flipCard.addEventListener('click', doFlip);
  flipCard.addEventListener('touchstart', doFlip); // mobile tap
});










