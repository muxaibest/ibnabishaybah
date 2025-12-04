//---------------------------------------------------------
// CONFIG
//---------------------------------------------------------
let PAGE_SIZE = 10;   // default hadiths per page
const DATA_PATH = "data";  // Folder containing hadiths_XXX.json
const HADITHS_PER_CHUNK = 1000; // each JSON file contains 1000 hadiths
const MAX_HADITH = 37943; // maximum hadith number

//---------------------------------------------------------
// Read URL params: ?file=001&page=1&jump=123
//---------------------------------------------------------
function getURLParam(name, defaultValue) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) ? params.get(name) : defaultValue;
}

let currentFile = getURLParam("file", "001");  
let currentPage = parseInt(getURLParam("page", "1"), 10);
let jumpHadith = parseInt(getURLParam("jump", "0"), 10);
let currentHadithNumber = jumpHadith > 0 ? jumpHadith : null;

//---------------------------------------------------------
// Load JSON chunk (hadiths_XXX.json)
//---------------------------------------------------------
async function loadChunk(fileNumber) {
    const url = `${DATA_PATH}/hadiths_${fileNumber}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Chunk not found!");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error loading chunk:", err);
        document.getElementById("results").innerHTML =
            `<p style="color:red;">Error loading hadiths. Check file number: ${fileNumber}</p>`;
        return [];
    }
}

//---------------------------------------------------------
// Load multiple chunks for “all” selection
//---------------------------------------------------------
async function loadAllChunks(startHadith = 1, count = MAX_HADITH) {
    const startChunk = Math.floor((startHadith - 1) / HADITHS_PER_CHUNK) + 1;
    const endHadith = Math.min(startHadith + count - 1, MAX_HADITH);
    const endChunk = Math.floor((endHadith - 1) / HADITHS_PER_CHUNK) + 1;

    let allHadiths = [];
    for (let chunk = startChunk; chunk <= endChunk; chunk++) {
        const chunkData = await loadChunk(String(chunk).padStart(3, "0"));
        allHadiths = allHadiths.concat(chunkData);
    }

    // Slice to exact range if startHadith is not first in chunk
    allHadiths = allHadiths.filter(h => h.hadith_id >= startHadith && h.hadith_id <= endHadith);
    return allHadiths;
}

//---------------------------------------------------------
// Render hadith list
//---------------------------------------------------------
async function renderPage(hadiths) {
    const results = document.getElementById("results");
    results.innerHTML = "";

    let pageHadiths = [];

    if (jumpHadith > 0) {
        const match = hadiths.find(h => h.hadith_id === jumpHadith);
        if (match) pageHadiths = [match];
        else results.innerHTML = "<p>Hadith not found in this file.</p>";
    } else {
        if (PAGE_SIZE === HADITHS_PER_CHUNK) {
            // Load all remaining chunks automatically
            hadiths = await loadAllChunks((currentPage - 1) * PAGE_SIZE + 1, PAGE_SIZE);
        }
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        pageHadiths = hadiths.slice(start, end);
    }

    if (!currentHadithNumber) {
        currentHadithNumber = pageHadiths.length > 0 ? pageHadiths[0].hadith_id : 1;
    }

    pageHadiths.forEach(h => {
        const div = document.createElement("div");
        div.className = "hadith";
        if (jumpHadith > 0 && h.hadith_id === jumpHadith) {
            div.classList.add("highlight");
        }
        div.innerHTML = `
            <div class="hadith-id">Hadith #${h.hadith_id}</div>
            <div class="ar">${h.arabic_text}</div>
            <div class="en">${h.english_text}</div>
            <div class="narr"><strong>Narrators:</strong> ${h.narrators_en}</div>
        `;
        results.appendChild(div);
    });

    renderNavigationButtons();
    if (jumpHadith === 0 && PAGE_SIZE !== HADITHS_PER_CHUNK) renderPaginationControls(hadiths.length);
}

//---------------------------------------------------------
// Navigation buttons (Next/Previous)
//---------------------------------------------------------
function renderNavigationButtons() {
    let navDiv = document.getElementById("jump-navigation");
    if (!navDiv) {
        navDiv = document.createElement("div");
        navDiv.id = "jump-navigation";
        navDiv.style.marginTop = "10px";
        navDiv.style.textAlign = "center";
        document.getElementById("results").appendChild(navDiv);
    }

    navDiv.innerHTML = `
        <button ${currentHadithNumber <= 1 ? "disabled" : ""} onclick="showPrevHadith()">Previous</button>
        <button ${currentHadithNumber >= MAX_HADITH ? "disabled" : ""} onclick="showNextHadith()">Next</button>
    `;
}

//---------------------------------------------------------
// Pagination controls
//---------------------------------------------------------
function renderPaginationControls(total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const pagination = document.getElementById("pagination");

    pagination.innerHTML = `
        <button ${currentPage <= 1 ? "disabled" : ""} onclick="goPage(${currentPage - 1})">Previous</button>
        <span>Page ${currentPage} / ${totalPages}</span>
        <button ${currentPage >= totalPages ? "disabled" : ""} onclick="goPage(${currentPage + 1})">Next</button>
    `;
}

function goPage(pageNum) {
    currentPage = pageNum;
    currentHadithNumber = (currentPage - 1) * PAGE_SIZE + 1;
    if (PAGE_SIZE === HADITHS_PER_CHUNK) {
        loadAllChunks(currentHadithNumber, PAGE_SIZE).then(hadiths => renderPage(hadiths));
    } else {
        loadChunk(currentFile).then(hadiths => renderPage(hadiths));
    }
}

//---------------------------------------------------------
// Jump to hadith by number
//---------------------------------------------------------
function jumpToHadith() {
    const input = document.getElementById("hadith-number-input");
    let hadithNumber = parseInt(input.value, 10);

    if (isNaN(hadithNumber) || hadithNumber < 1 || hadithNumber > MAX_HADITH) {
        alert(`Please enter a valid hadith number between 1 and ${MAX_HADITH}.`);
        return;
    }

    currentHadithNumber = hadithNumber;
    jumpHadith = hadithNumber;

    let chunkIndex = Math.floor((hadithNumber - 1) / HADITHS_PER_CHUNK) + 1;
    currentFile = chunkIndex.toString().padStart(3, "0");

    loadChunk(currentFile).then(hadiths => renderPage(hadiths));
}

//---------------------------------------------------------
// Next / Previous hadith
//---------------------------------------------------------
function showNextHadith() {
    if (currentHadithNumber < MAX_HADITH) {
        currentHadithNumber++;
        jumpHadith = currentHadithNumber;
        jumpToHadith();
    }
}

function showPrevHadith() {
    if (currentHadithNumber > 1) {
        currentHadithNumber--;
        jumpHadith = currentHadithNumber;
        jumpToHadith();
    }
}

//---------------------------------------------------------
// Hadiths per page selector
//---------------------------------------------------------
function updatePerPage() {
    const sel = document.getElementById("perPage").value;
    PAGE_SIZE = sel === "all" ? HADITHS_PER_CHUNK : parseInt(sel, 10);

    if (PAGE_SIZE === HADITHS_PER_CHUNK) {
        loadAllChunks(currentHadithNumber, PAGE_SIZE).then(hadiths => renderPage(hadiths));
    } else {
        loadChunk(currentFile).then(hadiths => renderPage(hadiths));
    }
}

//---------------------------------------------------------
// Event listeners
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("hadith-number-input");
    const goBtn = document.getElementById("jumpBtn");
    const perPageSelect = document.getElementById("perPage");

    if (input) input.addEventListener("keyup", e => { if (e.key === "Enter") jumpToHadith(); });
    if (goBtn) goBtn.addEventListener("click", jumpToHadith);
    if (perPageSelect) perPageSelect.addEventListener("change", updatePerPage);
});

//---------------------------------------------------------
// Start
//---------------------------------------------------------
async function start() {
    if (!currentHadithNumber) currentHadithNumber = (currentPage - 1) * PAGE_SIZE + 1;

    if (PAGE_SIZE === HADITHS_PER_CHUNK) {
        const hadiths = await loadAllChunks(currentHadithNumber, PAGE_SIZE);
        renderPage(hadiths);
    } else {
        const hadiths = await loadChunk(currentFile);
        renderPage(hadiths);
    }
}

start();