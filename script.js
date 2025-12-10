/* ============================================================
   GLOBAL STATE
============================================================ */
let pyqData = [];
let currentFiltered = [];

let selectedYears = new Set();
let selectedSubjects = new Set();
let selectedTopics = new Set();

let marksFilter = "";
let sortFilter = "";

/* Mapping for fast filtering */
let subjectTopicMap = {}; // subject → topics[]
let yearList = [];
let subjectList = [];

/* ============================================================
   INITIAL LOAD
============================================================ */
async function loadData() {
  showSkeleton();
  const res = await fetch("./data/pyqs.json");
  pyqData = await res.json();

  preprocessMappings();
  renderModalChips();
  hideSkeleton();
  filterAndDisplay();
}

/* Build lookup maps for fast filtering */
function preprocessMappings() {
  yearList = [...new Set(pyqData.map((q) => q.year))].sort();
  subjectList = [...new Set(pyqData.map((q) => q.subject))].sort();

  subjectTopicMap = {};
  pyqData.forEach((q) => {
    if (!subjectTopicMap[q.subject]) subjectTopicMap[q.subject] = new Set();
    subjectTopicMap[q.subject].add(q.topic);
  });

  // Convert sets to arrays
  Object.keys(subjectTopicMap).forEach((sub) => {
    subjectTopicMap[sub] = [...subjectTopicMap[sub]].sort();
  });
}

/* ============================================================
   RENDER CHIP UI INSIDE FILTER MODAL
============================================================ */
function renderModalChips() {
  // YEAR CHIPS
  const yearBox = document.getElementById("yearChips");
  yearBox.innerHTML = "";
  yearList.forEach((y) => yearBox.appendChild(makeChip(y, "year")));

  // SUBJECT CHIPS
  const subBox = document.getElementById("subjectChips");
  subBox.innerHTML = "";
  subjectList.forEach((s) => subBox.appendChild(makeChip(s, "subject")));

  // TOPIC CHIPS – empty until subject selected
  updateTopicChips();
}

/* Create a chip element */
function makeChip(label, type) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.textContent = label;

  chip.addEventListener("click", () => {
    toggleChip(label, type, chip);
  });

  return chip;
}

/* Chip selection logic */
function toggleChip(label, type, chipEl) {
  if (type === "year") {
    toggleSet(selectedYears, label);
    chipEl.classList.toggle("selected");
  } else if (type === "subject") {
    toggleSet(selectedSubjects, label);
    chipEl.classList.toggle("selected");
    updateTopicChips(); // refresh topics dynamically
  } else if (type === "topic") {
    toggleSet(selectedTopics, label);
    chipEl.classList.toggle("selected");
  }
}

/* Utility for toggling item inside a Set */
function toggleSet(set, value) {
  set.has(value) ? set.delete(value) : set.add(value);
}

/* Build topic chips based on selected subjects */
function updateTopicChips() {
  const topicBox = document.getElementById("topicChips");
  topicBox.innerHTML = "";

  if (selectedSubjects.size === 0) {
    topicBox.classList.add("disabled");
    return;
  }

  topicBox.classList.remove("disabled");

  // Aggregate topics from selected subjects
  let topics = new Set();
  selectedSubjects.forEach((sub) => {
    (subjectTopicMap[sub] || []).forEach((t) => topics.add(t));
  });

  [...topics].sort().forEach((t) => {
    const chip = makeChip(t, "topic");
    topicBox.appendChild(chip);
  });
}

/* ============================================================
   MODAL CONTROLS
============================================================ */
document.getElementById("openFilterBtn").onclick = () => {
  document.getElementById("filterModal").classList.remove("hidden");
};

document.getElementById("closeFilterBtn").onclick = () => {
  document.getElementById("filterModal").classList.add("hidden");
};

/* Reset Filters */
document.getElementById("resetFilters").onclick = () => {
  selectedYears.clear();
  selectedSubjects.clear();
  selectedTopics.clear();

  marksFilter = "";
  sortFilter = "";
  document.getElementById("marksFilterModal").value = "";
  document.getElementById("sortFilterModal").value = "";

  renderModalChips();
};

/* Apply Filters */
document.getElementById("applyFilters").onclick = () => {
  marksFilter = document.getElementById("marksFilterModal").value;
  sortFilter = document.getElementById("sortFilterModal").value;

  document.getElementById("filterModal").classList.add("hidden");
  filterAndDisplay();
};

/* ============================================================
   FILTER ENGINE
============================================================ */
function filterAndDisplay() {
  let filtered = pyqData.filter((q) => {
    return (
      (selectedYears.size === 0 || selectedYears.has(q.year)) &&
      (selectedSubjects.size === 0 || selectedSubjects.has(q.subject)) &&
      (selectedTopics.size === 0 || selectedTopics.has(q.topic)) &&
      (marksFilter === "" || q.marks == marksFilter)
    );
  });

  // Sort
  if (sortFilter === "yearAsc") filtered.sort((a, b) => a.year - b.year);
  if (sortFilter === "yearDesc") filtered.sort((a, b) => b.year - a.year);
  if (sortFilter === "marksAsc") filtered.sort((a, b) => a.marks - b.marks);
  if (sortFilter === "marksDesc") filtered.sort((a, b) => b.marks - a.marks);

  currentFiltered = filtered;
  displayFiltered(filtered);
}

/* ============================================================
   DISPLAY QUESTIONS + SEARCH HIGHLIGHT
============================================================ */
function displayFiltered(list) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (list.length === 0) {
    results.innerHTML = "<p>No questions found.</p>";
    return;
  }

  const query =
    document.getElementById("searchBox")?.value?.toLowerCase() || "";

  list.forEach((q) => {
    const card = document.createElement("div");
    card.className = "question-card";

    let questionText = q.question;
    if (query.length > 0) {
      questionText = questionText.replace(
        new RegExp(query, "gi"),
        (match) => `<mark>${match}</mark>`
      );
    }

    card.innerHTML = `
            <strong>${q.subject} (${q.year}) – ${q.marks} marks</strong>
            <p>${questionText}</p>
            <small>${q.topic} → ${q.subtopic}</small>
        `;

    results.appendChild(card);
  });
}

/* Live search box (outside modal) */
document.addEventListener("input", (e) => {
  if (e.target.id === "searchBox") filterAndDisplay();
});

/* ============================================================
   SKELETON LOADER
============================================================ */
function showSkeleton() {
  const results = document.getElementById("results");
  results.innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;
}

function hideSkeleton() {
  document.getElementById("results").innerHTML = "";
}

/* ============================================================
   PDF EXPORT (Grouped + Clean)
============================================================ */
document.getElementById("pdfBtn").onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  doc.setFontSize(16);
  doc.text("PYQ Export", 10, y);
  y += 10;

  let grouped = groupBySubject(currentFiltered);

  Object.keys(grouped).forEach((subject) => {
    doc.setFontSize(14);
    doc.text(subject, 10, y);
    y += 8;

    grouped[subject].forEach((q, idx) => {
      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${q.question}`, 10, y);
      y += 5;
      doc.text(`(${q.year}, ${q.marks} marks)`, 12, y);
      y += 8;

      if (y > 270) {
        doc.addPage();
        y = 10;
      }
    });

    y += 5;
  });

  doc.save("pyqs.pdf");
};

function groupBySubject(arr) {
  const map = {};
  arr.forEach((q) => {
    if (!map[q.subject]) map[q.subject] = [];
    map[q.subject].push(q);
  });
  return map;
}

/* ============================================================
   START APP
============================================================ */
loadData();
