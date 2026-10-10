/* ================================================================
   Aurora Fest '26 — Campus Event Hub
   All DOM logic lives here. No libraries beyond Bootstrap + FA.
   ================================================================ */

// ── 1. DATA ──────────────────────────────────────────────────────
const events = [
  { id: 1, name: "Midnight Hackathon",    category: "Technical", date: "2026-10-24", time: "09:00 AM", venue: "Innovation Lab, Block A",  description: "Build something extraordinary from scratch in 36 hours fueled entirely by free energy drinks.", totalSeats: 120, seatsLeft: 45 },
  { id: 2, name: "Battle of Bands",       category: "Cultural",  date: "2026-10-25", time: "06:00 PM", venue: "Open Air Amphitheatre",     description: "Electrify the amphitheatre crowd with your original music. No covers, just raw noise.",          totalSeats: 500, seatsLeft: 312 },
  { id: 3, name: "Street Football 5v5",   category: "Sports",    date: "2026-10-26", time: "08:00 AM", venue: "Sports Court B",            description: "Fast-paced cage football. Assemble your squad and bring the heat to the concrete.",               totalSeats: 64,  seatsLeft: 8 },
  { id: 4, name: "Figma Prototype Sprint",category: "Workshop",  date: "2026-10-28", time: "10:00 AM", venue: "Design Studio",             description: "Master UI/UX basics and build a working app prototype in one intense afternoon.",                  totalSeats: 60,  seatsLeft: 60 },
  { id: 5, name: "Solo Dance Showdown",   category: "Cultural",  date: "2026-10-30", time: "05:00 PM", venue: "Main Stage",                description: "Showcase your best routine on the main stage. Breakdancing, classical, or anything in between.",   totalSeats: 80,  seatsLeft: 0 },
  { id: 6, name: "Capture The Flag",      category: "Technical", date: "2026-10-31", time: "11:00 AM", venue: "Cybersecurity Lab",         description: "Break into our deliberately insecure servers and steal the flags before the other hackers do.",    totalSeats: 80,  seatsLeft: 7 },
  { id: 7, name: "Table Tennis Open",     category: "Sports",    date: "2026-11-01", time: "09:30 AM", venue: "Indoor Games Hall",         description: "Singles knockout tournament in the indoor hall. Fast rallies, zero mercy.",                        totalSeats: 96,  seatsLeft: 54 },
  { id: 8, name: "Pottery for Beginners", category: "Workshop",  date: "2026-11-02", time: "02:00 PM", venue: "Art Room, Block D",         description: "Get your hands dirty and learn to throw clay on the wheel. You will make a mess.",                 totalSeats: 40,  seatsLeft: 26 }
];

// ── 2. STATE & PERSISTENCE ───────────────────────────────────────
const registrations = new Map();
let myRegistrations = []; // Array of { eventId, email }
let pendingSuccess  = null;

function loadData() {
  try {
    const savedEvents = localStorage.getItem('auroraEvents');
    if (savedEvents) {
      JSON.parse(savedEvents).forEach(pe => {
        const ev = events.find(e => e.id === pe.id);
        if (ev) ev.seatsLeft = pe.seatsLeft;
      });
    }
    const savedRegs = localStorage.getItem('auroraRegs');
    if (savedRegs) {
      JSON.parse(savedRegs).forEach(([id, emails]) => {
        registrations.set(id, new Set(emails));
      });
    }
    const myRegs = localStorage.getItem('auroraMyRegs');
    if (myRegs) myRegistrations = JSON.parse(myRegs);
  } catch (e) {
    // localStorage unavailable or data corrupted — fail silently
  }
}

function saveData() {
  try {
    localStorage.setItem('auroraEvents', JSON.stringify(events.map(e => ({ id: e.id, seatsLeft: e.seatsLeft }))));
    localStorage.setItem('auroraRegs',   JSON.stringify(Array.from(registrations.entries()).map(([id, s]) => [id, Array.from(s)])));
    localStorage.setItem('auroraMyRegs', JSON.stringify(myRegistrations));
  } catch (e) {
    // localStorage quota exceeded or unavailable — fail silently
  }
}

loadData();

// ── 3. THEME TOGGLE ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  function updateIcon() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    themeToggle.innerHTML = isDark
      ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
  }
  updateIcon(); // sync icon with state set in <head>

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
    updateIcon();
    try { localStorage.setItem('auroraTheme', isDark ? 'light' : 'dark'); }
    catch(e) { /* localStorage unavailable — theme won't persist */ }
  });
});

// ── 4. HELPERS ────────────────────────────────────────────────────
const CATEGORY_META = {
  Technical: { colorClass: "cat-technical", label: "TECHNICAL", icon: "fa-microchip" },
  Cultural:  { colorClass: "cat-cultural",  label: "CULTURAL",  icon: "fa-masks-theater" },
  Sports:    { colorClass: "cat-sports",    label: "SPORTS",    icon: "fa-futbol" },
  Workshop:  { colorClass: "cat-workshop",  label: "WORKSHOP",  icon: "fa-screwdriver-wrench" }
};

function formatDatePieces(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    day:   d.getDate(),
    month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()
  };
}

function formatGCalUrl(event) {
  const [, hh, mm, mod] = event.time.match(/(\d+):(\d+)\s*(AM|PM)/);
  let h = parseInt(hh, 10);
  if (mod === 'PM' && h < 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  const pad = n => n.toString().padStart(2, '0');
  const dStr   = event.date.replace(/-/g, '');
  const tStr   = `${pad(h)}${mm}00`;
  const endStr = `${pad((h + 2) % 24)}${mm}00`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${dStr}T${tStr}/${dStr}T${endStr}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`;
}

function renderBarcodeSeats(event) {
  const { seatsLeft } = event;
  if (seatsLeft === 0)  return `<div class="seats-barcode barcode-full" aria-hidden="true">|| |||| | ||||| |</div><div class="seats-text"><i class="fa-solid fa-chair" aria-hidden="true"></i> FULL</div>`;
  if (seatsLeft <= 5)   return `<div class="seats-barcode barcode-low"  aria-hidden="true">|| |||| | ||||| |</div><div class="seats-text text-low"><i class="fa-solid fa-chair" aria-hidden="true"></i> ONLY ${seatsLeft} LEFT</div>`;
  return `<div class="seats-barcode" aria-hidden="true">|| |||| | ||||| |</div><div class="seats-text"><i class="fa-solid fa-chair" aria-hidden="true"></i> ${seatsLeft} SEATS LEFT</div>`;
}

function registerButton(event) {
  if (event.seatsLeft === 0)
    return `<button class="btn btn-card btn-disabled" disabled aria-disabled="true">FULL</button>`;
  return `<button class="btn btn-card" data-id="${event.id}" aria-label="Register for ${event.name}">REGISTER</button>`;
}

// ── 5. RENDER CARDS ───────────────────────────────────────────────
function renderEventCard(event, idx) {
  const meta   = CATEGORY_META[event.category] || { colorClass: "", label: "OTHER" };
  const { day, month } = formatDatePieces(event.date);
  const isFull = event.seatsLeft === 0;
  const calUrl = formatGCalUrl(event);
  const delay  = (idx % 4) * 80; // stagger by column

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="event-card card-pop ${isFull ? 'event-card-full' : ''}" style="animation-delay:${delay}ms" aria-labelledby="ev-name-${event.id}">
        <div class="ticket-left ${meta.colorClass}">
          <div class="ticket-date">
            <span class="ticket-month">${month}</span>
            <span class="ticket-day">${day}</span>
          </div>
          <div class="ticket-stamp"><i class="fa-solid ${meta.icon}" aria-hidden="true"></i> ${meta.label}</div>
        </div>
        <div class="ticket-right">
          ${isFull ? '<div class="stamp-sold-out">FULL</div>' : ''}
          <div class="ticket-header">
            <h3 class="event-name" id="ev-name-${event.id}">${event.name.toUpperCase()}</h3>
            <p class="event-desc">${event.description}</p>
            <ul class="event-meta list-unstyled" aria-label="Event details">
              <li><i class="fa-solid fa-calendar-days" aria-hidden="true"></i>${event.date}</li>
              <li><i class="fa-solid fa-clock" aria-hidden="true"></i>${event.time}</li>
              <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${event.venue}</li>
            </ul>
          </div>
          <div class="ticket-tear-line"></div>
          <div class="ticket-footer">
            <div class="ticket-seats">${renderBarcodeSeats(event)}</div>
            <div class="d-flex gap-2">
              <a href="${calUrl}" target="_blank" rel="noopener" class="btn btn-card p-2" aria-label="Add to Calendar" title="Add to Calendar"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i></a>
              ${registerButton(event)}
            </div>
          </div>
        </div>
      </article>
    </div>`;
}

// ── 6. FILTER, SEARCH & SORT ──────────────────────────────────────
const grid        = document.getElementById("eventGrid");
const emptyState  = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const sortSelect  = document.getElementById("sortSelect");
const resultCount = document.getElementById("resultCount");

function getActiveCat() {
  const checked = document.querySelector('input[name="catFilter"]:checked');
  return checked ? checked.value : "All";
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const cat   = getActiveCat();
  const sort  = sortSelect.value;

  let filtered = events.filter(ev =>
    (cat === "All" || ev.category === cat) &&
    ev.name.toLowerCase().includes(query)
  );

  filtered.sort((a, b) => {
    if (sort === 'date')  return new Date(a.date) - new Date(b.date);
    if (sort === 'name')  return a.name.localeCompare(b.name);
    if (sort === 'seats') return a.seatsLeft - b.seatsLeft;
    return 0;
  });

  grid.innerHTML = filtered.map((ev, i) => renderEventCard(ev, i)).join("");
  resultCount.textContent = `Showing ${filtered.length} of ${events.length} events`;

  if (filtered.length === 0) {
    emptyState.classList.remove("d-none");
  } else {
    emptyState.classList.add("d-none");
  }
}

searchInput.addEventListener("input",  applyFilters);
sortSelect.addEventListener("change",  applyFilters);
document.querySelectorAll('input[name="catFilter"]').forEach(r => r.addEventListener("change", applyFilters));

// ── 7. VALIDATION ─────────────────────────────────────────────────
const RULES = {
  regName(val) {
    if (!val)                        return "Full name is required.";
    if (val.length < 3)              return "Name must be at least 3 characters.";
    if (!/^[A-Za-z\s]+$/.test(val)) return "Name may only contain letters and spaces.";
    return null;
  },
  regEmail(val, eventId) {
    if (!val)                                         return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))     return "Enter a valid email address.";
    const set = registrations.get(eventId);
    if (set && set.has(val.toLowerCase()))            return "This email is already registered for this event.";
    return null;
  },
  regPhone(val) {
    if (!val)                   return "Phone number is required.";
    if (!/^\d{10}$/.test(val))  return "Enter exactly 10 digits.";
    if (!/^[6-9]/.test(val))    return "Number must start with 6, 7, 8 or 9.";
    return null;
  }
};

// ── 8. MODAL REFERENCES & TOAST ──────────────────────────────────
const regModalEl     = document.getElementById("regModal");
const regForm        = document.getElementById("regForm");
const regModalEvName = document.getElementById("regModalEventName");
const successModalEl = document.getElementById("successModal");
const successMsgEl   = document.getElementById("successMsg");
const sysToastEl     = document.getElementById("sysToast");

const regModalBS     = new bootstrap.Modal(regModalEl);
const successModalBS = new bootstrap.Modal(successModalEl);
const sysToastBS     = new bootstrap.Toast(sysToastEl);

let activeEventId = null;

function showToast(msg) {
  document.getElementById('toastMsg').textContent = msg;
  sysToastBS.show();
}

// ── 9. FORM VALIDATION & MODAL FLOW ──────────────────────────────
function validateField(input) {
  const rule = RULES[input.id];
  if (!rule) return true;
  const val   = input.value.trim();
  const error = input.id === "regEmail" ? rule(val, activeEventId) : rule(val);
  const fb    = document.getElementById(input.id + "Feedback");
  if (error) {
    input.classList.remove("is-valid"); input.classList.add("is-invalid");
    if (fb) fb.textContent = error;
    return false;
  }
  input.classList.remove("is-invalid"); input.classList.add("is-valid");
  if (fb) fb.textContent = "";
  return true;
}

function openRegModal(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev || ev.seatsLeft === 0) return;
  activeEventId = eventId;
  regModalEvName.textContent = ev.name;
  regModalBS.show();
}

function resetForm() {
  regForm.reset();
  regForm.querySelectorAll(".reg-input").forEach(inp => inp.classList.remove("is-valid","is-invalid"));
  regForm.querySelectorAll(".invalid-feedback").forEach(el => { el.textContent = ""; });
  activeEventId = null;
}

regModalEl.addEventListener("shown.bs.modal",  () => document.getElementById("regName").focus());
regModalEl.addEventListener("hidden.bs.modal", () => {
  resetForm();
  if (pendingSuccess) {
    const { name, eventName } = pendingSuccess;
    successMsgEl.textContent = `THANK YOU, ${name.toUpperCase()}! YOU ARE REGISTERED FOR ${eventName.toUpperCase()}.`;
    pendingSuccess = null;
    successModalBS.show();
  }
});

// Stamp in on success modal show
successModalEl.addEventListener("shown.bs.modal", () => {
  const stamp = document.getElementById("successStamp");
  if (stamp) { stamp.classList.remove("stamp-in"); void stamp.offsetWidth; stamp.classList.add("stamp-in"); }
  fireConfetti();
});

["regName","regEmail","regPhone"].forEach(id =>
  document.getElementById(id).addEventListener("blur", function() { validateField(this); })
);

regForm.addEventListener("submit", e => {
  e.preventDefault();
  const nameInput  = document.getElementById("regName");
  const emailInput = document.getElementById("regEmail");
  const phoneInput = document.getElementById("regPhone");
  if (![validateField(nameInput), validateField(emailInput), validateField(phoneInput)].every(Boolean)) return;

  const ev    = events.find(e => e.id === activeEventId);
  const name  = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  if (!registrations.has(activeEventId)) registrations.set(activeEventId, new Set());
  registrations.get(activeEventId).add(email);
  myRegistrations.push({ eventId: activeEventId, email });
  ev.seatsLeft = Math.max(0, ev.seatsLeft - 1);

  saveData();
  applyFilters();
  updateMyEvents();

  pendingSuccess = { name, eventName: ev.name };
  regModalBS.hide();
  showToast("Registered!");
});

// ── 10. MY EVENTS OFFCANVAS ───────────────────────────────────────
const myEventsBody  = document.getElementById('myEventsBody');
const myEventsBadge = document.getElementById('myEventsBadge');

function updateMyEvents() {
  myEventsBadge.textContent = myRegistrations.length;
  myEventsBadge.classList.toggle('d-none', myRegistrations.length === 0);

  if (myRegistrations.length === 0) {
    myEventsBody.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="fa-solid fa-ticket fa-3x mb-3 text-ink" aria-hidden="true"></i>
        <h6 class="font-head text-ink mb-1">NO TICKETS YET</h6>
        <p class="font-body small">Go register for something!</p>
      </div>`;
    return;
  }

  myEventsBody.innerHTML = myRegistrations.map(reg => {
    const ev = events.find(e => e.id === reg.eventId);
    if (!ev) return '';
    return `
      <div class="card bg-card border-ink mb-3 shadow-sm rounded-0">
        <div class="card-body">
          <h6 class="font-head mb-1">${ev.name}</h6>
          <p class="font-mono small mb-3 text-muted">
            <i class="fa-solid fa-calendar-days me-1" aria-hidden="true"></i>${ev.date} at ${ev.time}<br>
            <i class="fa-solid fa-location-dot me-1" aria-hidden="true"></i>${ev.venue}
          </p>
          <div class="d-flex gap-2">
            <a href="${formatGCalUrl(ev)}" target="_blank" rel="noopener" class="btn btn-sm btn-ink flex-grow-1"><i class="fa-solid fa-calendar-plus me-1" aria-hidden="true"></i>Add</a>
            <button class="btn btn-sm btn-accent cancel-btn" data-id="${ev.id}" data-email="${reg.email}">Cancel</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

myEventsBody.addEventListener('click', e => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;
  const id    = Number(btn.dataset.id);
  const email = btn.dataset.email;
  const ev    = events.find(e => e.id === id);
  if (ev) ev.seatsLeft++;
  if (registrations.has(id)) registrations.get(id).delete(email);
  myRegistrations = myRegistrations.filter(r => !(r.eventId === id && r.email === email));
  saveData();
  updateMyEvents();
  applyFilters();
  showToast("Registration cancelled.");
});

// ── 11. DELEGATED CARD CLICK ─────────────────────────────────────
grid.addEventListener("click", e => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  openRegModal(Number(btn.dataset.id));
});

// ── 12. INITIAL RENDER ────────────────────────────────────────────
applyFilters();
updateMyEvents();

/* ================================================================
   ANIMATIONS — all new JS below this line
   ================================================================ */

// ── A. LANYARD CLOCK ─────────────────────────────────────────────
/* Counts HH:MM:SS to next event start (2026-10-24 09:00 AM IST) */
(function initLanyardClock() {
  const el = document.getElementById('lanyardClock');
  if (!el) return;
  const target = new Date('2026-10-24T09:00:00+05:30').getTime();

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) { el.textContent = 'LIVE!'; return; }
    const h  = Math.floor(diff / 3600000) % 24;
    const m  = Math.floor(diff / 60000) % 60;
    const s  = Math.floor(diff / 1000)  % 60;
    const pad = n => String(n).padStart(2,'0');
    el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  tick();
  setInterval(tick, 1000);
})();

// ── B. COUNTDOWN FLIP TILES ───────────────────────────────────────
/* Counts to 2026-10-24 09:00 AM IST; flips tile on digit change */
(function initCountdown() {
  const display = document.getElementById('countdownDisplay');
  if (!display) return;
  const TARGET  = new Date('2026-10-24T09:00:00+05:30').getTime();
  const UNITS   = ['DAYS','HRS','MIN','SEC'];
  let prevVals  = [null,null,null,null];

  function buildTiles() {
    display.innerHTML = UNITS.map((label, i) =>
      `<div class="flip-tile ${label === 'SEC' ? 'tile-sec' : ''}" id="tile-${label}">
        <div class="flip-tile-card"><span class="flip-val">00</span></div>
        <div class="flip-label">${label}</div>
      </div>`
    ).join('');
  }

  function updateTiles() {
    const diff = TARGET - Date.now();

    if (diff <= 0) {
      display.innerHTML = `<p class="countdown-live">WE ARE LIVE</p>`;
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hrs  = Math.floor(diff / 3600000) % 24;
    const mins = Math.floor(diff / 60000)   % 60;
    const secs = Math.floor(diff / 1000)    % 60;
    const vals = [days, hrs, mins, secs];
    const ids  = ['DAYS','HRS','MIN','SEC'];

    vals.forEach((v, i) => {
      const label = ids[i];
      const tile  = document.getElementById(`tile-${label}`);
      if (!tile) return;
      const card  = tile.querySelector('.flip-tile-card');
      const span  = tile.querySelector('.flip-val');
      const str   = String(v).padStart(2,'0');

      if (str !== prevVals[i]) {
        span.textContent = str;
        // Trigger flip animation
        if (prevVals[i] !== null) {
          card.classList.remove('flip-anim');
          void card.offsetWidth; // reflow
          card.classList.add('flip-anim');
        }
        prevVals[i] = str;
      }
    });
  }

  buildTiles();
  updateTiles();
  setInterval(updateTiles, 1000);
})();

// ── C. SCROLL REVEAL (IntersectionObserver) ───────────────────────
/* Adds .is-visible to .reveal-up elements when they enter viewport */
(function initScrollReveal() {
  const items = document.querySelectorAll('.reveal-up');
  if (!items.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target); // fire once
      }
    });
  }, { threshold: 0.12 });

  items.forEach(el => obs.observe(el));
})();

// ── D. COUNT-UP NUMBERS ───────────────────────────────────────────
/* Animates .count-up elements from 0 → data-target when visible */
(function initCountUp() {
  const els = document.querySelectorAll('.count-up');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const dur    = 1200;
      const start  = performance.now();

      function step(now) {
        const t       = Math.min((now - start) / dur, 1);
        const eased   = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = Math.round(eased * target);
        if (t < 1) requestAnimationFrame(step);
      }
      // Only animate if user hasn't asked for reduced motion
      if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    });
  }, { threshold: 0.3 });

  els.forEach(el => obs.observe(el));
})();

// ── E. CURSOR DOT (desktop hover devices only) ────────────────────
(function initCursorDot() {
  if (!window.matchMedia('(min-width: 992px) and (hover: hover)').matches) return;
  const dot = document.getElementById('cursorDot');
  if (!dot) return;

  dot.style.display = 'block';
  let cx = 0, cy = 0;    // current (eased) position
  let tx = 0, ty = 0;    // target position
  let raf = null;

  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    dot.classList.add('cursor-active');
    if (!raf) raf = requestAnimationFrame(moveDot);
  });

  function moveDot() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    dot.style.transform = `translate(${cx - 6}px, ${cy - 6}px)`;
    if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
      raf = requestAnimationFrame(moveDot);
    } else {
      raf = null;
    }
  }

  // Grow over interactive elements
  document.querySelectorAll('a,button,.headliner-card,.event-card').forEach(el => {
    el.addEventListener('mouseenter', () => dot.classList.add('cursor-grow'));
    el.addEventListener('mouseleave', () => dot.classList.remove('cursor-grow'));
  });
})();

// ── F. SCROLL PROGRESS BAR ────────────────────────────────────────
(function initScrollBar() {
  const bar = document.getElementById('scrollBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrolled = document.documentElement.scrollTop;
    const max      = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
  }, { passive: true });
})();

// ── G. CONFETTI BURST ─────────────────────────────────────────────
/* ~40 small squares in theme colours; removed after 2 s */
function fireConfetti() {
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const COLORS = ['#ff4b2b','#ffc933','#1f3bd1','#f3ead7','#141414'];
  const origin = successModalEl.querySelector('.success-icon');
  if (!origin) return;
  const rect = origin.getBoundingClientRect();
  const ox   = rect.left + rect.width  / 2;
  const oy   = rect.top  + rect.height / 2;

  const pieces = [];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const dist  = 80 + Math.random() * 220;
    el.style.setProperty('--fy', `${Math.round(Math.sin(angle) * dist + dist * 0.6)}px`);
    el.style.setProperty('--fr', `${Math.round(Math.random() * 720 - 360)}deg`);
    el.style.left = `${ox + Math.cos(angle) * 20}px`;
    el.style.top  = `${oy + Math.sin(angle) * 20}px`;
    el.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.animationDelay  = `${Math.random() * 0.25}s`;
    document.body.appendChild(el);
    pieces.push(el);
  }
  setTimeout(() => pieces.forEach(p => p.remove()), 2200);
}

// ── H. TICKER: duplicate content for seamless loop ────────────────
/* The animation runs on -50% so content needs to be doubled exactly */
(function initTicker() {
  const t = document.querySelector('.ticker');
  if (!t) return;
  // Clone inner HTML so the loop is seamless at the midpoint
  t.innerHTML = t.innerHTML + t.innerHTML;
})();



// ── J. INTRO SPLASH ───────────────────────────────────────────────
(function initIntro() {
  const intro = document.getElementById("intro");
  if (!intro) {
    document.documentElement.classList.add('site-ready');
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('site-ready');
    intro.remove();
    return;
  }

  document.documentElement.style.overflow = 'hidden';

  const wm = document.getElementById("introWordmark");
  const w1 = document.createElement("div"); w1.className = "intro-line";
  "AURORA".split("").forEach((char, i) => {
    const isHero = i === 2; // R
    const s = document.createElement("span");
    s.className = "intro-letter" + (isHero ? " intro-letter-hero" : "");
    s.textContent = char;
    s.style.setProperty('--rot', (Math.random() * 180 - 90) + 'deg');
    s.style.setProperty('--s', isHero ? 3.5 : (Math.random() * 1.4 + 1.6));
    s.style.setProperty('--tx', (Math.random() * 40 - 20) + 'vw');
    s.style.setProperty('--ty', (Math.random() * 30 - 15) + 'vh');
    s.style.setProperty('--delay', isHero ? '0.35s' : (i * 0.05) + 's');
    w1.appendChild(s);
  });
  
  const w2 = document.createElement("div"); w2.className = "intro-line";
  "FEST ".split("").forEach((char, i) => {
    const isHero = char === "S";
    const s = document.createElement("span");
    s.className = "intro-letter" + (char === " " ? " intro-space" : "") + (isHero ? " intro-letter-hero" : "");
    s.textContent = char;
    s.style.setProperty('--rot', (Math.random() * 180 - 90) + 'deg');
    s.style.setProperty('--s', isHero ? 3.5 : (Math.random() * 1.4 + 1.6));
    s.style.setProperty('--tx', (Math.random() * 40 - 20) + 'vw');
    s.style.setProperty('--ty', (Math.random() * 30 - 15) + 'vh');
    s.style.setProperty('--delay', isHero ? '0.35s' : (0.3 + i * 0.05) + 's');
    w2.appendChild(s);
  });

  const yr = document.createElement("span");
  yr.className = "intro-letter intro-year bg-sun text-ink";
  yr.textContent = "'26";
  yr.style.setProperty('--rot', '-15deg');
  yr.style.setProperty('--s', '2');
  yr.style.setProperty('--tx', '10vw');
  yr.style.setProperty('--ty', '10vh');
  yr.style.setProperty('--delay', '0.6s');
  w2.appendChild(yr);

  wm.appendChild(w1);
  wm.appendChild(w2);

  const sparks = document.getElementById("introSparks");
  const colors = ['text-accent', 'text-sun', 'text-accent-2', 'text-paper'];
  for (let i=0; i<6; i++) {
    const sp = document.createElement("i");
    sp.className = `fa-solid fa-star intro-spark ${colors[i%4]}`;
    sp.style.top = (Math.random() * 80 + 10) + '%';
    sp.style.left = (Math.random() * 80 + 10) + '%';
    sp.style.animationDelay = (0.6 + Math.random() * 0.5) + 's';
    sparks.appendChild(sp);
  }

  let exitTimer;
  function endIntro() {
    clearTimeout(exitTimer);
    intro.classList.add('intro-exit');
    document.documentElement.classList.add('site-ready');
    document.documentElement.style.overflow = '';
    setTimeout(() => intro.remove(), 800);
  }

  document.getElementById('introSkip').addEventListener('click', endIntro);
  exitTimer = setTimeout(endIntro, 1550);
})();

// ── K. 3D GALLERY ─────────────────────────────────────────────────
(function initGallery() {
  const ring = document.getElementById("galleryRing");
  const section = document.getElementById("gallery");
  if (!ring || !section) return;

  section.setAttribute('tabindex', '0');

  const galleryImages = [
    { src: "images/gallery-1.jpg", alt: "Students collaborating at a table", caption: "HACKATHON NIGHT" },
    { src: "images/gallery-2.jpg", alt: "Band performing on stage", caption: "BATTLE OF BANDS" },
    { src: "images/gallery-3.jpg", alt: "Football match on concrete court", caption: "STREET FOOTBALL" },
    { src: "images/gallery-4.jpg", alt: "Design workshop presentation", caption: "FIGMA SPRINT" },
    { src: "images/gallery-5.jpg", alt: "Dancer on main stage", caption: "SOLO DANCE" },
    { src: "images/gallery-6.jpg", alt: "Cybersecurity capture the flag event", caption: "CTF CHALLENGE" },
    { src: "images/gallery-7.jpg", alt: "Table tennis tournament", caption: "TABLE TENNIS" },
    { src: "images/gallery-8.jpg", alt: "Student making pottery", caption: "POTTERY WORKSHOP" }
  ];

  const n = galleryImages.length;
  let currentAngle = 0;
  const angleStep = 360 / n;
  let radius = 0;
  let activeIndex = 0;

  galleryImages.forEach((imgObj, i) => {
    const angle = i * angleStep;
    const tilt = (Math.random() * 6 - 3).toFixed(1);
    
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.dataset.tilt = tilt;
    card.style.transform = `rotateY(${angle}deg) translateZ(300px) rotateZ(${tilt}deg)`;
    
    const img = document.createElement("img");
    img.src = imgObj.src;
    img.alt = imgObj.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 244;
    img.height = 294;
    
    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--sun)'];
    const fallbackColor = colors[i % colors.length];
    
    img.onerror = () => {
      const fallback = document.createElement("div");
      fallback.style.width = "100%";
      fallback.style.height = "100%";
      fallback.style.backgroundColor = fallbackColor;
      fallback.style.border = "2px solid var(--ink)";
      fallback.style.display = "flex";
      fallback.style.alignItems = "center";
      fallback.style.justifyContent = "center";
      fallback.style.padding = "1rem";
      fallback.style.textAlign = "center";
      fallback.style.color = (fallbackColor === 'var(--sun)') ? 'var(--ink)' : 'var(--paper)';
      fallback.style.fontFamily = "var(--font-head)";
      fallback.style.fontSize = "1.5rem";
      fallback.textContent = imgObj.caption;
      img.replaceWith(fallback);
    };

    const caption = document.createElement("div");
    caption.className = "gallery-caption";
    caption.innerHTML = `<span>${imgObj.caption}</span><i class="fa-solid fa-camera" aria-hidden="true"></i>`;

    card.appendChild(img);
    card.appendChild(caption);
    ring.appendChild(card);
    
    card.addEventListener('click', () => {
      if (window.innerWidth >= 768 && i !== activeIndex) return;
      const lightboxModal = document.getElementById('galleryLightbox');
      if (lightboxModal) {
        const lbImg = document.getElementById('lightboxImg');
        const lbCap = document.getElementById('lightboxCaption');
        if (lbImg && lbCap) {
          lbImg.src = imgObj.src;
          lbImg.alt = imgObj.alt;
          lbCap.textContent = imgObj.caption;
          if (window.bootstrap) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(lightboxModal);
            bsModal.show();
          }
        }
      }
    });
  });

  const counter = document.getElementById("galCounter");
  const stage = document.querySelector(".gallery-stage");

  function updateRadius() {
    if (window.innerWidth < 768) return;
    const cw = ring.offsetWidth || 260;
    radius = Math.round((cw / 2) / Math.tan(Math.PI / n)) + 30; // 30px gap
    
    const cards = ring.querySelectorAll('.gallery-card');
    cards.forEach((card, i) => {
      const angle = i * angleStep;
      const tilt = card.dataset.tilt || "0";
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px) rotateZ(${tilt}deg)`;
    });
  }

  function rotateRing() {
    if (window.innerWidth < 768) return;
    ring.style.transform = `translateZ(-${radius}px) rotateY(${currentAngle}deg)`;
    
    let normalizedAngle = currentAngle % 360;
    if (normalizedAngle > 0) normalizedAngle = 360 - normalizedAngle;
    else normalizedAngle = Math.abs(normalizedAngle);
    
    activeIndex = Math.round(normalizedAngle / angleStep) % n;
    
    if (counter) {
      counter.textContent = String(activeIndex + 1).padStart(2, '0') + " / " + String(n).padStart(2, '0');
    }
    
    const cards = ring.querySelectorAll('.gallery-card');
    cards.forEach((card, idx) => {
      if (idx === activeIndex) {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      } else {
        card.style.opacity = '0.55';
        card.style.pointerEvents = 'none';
      }
    });
  }

  window.addEventListener('resize', () => {
    updateRadius();
    rotateRing();
  });
  updateRadius();
  rotateRing();

  document.getElementById("galPrev")?.addEventListener("click", () => {
    if (window.innerWidth < 768) {
      if (stage) stage.scrollBy({ left: -window.innerWidth * 0.75 - 24, behavior: 'smooth' });
      return;
    }
    currentAngle += angleStep;
    rotateRing();
  });
  
  document.getElementById("galNext")?.addEventListener("click", () => {
    if (window.innerWidth < 768) {
      if (stage) stage.scrollBy({ left: window.innerWidth * 0.75 + 24, behavior: 'smooth' });
      return;
    }
    currentAngle -= angleStep;
    rotateRing();
  });

  let startX = 0;
  let isDragging = false;
  let startAngle = 0;

  function onPointerDown(e) {
    if (window.innerWidth < 768) return;
    if (e.target.closest('.gallery-arrow')) return;
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    startAngle = currentAngle;
    ring.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    if (x === undefined) return;
    const dx = x - startX;
    currentAngle = startAngle + (dx * 0.4);
    rotateRing();
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    ring.style.transition = 'transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)';
    currentAngle = Math.round(currentAngle / angleStep) * angleStep;
    rotateRing();
  }

  if (stage) {
    stage.addEventListener("mousedown", onPointerDown);
    stage.addEventListener("touchstart", onPointerDown, {passive: true});
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, {passive: true});
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    
    stage.addEventListener("scroll", () => {
      if (window.innerWidth >= 768) return;
      const scrollAmt = (window.innerWidth * 0.75) + 24;
      const scrollIndex = Math.round(stage.scrollLeft / scrollAmt);
      const newActive = Math.min(Math.max(scrollIndex, 0), n - 1);
      if (counter) {
        counter.textContent = String(newActive + 1).padStart(2, '0') + " / " + String(n).padStart(2, '0');
      }
    });
    if (window.innerWidth < 768 && counter) {
      counter.textContent = "01 / " + String(n).padStart(2, '0');
    }
  }

  let autoRotateInterval;
  let isHovered = false;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startAutoRotate() {
    if (isReducedMotion || window.innerWidth < 768) return;
    stopAutoRotate();
    autoRotateInterval = setInterval(() => {
      if (!isHovered && !isDragging) {
        const lightboxEl = document.getElementById('galleryLightbox');
        const isLightboxOpen = lightboxEl && lightboxEl.classList.contains('show');
        if (!isLightboxOpen) {
          currentAngle -= angleStep;
          rotateRing();
        }
      }
    }, 3500);
  }

  function stopAutoRotate() {
    clearInterval(autoRotateInterval);
  }

  section.addEventListener('mouseenter', () => isHovered = true);
  section.addEventListener('mouseleave', () => isHovered = false);
  section.addEventListener('focusin', () => isHovered = true);
  section.addEventListener('focusout', () => isHovered = false);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startAutoRotate();
        } else {
          stopAutoRotate();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(section);
  }

  section.addEventListener('keydown', (e) => {
    if (window.innerWidth < 768) return;
    if (e.key === 'ArrowLeft') {
      currentAngle += angleStep;
      rotateRing();
    } else if (e.key === 'ArrowRight') {
      currentAngle -= angleStep;
      rotateRing();
    }
  });

})();

// ═══════════════ L. SPONSORS ════════════════════════════════════════════════════════════════════
(function initSponsors() {
  const track1 = document.getElementById('sponsorsTrack1');
  const track2 = document.getElementById('sponsorsTrack2');
  if (!track1 || !track2) return;

  const sponsors = [
    { name: "NULLPTR LABS", icon: "fa-solid fa-code", color: "var(--accent)", font: "var(--font-mono)", tier: "TITLE" },
    { name: "STUDIOBLOB", icon: "fa-solid fa-palette", color: "var(--accent-2)", font: "var(--font-head)", tier: "GOLD" },
    { name: "MEGASTACK", icon: "fa-solid fa-layer-group", color: "var(--sun)", font: "sans-serif", tier: "SILVER", weight: "900" },
    { name: "TIDAL OPS", icon: "fa-solid fa-water", color: "var(--ink)", font: "var(--font-head)", tier: "SILVER" },
    { name: "KITEBASE", icon: "fa-solid fa-paper-plane", color: "var(--accent)", font: "var(--font-mono)", tier: "GOLD" },
    { name: "FERNWAVE", icon: "fa-solid fa-leaf", color: "var(--accent-2)", font: "serif", tier: "SILVER", style: "italic" },
    { name: "POLLEN", icon: "fa-solid fa-seedling", color: "var(--sun)", font: "sans-serif", tier: "TITLE", weight: "900" },
    { name: "NORTHBEAM", icon: "fa-solid fa-compass", color: "var(--ink)", font: "var(--font-head)", tier: "GOLD" }
  ];

  function createCardHTML(s, i) {
    const delay = -(i * 0.7) + "s";
    return `
      <div class="sponsor-card" style="animation-delay: ${delay};">
        <span class="sponsor-tier">${s.tier}</span>
        <div class="sponsor-logo" style="font-family: ${s.font}; font-weight: ${s.weight || 'bold'}; font-style: ${s.style || 'normal'};">
          <i class="${s.icon}" style="color: ${s.color};" aria-hidden="true"></i>
          <span>${s.name}</span>
        </div>
      </div>
    `;
  }

  let rowHTML = '';
  sponsors.forEach((s, i) => { rowHTML += createCardHTML(s, i); });
  track1.innerHTML = rowHTML + rowHTML;

  let row2HTML = '';
  const revSponsors = [...sponsors].reverse();
  revSponsors.forEach((s, i) => { row2HTML += createCardHTML(s, i); });
  track2.innerHTML = row2HTML + row2HTML;
})();

// ═══════════════ M. SCROLL SPY FOR NAVBAR ════════════════════════════════════════════════
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id], header[id], footer[id]');
  const navLinks = document.querySelectorAll('.nav-slim-link');
  if (!navLinks.length) return;
  
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 100; // offset for navbar height
    
    sections.forEach(sec => {
      if (sec.offsetTop <= scrollPos && sec.offsetTop + sec.offsetHeight > scrollPos) {
        current = sec.getAttribute('id');
      }
    });
    
    navLinks.forEach(a => {
      a.classList.remove('active-section');
      if (current && a.getAttribute('href').includes(current)) {
        a.classList.add('active-section');
      }
    });
  }, { passive: true });
})();
