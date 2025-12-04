//---------------------------------------------------------
// CONFIG
//---------------------------------------------------------
const PAGE_SIZE = 10;   // Show 10 hadiths per page
const DATA_PATH = "data";  // Folder containing hadiths_XXX.json
const HADITHS_PER_CHUNK = 1000; // each JSON file contains 1000 hadiths

//---------------------------------------------------------
// Read URL params: ?file=001&page=1&jump=123
//---------------------------------------------------------
function getURLParam(name, defaultValue) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) ? params.get(name) : defaultValue;
}

let currentFile = getURLParam("file", "001");  // default: file 001
let currentPage = parseInt(getURLParam("page", "1"), 10);
let jumpHadith = parseInt(getURLParam("jump", "0"), 10);

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
// Render hadith list for the current page
//---------------------------------------------------------
function renderPage(hadiths) {
    const results = document.getElementById("results");
    results.innerHTML = "";

    let pageHadiths = [];

    if (jumpHadith > 0) {
        // Show only the specific hadith
        const match = hadiths.find(h => h.hadith_id === jumpHadith);
        if (match) pageHadiths = [match];
        else results.innerHTML = "<p>Hadith not found in this file.</p>";
    } else {
        // Normal pagination
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        pageHadiths = hadiths.slice(start, end);
    }

    pageHadiths.forEach((h) => {
    const div = document.createElement("div");
    div.className = "hadith";

    // Highlight if this is the jump hadith
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

    // Only show pagination if not a jump
    if (jumpHadith === 0) renderPaginationControls(hadiths.length);
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
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageNum);
    params.set("file", currentFile);
    window.location.search = params.toString();
}

//---------------------------------------------------------
// Jump to hadith by number
//---------------------------------------------------------
function jumpToHadith() {
    const input = document.getElementById("hadith-number-input");
    let hadithNumber = parseInt(input.value, 10);
    if (isNaN(hadithNumber) || hadithNumber < 1) {
        alert("Please enter a valid hadith number.");
        return;
    }

    let chunkIndex = Math.floor((hadithNumber - 1) / HADITHS_PER_CHUNK) + 1;
    currentFile = chunkIndex.toString().padStart(3, "0");

    // Reload page with jump parameter
    const params = new URLSearchParams();
    params.set("file", currentFile);
    params.set("jump", hadithNumber);
    window.location.search = params.toString();
}

//---------------------------------------------------------
// Add Enter key listener
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("hadith-number-input");
    const goBtn = document.getElementById("jumpBtn");

    if (input) {
        input.addEventListener("keyup", function(event) {
            if (event.key === "Enter") jumpToHadith();
        });
    }

    if (goBtn) goBtn.addEventListener("click", jumpToHadith);
});

//---------------------------------------------------------
// Load everything on page start
//---------------------------------------------------------
async function start() {
    const hadiths = await loadChunk(currentFile);
    renderPage(hadiths);
}

start();