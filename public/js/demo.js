/* ============================================================
   HuntClock - demo.js
   Live demo: timer, stations, dog, counters
   ============================================================ */

const slider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
const presets = document.querySelectorAll('.preset-btn');
const btnPlay = document.getElementById('btn-play');
const discBtns = document.querySelectorAll('.disc-btn');
const stationIds = ['s-flap', 's-rope', 's-sniff', 's-roll', 's-slide', 's-lick'];
const dogMarker = document.getElementById('dog-marker');

const counters = {
  unlocked: document.getElementById('cnt-unlocked'),
  treats: document.getElementById('cnt-treats'),
  busy: document.getElementById('cnt-busy'),
  vs: document.getElementById('cnt-vs'),
};
const barHuntclock = document.getElementById('bar-huntclock');
const barNormal = document.getElementById('bar-normal');

// Station unlock order per disc level
const UNLOCK_ORDER = {
  Easy:    ['s-flap', 's-lick', 's-sniff', 's-rope', 's-slide', 's-roll'],
  Medium:  ['s-sniff', 's-flap', 's-roll', 's-lick', 's-rope', 's-slide'],
  Genius:  ['s-roll', 's-slide', 's-sniff', 's-rope', 's-flap', 's-lick'],
};
const STATION_POS = {
  s-flap:   { top: '60px',  left: '228px' },
  s-rope:   { top: '130px', left: '30px'  },
  s-sniff:  { top: '240px', left: '130px' },
  s-roll:   { top: '300px', left: '260px' },
  s-slide:  { top: '240px', left: '370px' },
  s-lick:   { top: '130px', left: '410px' },
};

let currentMins = 0;
let currentDisc = 'Easy';
let unlockedSet = new Set();
let playTimer = null;

function timeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function stationsUnlockedAt(mins) {
  if (mins <= 0) return 0;
  if (mins >= 180) return 6;
  return Math.min(6, Math.ceil(mins / 30));
}
function setTime(mins) {
  mins = Math.min(Math.max(mins, 0), 180);
  currentMins = mins;
  slider.value = mins;
  timeDisplay.textContent = timeStr(mins);
  updateBoard();
  updateCounters();
}
function updateBoard() {
  const targetCount = stationsUnlockedAt(currentMins);
  const order = UNLOCK_ORDER[currentDisc];
  const shouldUnlock = new Set(order.slice(0, targetCount));

  stationIds.forEach(id => {
    const slot = document.getElementById(id);
    const isUnlocked = shouldUnlock.has(id);
    slot.classList.toggle('unlocked', isUnlocked);
    if (isUnlocked && !unlockedSet.has(id)) {
      unlockedSet.add(id);
      ding();
    }
  });

  // Move dog to last unlocked station, else center
  const lastUnlocked = order.slice(0, targetCount).pop();
  if (lastUnlocked && STATION_POS[lastUnlocked]) {
    const p = STATION_POS[lastUnlocked];
    dogMarker.style.top = p.top;
    dogMarker.style.left = p.left;
    dogMarker.style.opacity = '1';
  } else {
    dogMarker.style.top = '50%';
    dogMarker.style.left = '50%';
    dogMarker.style.opacity = currentMins === 0 ? '0.4' : '1';
  }
}
function updateCounters() {
  const n = unlockedSet.size;
  counters.unlocked.textContent = n;
  counters.treats.textContent = n * 2;
  counters.busy.textContent = currentMins + 'm';
  counters.vs.textContent = '8m';
  const pct = currentMins >= 180 ? 100 : (currentMins / 180) * 100;
  barHuntclock.style.height = `${pct}%`;
  barNormal.style.height = `${Math.min(100, (8 / 180) * 100)}%`;
}
function ding() {
  const bell = document.createElement('div');
  bell.innerHTML = '🔔';
  bell.style.position = 'fixed';
  bell.style.top = '40px';
  bell.style.left = '50%';
  bell.style.transform = 'translateX(-50%)';
  bell.style.fontSize = '2rem';
  bell.style.zIndex = '6000';
  bell.style.animation = 'dingWiggle 600ms ease';
  document.body.appendChild(bell);
  setTimeout(() => bell.remove(), 600);
}
document.styleSheets[0].insertRule(`@keyframes dingWiggle { 0%,100%{transform:translateX(-50%) rotate(0deg)} 25%{transform:translateX(-50%) rotate(-15deg)} 75%{transform:translateX(-50%) rotate(15deg)} }`, 0);

slider.addEventListener('input', (e) => setTime(parseInt(e.target.value, 10)));
presets.forEach(b => b.addEventListener('click', () => setTime(parseInt(b.dataset.mins, 10))));

let playDirection = 1;
btnPlay.addEventListener('click', () => {
  if (playTimer) { clearInterval(playTimer); playTimer = null; btnPlay.textContent = 'Play &rarr;'; return; }
  btnPlay.textContent = 'Pause &rarr;';
  playTimer = setInterval(() => {
    setTime(currentMins + playDirection);
    if (currentMins >= 180 || currentMins <= 0) { clearInterval(playTimer); playTimer = null; btnPlay.textContent = 'Play &rarr;'; }
  }, 800);
});

discBtns.forEach(b => b.addEventListener('click', () => {
  discBtns.forEach(x => x.classList.toggle('active', x === b));
  currentDisc = b.dataset.disc;
  unlockedSet.clear();
  setTime(currentMins);
}));

setTime(0);
