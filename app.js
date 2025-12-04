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
// Render hadith list for the current page or jump
//---------------------------------------------------------
function renderPage(hadiths) {
    const results = document.getElementById("results");
    results.innerHTML = "";

    let pageHadiths = [];

    if (jumpHadith > 0) {
        const match = hadiths.find(h => h.hadith_id === jumpHadith);
        if (match) pageHadiths = [match];
        else results.innerHTML = "<p>Hadith not found in this file.</p>";
    } else {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        pageHadiths = hadiths.slice(start, end);
    }

    // Update currentHadithNumber if not set
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
    if (jumpHadith === 0) renderPaginationControls(hadiths.length);
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
    const startHadith = (currentPage - 1) * PAGE_SIZE + 1;
    currentHadithNumber = startHadith;
    loadChunk(currentFile).then(hadiths => renderPage(hadiths));
}

//---------------------------------------------------------
// Jump to hadith by number (with validation)
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

    loadChunk(currentFile).then(hadiths => renderPage(hadiths));
}

//---------------------------------------------------------
// Add Enter key listener
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("hadith-number-input");
    const goBtn = document.getElementById("jumpBtn");
    const perPageSelect = document.getElementById("perPage");

    if (input) {
        input.addEventListener("keyup", event => {
            if (event.key === "Enter") jumpToHadith();
        });
    }

    if (goBtn) goBtn.addEventListener("click", jumpToHadith);

    if (perPageSelect) {
        perPageSelect.addEventListener("change", updatePerPage);
    }
});

//---------------------------------------------------------
// Load everything on page start
//---------------------------------------------------------
async function start() {
    // Initialize currentHadithNumber for normal pagination
    if (!currentHadithNumber) {
        currentHadithNumber = (currentPage - 1) * PAGE_SIZE + 1;
    }

    const hadiths = await loadChunk(currentFile);
    renderPage(hadiths);
}

start();