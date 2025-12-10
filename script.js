/* ============================================================
   GLOBAL STATE
============================================================ */
let pyqData = [];
let currentFiltered = [];

let selectedYears = new Set();
let selectedSubjects = new Set();
let selectedTopics = new Set();
let selectedSubtopics = new Set();
let selectedExams = new Set();

let marksFilter = "";
let sortFilter = "";

/* Dynamic maps */
let subjectTopicMap = {}; // subject → topics[]
let topicSubtopicMap = {}; // topic → subtopics[]
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

/* Build mapping tables for fast filtering */
function preprocessMappings() {
  yearList = [...new Set(pyqData.map((q) => q.year))].sort();
  subjectList = [...new Set(pyqData.map((q) => q.subject))].sort();

  subjectTopicMap = {};
  topicSubtopicMap = {};

  pyqData.forEach((q) => {
    // Build subject → topics
    if (!subjectTopicMap[q.subject]) subjectTopicMap[q.subject] = new Set();
    subjectTopicMap[q.subject].add(q.topic);

    // Build topic → subtopics
    if (!topicSubtopicMap[q.topic]) topicSubtopicMap[q.topic] = new Set();
    topicSubtopicMap[q.topic].add(q.subtopic);
  });

  // Convert Sets → Arrays
  Object.keys(subjectTopicMap).forEach((sub) => {
    subjectTopicMap[sub] = [...subjectTopicMap[sub]].sort();
  });

  Object.keys(topicSubtopicMap).forEach((topic) => {
    topicSubtopicMap[topic] = [...topicSubtopicMap[topic]].sort();
  });
}

/* ============================================================
   RENDER FILTER CHIPS (YEARS, SUBJECTS, ETC)
============================================================ */
function renderModalChips() {
  /* YEAR */
  const yearBox = document.getElementById("yearChips");
  yearBox.innerHTML = "";
  yearList.forEach((y) => yearBox.appendChild(makeChip(y, "year")));

  /* SUBJECT */
  const subjectBox = document.getElementById("subjectChips");
  subjectBox.innerHTML = "";
  subjectList.forEach((s) => subjectBox.appendChild(makeChip(s, "subject")));

  /* Reset topics & subtopics */
  updateTopicChips();
  updateSubtopicChips();
}

/* Make a chip element */
function makeChip(label, type) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.textContent = label;

  chip.addEventListener("click", () => {
    toggleChip(label, type, chip);
  });

  return chip;
}

/* Chip selection handler */
function toggleChip(label, type, chip) {
  if (type === "year") {
    toggleSet(selectedYears, label);
  }

  if (type === "subject") {
    toggleSet(selectedSubjects, label);
    updateTopicChips();
    updateSubtopicChips(true);
  }

  if (type === "topic") {
    toggleSet(selectedTopics, label);
    updateSubtopicChips();
  }

  if (type === "subtopic") {
    toggleSet(selectedSubtopics, label);
  }

  if (type === "exam") {
    toggleSet(selectedExams, label);
  }

  chip.classList.toggle("selected");
}

/* Toggle membership inside any Set */
function toggleSet(set, v) {
  set.has(v) ? set.delete(v) : set.add(v);
}

/* ============================================================
   UPDATE TOPIC & SUBTOPIC CHIPS
============================================================ */

/* Build topic chips dynamically after selecting subjects */
function updateTopicChips() {
  const topicBox = document.getElementById("topicChips");
  topicBox.innerHTML = "";

  if (selectedSubjects.size === 0) {
    topicBox.classList.add("disabled");
    selectedTopics.clear();
    return;
  }

  topicBox.classList.remove("disabled");

  let topics = new Set();
  selectedSubjects.forEach((sub) => {
    (subjectTopicMap[sub] || []).forEach((t) => topics.add(t));
  });

  [...topics].sort().forEach((t) => {
    const chip = makeChip(t, "topic");
    topicBox.appendChild(chip);
  });
}

/* Build subtopic chips dynamically after selecting topics */
function updateSubtopicChips(clear = false) {
  const subBox = document.getElementById("subtopicChips");
  subBox.innerHTML = "";

  if (clear) selectedSubtopics.clear();

  if (selectedTopics.size === 0) {
    subBox.classList.add("disabled");
    return;
  }

  subBox.classList.remove("disabled");

  let subs = new Set();
  selectedTopics.forEach((topic) => {
    (topicSubtopicMap[topic] || []).forEach((s) => subs.add(s));
  });

  [...subs].sort().forEach((sub) => {
    const chip = makeChip(sub, "subtopic");
    subBox.appendChild(chip);
  });
}

/* ============================================================
   MODAL OPEN/CLOSE
============================================================ */
document.getElementById("openFilterBtn").onclick = () => {
  document.getElementById("filterModal").classList.remove("hidden");
};

document.getElementById("closeFilterBtn").onclick = () => {
  document.getElementById("filterModal").classList.add("hidden");
};

/* ============================================================
   RESET FILTERS
============================================================ */
document.getElementById("resetFilters").onclick = () => {
  selectedYears.clear();
  selectedSubjects.clear();
  selectedTopics.clear();
  selectedSubtopics.clear();
  selectedExams.clear();

  marksFilter = "";
  sortFilter = "";

  document.getElementById("marksFilterModal").value = "";
  document.getElementById("sortFilterModal").value = "";

  renderModalChips();
};

/* ============================================================
   APPLY FILTERS
============================================================ */
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
      (selectedSubtopics.size === 0 || selectedSubtopics.has(q.subtopic)) &&
      (selectedExams.size === 0 || selectedExams.has(q.exam)) &&
      (marksFilter === "" || q.marks == marksFilter)
    );
  });

  /* Sorting Logic */
  if (sortFilter === "yearAsc") filtered.sort((a, b) => a.year - b.year);
  if (sortFilter === "yearDesc") filtered.sort((a, b) => b.year - a.year);

  if (sortFilter === "marksAsc") filtered.sort((a, b) => a.marks - b.marks);
  if (sortFilter === "marksDesc") filtered.sort((a, b) => b.marks - a.marks);

  if (sortFilter === "topicAsc")
    filtered.sort((a, b) => a.topic.localeCompare(b.topic));
  if (sortFilter === "topicDesc")
    filtered.sort((a, b) => b.topic.localeCompare(a.topic));

  if (sortFilter === "subtopicAsc")
    filtered.sort((a, b) => a.subtopic.localeCompare(b.subtopic));
  if (sortFilter === "subtopicDesc")
    filtered.sort((a, b) => b.subtopic.localeCompare(a.subtopic));

  currentFiltered = filtered;
  displayFiltered(filtered);
}

/* ============================================================
   DISPLAY RESULTS + SEARCH HIGHLIGHT
============================================================ */
function displayFiltered(list) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (list.length === 0) {
    results.innerHTML = "<p>No questions found.</p>";
    return;
  }

  const searchQuery = (
    document.getElementById("searchBox")?.value || ""
  ).toLowerCase();

  list.forEach((q) => {
    const card = document.createElement("div");
    card.className = "question-card";

    let questionText = q.question;
    if (searchQuery) {
      questionText = questionText.replace(
        new RegExp(searchQuery, "gi"),
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

/* Live Search */
document
  .getElementById("searchBox")
  .addEventListener("input", filterAndDisplay);

/* ============================================================
   PDF EXPORT — GROUPED BY SUBJECT → TOPIC
============================================================ */
document.getElementById("pdfBtn").onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 12;

  doc.setFontSize(18);
  doc.text("PYQ Export", 10, y);
  y += 10;

  const grouped = groupBySubjectAndTopic(currentFiltered);

  Object.keys(grouped).forEach((subject) => {
    doc.setFontSize(14);
    doc.text(subject, 10, y);
    y += 8;

    Object.keys(grouped[subject]).forEach((topic) => {
      doc.setFontSize(12);
      doc.text(`• ${topic}`, 12, y);
      y += 6;

      grouped[subject][topic].forEach((q) => {
        doc.setFontSize(10);
        doc.text(`- ${q.question} (${q.year}, ${q.marks} marks)`, 14, y);
        y += 6;

        if (y > 270) {
          doc.addPage();
          y = 10;
        }
      });

      y += 3;
    });

    y += 5;
  });

  doc.save("pyqs_export.pdf");
};

/* Group questions → subject → topic */
function groupBySubjectAndTopic(arr) {
  const map = {};

  arr.forEach((q) => {
    if (!map[q.subject]) map[q.subject] = {};
    if (!map[q.subject][q.topic]) map[q.subject][q.topic] = [];

    map[q.subject][q.topic].push(q);
  });

  return map;
}

/* ============================================================
   SKELETON LOADER
============================================================ */
function showSkeleton() {
  document.getElementById("results").innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

function hideSkeleton() {
  document.getElementById("results").innerHTML = "";
}

/* ============================================================
   START
============================================================ */
loadData();
