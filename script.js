/* ================================================================
   Aurora Fest '26 — Campus Event Hub
   All DOM logic lives here. No libraries beyond Bootstrap + FA.
   ================================================================ */

// ── 1. DATA ──────────────────────────────────────────────────────
const events = [
  {
    id: 1,
    name: "Hackathon Blitz",
    category: "Technical",
    date: "2026-10-24",
    time: "09:00 AM",
    venue: "Innovation Lab, Block A",
    description: "36-hour coding sprint. Build something extraordinary from scratch. Open to all branches.",
    totalSeats: 120,
    seatsLeft: 45
  },
  {
    id: 2,
    name: "Battle of Bands",
    category: "Cultural",
    date: "2026-10-25",
    time: "06:00 PM",
    venue: "Open Air Amphitheatre",
    description: "Electrify the crowd with your band's original music. Rock, jazz, fusion — all welcome.",
    totalSeats: 500,
    seatsLeft: 312
  },
  {
    id: 3,
    name: "3x3 Basketball Cup",
    category: "Sports",
    date: "2026-10-26",
    time: "08:00 AM",
    venue: "Sports Court B",
    description: "Fast-paced 3-on-3 basketball. Form a team of 3 and bring the heat.",
    totalSeats: 64,
    seatsLeft: 8   // LOW
  },
  {
    id: 4,
    name: "AI & ML Workshop",
    category: "Workshop",
    date: "2026-10-28",
    time: "10:00 AM",
    venue: "Seminar Hall 2",
    description: "Hands-on sessions on neural networks, model training and deployment. Laptops required.",
    totalSeats: 60,
    seatsLeft: 60
  },
  {
    id: 5,
    name: "Solo Dance Showdown",
    category: "Cultural",
    date: "2026-10-30",
    time: "05:00 PM",
    venue: "Main Stage, Quad",
    description: "Showcase your moves across classical, hip-hop, or contemporary styles. All forms accepted.",
    totalSeats: 80,
    seatsLeft: 0   // FULL
  },
  {
    id: 6,
    name: "Capture The Flag",
    category: "Technical",
    date: "2026-10-31",
    time: "11:00 AM",
    venue: "Cybersecurity Lab, Block C",
    description: "Test your ethical hacking skills in this intense cybersecurity competition.",
    totalSeats: 80,
    seatsLeft: 7   // LOW
  },
  {
    id: 7,
    name: "Table Tennis Open",
    category: "Sports",
    date: "2026-11-01",
    time: "09:30 AM",
    venue: "Indoor Games Hall",
    description: "Singles and doubles knockout tournament. Register as an individual or pair.",
    totalSeats: 96,
    seatsLeft: 54
  },
  {
    id: 8,
    name: "UI/UX Design Sprint",
    category: "Workshop",
    date: "2026-11-02",
    time: "02:00 PM",
    venue: "Design Studio, Block D",
    description: "Learn Figma prototyping, user research and usability testing in a one-day intensive sprint.",
    totalSeats: 40,
    seatsLeft: 26
  }
];

// ── 2. HELPERS ────────────────────────────────────────────────────
const CATEGORY_META = {
  Technical: { icon: "fa-solid fa-microchip",          cls: "badge-technical" },
  Cultural:  { icon: "fa-solid fa-masks-theater",       cls: "badge-cultural"  },
  Sports:    { icon: "fa-solid fa-trophy",              cls: "badge-sports"    },
  Workshop:  { icon: "fa-solid fa-screwdriver-wrench",  cls: "badge-workshop"  }
};

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function seatsBadge(event) {
  const { totalSeats, seatsLeft } = event;
  const low = totalSeats * 0.15; // ≤15% is "low"
  if (seatsLeft === 0)  return `<span class="badge-seats seats-full"><i class="fa-solid fa-lock me-1" aria-hidden="true"></i>Full</span>`;
  if (seatsLeft <= low) return `<span class="badge-seats seats-low"><i class="fa-solid fa-fire me-1" aria-hidden="true"></i>${seatsLeft} left</span>`;
  return                        `<span class="badge-seats seats-ok"><i class="fa-solid fa-ticket me-1" aria-hidden="true"></i>${seatsLeft} seats</span>`;
}

function registerButton(event) {
  if (event.seatsLeft === 0) {
    return `<button class="btn btn-sm btn-filter" disabled aria-disabled="true" style="opacity:.45;cursor:not-allowed">Sold Out</button>`;
  }
  return `<button class="btn btn-sm btn-accent" data-id="${event.id}" aria-label="Register for ${event.name}">Register</button>`;
}

// ── 3. RENDER (ONE reusable function) ────────────────────────────
function renderEventCard(event) {
  const meta = CATEGORY_META[event.category] || { icon: "fa-solid fa-star", cls: "" };
  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <article class="event-card" aria-labelledby="ev-name-${event.id}">
        <div class="event-card-header">
          <h3 class="event-name" id="ev-name-${event.id}">${event.name}</h3>
          <span class="badge-cat ${meta.cls}" role="img" aria-label="${event.category} category">
            <i class="${meta.icon} me-1" aria-hidden="true"></i>${event.category}
          </span>
        </div>
        <div class="event-card-body">
          <p class="event-desc">${event.description}</p>
          <ul class="event-meta list-unstyled" aria-label="Event details">
            <li><i class="fa-solid fa-calendar-days" aria-hidden="true"></i>${formatDate(event.date)}</li>
            <li><i class="fa-solid fa-clock" aria-hidden="true"></i>${event.time}</li>
            <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${event.venue}</li>
          </ul>
        </div>
        <div class="event-card-footer">
          ${seatsBadge(event)}
          ${registerButton(event)}
        </div>
      </article>
    </div>`;
}

// ── 4. FILTER + SEARCH LOGIC ─────────────────────────────────────
const grid       = document.getElementById("eventGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");

function getActiveCat() {
  const checked = document.querySelector('input[name="catFilter"]:checked');
  return checked ? checked.value : "All";
}

function applyFilters() {
  const query  = searchInput.value.trim().toLowerCase();
  const cat    = getActiveCat();

  const filtered = events.filter(ev => {
    const matchesCat    = cat === "All" || ev.category === cat;
    const matchesSearch = ev.name.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  grid.innerHTML = filtered.map(renderEventCard).join("");

  if (filtered.length === 0) {
    emptyState.classList.remove("d-none");
  } else {
    emptyState.classList.add("d-none");
  }
}

// ── 5. FILTER / SEARCH LISTENERS ─────────────────────────────────
searchInput.addEventListener("input", applyFilters);

document.querySelectorAll('input[name="catFilter"]').forEach(radio => {
  radio.addEventListener("change", applyFilters);
});

// ── 6. REGISTRATION STATE ─────────────────────────────────────────
// Map<eventId, Set<lowercased email>> — one entry per event
const registrations = new Map();

// Holds success data between reg modal close and success modal open
let pendingSuccess = null;

// ── 7. VALIDATION RULES (single source of truth) ──────────────────
// Each rule returns null on pass, or an error string on fail.
// validateEmail also receives the active eventId for dup-check.
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

// ── 8. MODAL ELEMENT REFERENCES ──────────────────────────────────
const regModalEl      = document.getElementById("regModal");
const regForm         = document.getElementById("regForm");
const regModalEvName  = document.getElementById("regModalEventName");
const successModalEl  = document.getElementById("successModal");
const successMsgEl    = document.getElementById("successMsg");

// Bootstrap Modal instances
const regModalBS     = new bootstrap.Modal(regModalEl);
const successModalBS = new bootstrap.Modal(successModalEl);

// Which event is currently being registered
let activeEventId = null;

// ── 9. VALIDATE SINGLE FIELD ──────────────────────────────────────
// Returns true if valid, false if invalid. Applies is-valid / is-invalid.
function validateField(input) {
  const rule = RULES[input.id];
  if (!rule) return true;

  const val = input.value.trim();
  // Email rule needs the active event id for the duplicate check
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

// ── 10. OPEN REGISTRATION MODAL ───────────────────────────────────
function openRegModal(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev || ev.seatsLeft === 0) return;

  activeEventId = eventId;
  regModalEvName.textContent = ev.name;
  regModalBS.show();
}

// ── 11. RESET FORM & STATE ────────────────────────────────────────
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

// ── 12. MODAL LIFECYCLE LISTENERS ────────────────────────────────

// Move focus to first field when reg modal opens
regModalEl.addEventListener("shown.bs.modal", () => {
  document.getElementById("regName").focus();
});

// On reg modal fully hidden: reset form, then open success if needed
regModalEl.addEventListener("hidden.bs.modal", () => {
  resetForm();
  if (pendingSuccess) {
    const { name, eventName } = pendingSuccess;
    successMsgEl.textContent =
      `Thank you, ${name}! You are registered for ${eventName}.`;
    pendingSuccess = null;
    successModalBS.show();
  }
});

// ── 13. BLUR VALIDATION ───────────────────────────────────────────
// Validate each field as soon as focus leaves it
["regName", "regEmail", "regPhone"].forEach(id => {
  document.getElementById(id).addEventListener("blur", function () {
    validateField(this);
  });
});

// ── 14. FORM SUBMIT ───────────────────────────────────────────────
regForm.addEventListener("submit", e => {
  e.preventDefault();

  const nameInput  = document.getElementById("regName");
  const emailInput = document.getElementById("regEmail");
  const phoneInput = document.getElementById("regPhone");

  // Validate all three; collect results so all fields show errors at once
  const allValid = [
    validateField(nameInput),
    validateField(emailInput),
    validateField(phoneInput)
  ].every(Boolean); // .every preserves short-circuit; collect array first

  if (!allValid) return;

  // ── Success path ──────────────────────────────────────────────
  const ev    = events.find(e => e.id === activeEventId);
  const name  = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  // Record this email so a second attempt is blocked
  if (!registrations.has(activeEventId)) {
    registrations.set(activeEventId, new Set());
  }
  registrations.get(activeEventId).add(email);

  // Decrement seat and re-render the grid
  ev.seatsLeft = Math.max(0, ev.seatsLeft - 1);
  applyFilters();

  // Queue success modal to open after reg modal fully closes
  pendingSuccess = { name, eventName: ev.name };
  regModalBS.hide(); // triggers hidden.bs.modal → resetForm → successModal
});

// ── 15. DELEGATED CARD CLICK ─────────────────────────────────────
// Works even after grid re-renders
grid.addEventListener("click", e => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  openRegModal(Number(btn.dataset.id));
});

// ── 16. INITIAL RENDER ────────────────────────────────────────────
applyFilters();

