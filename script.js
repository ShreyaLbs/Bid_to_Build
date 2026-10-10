/* ================================================================
   Aurora Fest '26 — Campus Event Hub
   All DOM logic lives here. No libraries beyond Bootstrap + FA.
   ================================================================ */

// ── 1. DATA ──────────────────────────────────────────────────────
const events = [
  { id: 1, name: "Midnight Hackathon", category: "Technical", date: "2026-10-24", time: "09:00 AM", venue: "Innovation Lab, Block A", description: "Build something extraordinary from scratch in 36 hours fueled entirely by free energy drinks.", totalSeats: 120, seatsLeft: 45 },
  { id: 2, name: "Battle of Bands", category: "Cultural", date: "2026-10-25", time: "06:00 PM", venue: "Open Air Amphitheatre", description: "Electrify the amphitheatre crowd with your original music. No covers, just raw noise.", totalSeats: 500, seatsLeft: 312 },
  { id: 3, name: "Street Football 5v5", category: "Sports", date: "2026-10-26", time: "08:00 AM", venue: "Sports Court B", description: "Fast-paced cage football. Assemble your squad and bring the heat to the concrete.", totalSeats: 64, seatsLeft: 8 },
  { id: 4, name: "Figma Prototype Sprint", category: "Workshop", date: "2026-10-28", time: "10:00 AM", venue: "Design Studio", description: "Master UI/UX basics and build a working app prototype in one intense afternoon.", totalSeats: 60, seatsLeft: 60 },
  { id: 5, name: "Solo Dance Showdown", category: "Cultural", date: "2026-10-30", time: "05:00 PM", venue: "Main Stage", description: "Showcase your best routine on the main stage. Breakdancing, classical, or anything in between.", totalSeats: 80, seatsLeft: 0 },
  { id: 6, name: "Capture The Flag", category: "Technical", date: "2026-10-31", time: "11:00 AM", venue: "Cybersecurity Lab", description: "Break into our deliberately insecure servers and steal the flags before the other hackers do.", totalSeats: 80, seatsLeft: 7 },
  { id: 7, name: "Table Tennis Open", category: "Sports", date: "2026-11-01", time: "09:30 AM", venue: "Indoor Games Hall", description: "Singles knockout tournament in the indoor hall. Fast rallies, zero mercy.", totalSeats: 96, seatsLeft: 54 },
  { id: 8, name: "Pottery for Beginners", category: "Workshop", date: "2026-11-02", time: "02:00 PM", venue: "Art Room, Block D", description: "Get your hands dirty and learn to throw clay on the wheel. You will make a mess.", totalSeats: 40, seatsLeft: 26 }
];

// ── 2. STATE & PERSISTENCE ───────────────────────────────────────
const registrations = new Map();
let myRegistrations = []; // Array of { eventId, email }
let pendingSuccess = null;

function loadData() {
  try {
    const savedEvents = localStorage.getItem('auroraEvents');
    if (savedEvents) {
      const parsed = JSON.parse(savedEvents);
      parsed.forEach(pe => {
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
    console.error("Failed to load local data", e);
  }
}

function saveData() {
  try {
    const eventsData = events.map(e => ({ id: e.id, seatsLeft: e.seatsLeft }));
    localStorage.setItem('auroraEvents', JSON.stringify(eventsData));
    
    const regsData = Array.from(registrations.entries()).map(([id, set]) => [id, Array.from(set)]);
    localStorage.setItem('auroraRegs', JSON.stringify(regsData));
    
    localStorage.setItem('auroraMyRegs', JSON.stringify(myRegistrations));
  } catch (e) {
    console.error("Failed to save local data", e);
  }
}

loadData();

// ── 3. THEME TOGGLE ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  function updateIcon() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }
  updateIcon(); // sync on load

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    document.documentElement.setAttribute('data-bs-theme', !isDark ? 'dark' : 'light');
    updateIcon();
    try {
      localStorage.setItem('auroraTheme', !isDark ? 'dark' : 'light');
    } catch(e) {
      console.error("Could not save theme", e);
    }
  });
});

// ── 4. HELPERS ────────────────────────────────────────────────────
const CATEGORY_META = {
  Technical: { colorClass: "cat-technical", label: "TECHNICAL" },
  Cultural:  { colorClass: "cat-cultural",  label: "CULTURAL" },
  Sports:    { colorClass: "cat-sports",    label: "SPORTS" },
  Workshop:  { colorClass: "cat-workshop",  label: "WORKSHOP" }
};

function formatDatePieces(iso) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  return { day, month };
}

function formatGCalUrl(event) {
  // Rough ISO format conversion for Google Calendar (local time treated as UTC for simplicity)
  const [hh, mm, mod] = event.time.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
  let h = parseInt(hh, 10);
  if (mod === 'PM' && h < 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  
  const pad = n => n.toString().padStart(2, '0');
  const dStr = event.date.replace(/-/g, '');
  const tStr = `${pad(h)}${mm}00`;
  const endTStr = `${pad((h + 2) % 24)}${mm}00`; // simple +2h end time
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${dStr}T${tStr}/${dStr}T${endTStr}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`;
}

function renderBarcodeSeats(event) {
  const { seatsLeft } = event;
  
  if (seatsLeft === 0) {
    return `<div class="seats-barcode barcode-full" aria-hidden="true">|| |||| | ||||| |</div>
            <div class="seats-text">FULL</div>`;
  }
  
  if (seatsLeft <= 5) {
    return `<div class="seats-barcode barcode-low" aria-hidden="true">|| |||| | ||||| |</div>
            <div class="seats-text text-low">ONLY ${seatsLeft} LEFT</div>`;
  }
  
  return `<div class="seats-barcode" aria-hidden="true">|| |||| | ||||| |</div>
          <div class="seats-text">${seatsLeft} SEATS LEFT</div>`;
}

function registerButton(event) {
  if (event.seatsLeft === 0) {
    return `<button class="btn btn-card btn-disabled" disabled aria-disabled="true">FULL</button>`;
  }
  return `<button class="btn btn-card" data-id="${event.id}" aria-label="Register for ${event.name}">REGISTER</button>`;
}

// ── 5. RENDER CARDS ───────────────────────────────────────────────
function renderEventCard(event) {
  const meta = CATEGORY_META[event.category] || { colorClass: "", label: "OTHER" };
  const { day, month } = formatDatePieces(event.date);
  const isFull = event.seatsLeft === 0;
  const calUrl = formatGCalUrl(event);
  
  return `
    <div class="col-12 col-lg-6">
      <article class="event-card ${isFull ? 'event-card-full' : ''}" aria-labelledby="ev-name-${event.id}">
        <div class="ticket-left ${meta.colorClass}">
          <div class="ticket-date">
            <span class="ticket-month">${month}</span>
            <span class="ticket-day">${day}</span>
          </div>
          <div class="ticket-stamp">${meta.label}</div>
        </div>
        <div class="ticket-right">
          ${isFull ? '<div class="stamp-sold-out">FULL</div>' : ''}
          <div class="ticket-header">
            <h3 class="event-name" id="ev-name-${event.id}">${event.name.toUpperCase()}</h3>
            <p class="event-desc">${event.description}</p>
            <ul class="event-meta list-unstyled" aria-label="Event details">
              <li><i class="fa-solid fa-clock" aria-hidden="true"></i>${event.time}</li>
              <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${event.venue}</li>
            </ul>
          </div>
          <div class="ticket-tear-line"></div>
          <div class="ticket-footer">
            <div class="ticket-seats">
              ${renderBarcodeSeats(event)}
            </div>
            <div class="d-flex gap-2">
              <a href="${calUrl}" target="_blank" class="btn btn-card p-2" aria-label="Add to Calendar" title="Add to Calendar"><i class="fa-solid fa-calendar-plus"></i></a>
              ${registerButton(event)}
            </div>
          </div>
        </div>
      </article>
    </div>`;
}

// ── 6. FILTER, SEARCH & SORT LOGIC ───────────────────────────────
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

  let filtered = events.filter(ev => {
    const matchesCat    = cat === "All" || ev.category === cat;
    const matchesSearch = ev.name.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  filtered.sort((a, b) => {
    if (sort === 'date') return new Date(a.date) - new Date(b.date);
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'seats') return a.seatsLeft - b.seatsLeft;
    return 0;
  });

  grid.innerHTML = filtered.map(renderEventCard).join("");
  resultCount.textContent = \`Showing \${filtered.length} of \${events.length} events\`;

  if (filtered.length === 0) {
    emptyState.classList.remove("d-none");
  } else {
    emptyState.classList.add("d-none");
  }
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);
document.querySelectorAll('input[name="catFilter"]').forEach(radio => {
  radio.addEventListener("change", applyFilters);
});

// ── 7. VALIDATION RULES ───────────────────────────────────────────
const RULES = {
  regName(val) {
    if (!val)               return "Full name is required.";
    if (val.length < 3)     return "Name must be at least 3 characters.";
    if (!/^[A-Za-z\s]+$/.test(val)) return "Name may only contain letters and spaces.";
    return null;
  },
  regEmail(val, eventId) {
    if (!val)                               return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email address.";
    const set = registrations.get(eventId);
    if (set && set.has(val.toLowerCase())) return "This email is already registered for this event.";
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

// ── 9. MODAL & FORM LOGIC ─────────────────────────────────────────
function validateField(input) {
  const rule = RULES[input.id];
  if (!rule) return true;

  const val = input.value.trim();
  const error = (input.id === "regEmail")
    ? rule(val, activeEventId)
    : rule(val);

  const feedback = document.getElementById(input.id + "Feedback");

  if (error) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    if (feedback) feedback.textContent = error;
    return false;
  }
  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  if (feedback) feedback.textContent = "";
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
  regForm.querySelectorAll(".reg-input").forEach(inp => {
    inp.classList.remove("is-valid", "is-invalid");
  });
  regForm.querySelectorAll(".invalid-feedback").forEach(el => {
    el.textContent = "";
  });
  activeEventId = null;
}

regModalEl.addEventListener("shown.bs.modal", () => {
  document.getElementById("regName").focus();
});

regModalEl.addEventListener("hidden.bs.modal", () => {
  resetForm();
  if (pendingSuccess) {
    const { name, eventName } = pendingSuccess;
    successMsgEl.textContent = \`THANK YOU, \${name.toUpperCase()}! YOU ARE REGISTERED FOR \${eventName.toUpperCase()}.\`;
    pendingSuccess = null;
    successModalBS.show();
  }
});

["regName", "regEmail", "regPhone"].forEach(id => {
  document.getElementById(id).addEventListener("blur", function () {
    validateField(this);
  });
});

regForm.addEventListener("submit", e => {
  e.preventDefault();

  const nameInput  = document.getElementById("regName");
  const emailInput = document.getElementById("regEmail");
  const phoneInput = document.getElementById("regPhone");

  const allValid = [validateField(nameInput), validateField(emailInput), validateField(phoneInput)].every(Boolean);
  if (!allValid) return;

  const ev    = events.find(e => e.id === activeEventId);
  const name  = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  // Save to registrations Map
  if (!registrations.has(activeEventId)) {
    registrations.set(activeEventId, new Set());
  }
  registrations.get(activeEventId).add(email);

  // Save to My Events
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
const myEventsBody = document.getElementById('myEventsBody');
const myEventsBadge = document.getElementById('myEventsBadge');

function updateMyEvents() {
  myEventsBadge.textContent = myRegistrations.length;
  if (myRegistrations.length > 0) {
    myEventsBadge.classList.remove('d-none');
  } else {
    myEventsBadge.classList.add('d-none');
  }

  if (myRegistrations.length === 0) {
    myEventsBody.innerHTML = \`
      <div class="text-center py-5 text-muted">
        <i class="fa-solid fa-ticket fa-3x mb-3 text-ink"></i>
        <h6 class="font-head text-ink mb-1">NO TICKETS YET</h6>
        <p class="font-body small">Go register for something!</p>
      </div>\`;
    return;
  }

  myEventsBody.innerHTML = myRegistrations.map(reg => {
    const ev = events.find(e => e.id === reg.eventId);
    if (!ev) return '';
    return \`
      <div class="card bg-card border-ink mb-3 shadow-sm rounded-0">
        <div class="card-body">
          <h6 class="font-head mb-1">\${ev.name}</h6>
          <p class="font-mono small mb-3 text-muted">
            <i class="fa-solid fa-calendar me-1"></i>\${ev.date} at \${ev.time}<br>
            <i class="fa-solid fa-location-dot me-1"></i>\${ev.venue}
          </p>
          <div class="d-flex gap-2">
            <a href="\${formatGCalUrl(ev)}" target="_blank" class="btn btn-sm btn-ink flex-grow-1"><i class="fa-solid fa-calendar-plus me-1"></i>Add</a>
            <button class="btn btn-sm btn-accent cancel-btn" data-id="\${ev.id}" data-email="\${reg.email}">Cancel</button>
          </div>
        </div>
      </div>
    \`;
  }).join('');
}

myEventsBody.addEventListener('click', e => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;
  
  const id = Number(btn.dataset.id);
  const email = btn.dataset.email;
  
  // Update state
  const ev = events.find(e => e.id === id);
  if (ev) ev.seatsLeft++;
  
  if (registrations.has(id)) {
    registrations.get(id).delete(email);
  }
  
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
