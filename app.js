//---------------------------------------------------------
// CONFIG
//---------------------------------------------------------
const PAGE_SIZE = 100;          // Show 100 hadiths per page
const DATA_PATH = "data";
const HADITHS_PER_CHUNK = 1000; // each JSON file contains 1000 hadiths
const TOTAL_HADITH = 37943;     // total hadith count
const TOTAL_PAGES = Math.ceil(TOTAL_HADITH / PAGE_SIZE);

//---------------------------------------------------------
// Read URL params: ?file=001&page=1&jump=123
//---------------------------------------------------------
function getURLParam(name, defaultValue) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) ? params.get(name) : defaultValue;
}

let urlFileParam = getURLParam("file", null); // keep for compatibility if needed
let currentPage = parseInt(getURLParam("page", "1"), 10) || 1;
let jumpHadith = parseInt(getURLParam("jump", "0"), 10) || 0;

// currentFile will be computed (derived) before loading
let currentFile = urlFileParam ? urlFileParam : "001";

//---------------------------------------------------------
// Helpers
//---------------------------------------------------------
function padFileNumber(n) {
    return n.toString().padStart(3, "0");
}

function fileForGlobalHadith(globalHadithNumber) {
    return padFileNumber(Math.floor((globalHadithNumber - 1) / HADITHS_PER_CHUNK) + 1);
}

function globalHadithRangeForPage(pageNumber) {
    const globalStart = (pageNumber - 1) * PAGE_SIZE + 1;
    const globalEnd = Math.min(globalStart + PAGE_SIZE - 1, TOTAL_HADITH);
    return { globalStart, globalEnd };
}

//---------------------------------------------------------
// Load JSON chunk (hadiths_XXX.json)
//---------------------------------------------------------
async function loadChunk(fileNumber) {
    const url = `${DATA_PATH}/hadiths_${fileNumber}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Chunk not found!");
        const data = await res.json();
        // Safety: ensure array and sort by hadith_id
        if (Array.isArray(data)) {
            data.sort((a, b) => (a.hadith_id || 0) - (b.hadith_id || 0));
            return data;
        } else if (Array.isArray(data.hadiths)) {
            // fallback if JSON wraps array inside { "hadiths": [...] }
            data.hadiths.sort((a, b) => (a.hadith_id || 0) - (b.hadith_id || 0));
            return data.hadiths;
        } else {
            console.warn("Unexpected JSON structure in", url);
            return [];
        }
    } catch (err) {
        console.error("Error loading chunk:", err);
        const results = document.getElementById("results");
        if (results) {
            results.innerHTML = `<p style="color:red;">Error loading hadiths. Check file number: ${fileNumber}</p>`;
        }
        return [];
    }
}

//---------------------------------------------------------
// Render hadith list
//---------------------------------------------------------
function renderPage(hadiths, fileNumberUsed) {
    const results = document.getElementById("results");
    results.innerHTML = "";

    let pageHadiths = [];

    // ---------- JUMP MODE (single hadith) ----------
    if (jumpHadith > 0) {
        const match = hadiths.find(h => Number(h.hadith_id) === jumpHadith);
        if (match) {
            pageHadiths = [match];
        } else {
            results.innerHTML = "<p>Hadith not found in this file.</p>";
            renderJumpNavigation(); // still show navigation
            return;
        }
    } 
    // ---------- PAGE MODE ----------
    else {
        // Determine global start/end for this page (e.g. page 11 => 1001..1100)
        const { globalStart } = globalHadithRangeForPage(currentPage);

        // Determine which file should have globalStart
        const expectedFile = fileForGlobalHadith(globalStart);

        // If fileNumberUsed differs from expectedFile, it means we loaded a different chunk.
        // Attempt to load the correct chunk by reloading the page with proper file param.
        // But to avoid infinite loops, if fileNumberUsed is present and differs, compute local indices anyway.
        // Compute local index within the current chunk:
        const localIndexStart = (globalStart - 1) % HADITHS_PER_CHUNK;
        const localIndexEnd = localIndexStart + PAGE_SIZE;

        pageHadiths = hadiths.slice(localIndexStart, localIndexEnd);

        // If slice returned empty (e.g. wrong chunk loaded), try to handle by showing a helpful message.
        if ((!pageHadiths || pageHadiths.length === 0) && fileNumberUsed && fileNumberUsed !== expectedFile) {
            results.innerHTML = `<p>No data in loaded chunk (${fileNumberUsed}) for page ${currentPage}. Trying to load correct chunk (${expectedFile})...</p>`;
            // Try to redirect to correct file/page combination
            const params = new URLSearchParams(window.location.search);
            params.set("file", expectedFile);
            params.set("page", currentPage);
            window.location.search = params.toString();
            return;
        }
    }

    // ---------- RENDER HADITHS ----------
    pageHadiths.forEach(h => {
        const div = document.createElement("div");
        div.className = "hadith";

        if (jumpHadith > 0 && Number(h.hadith_id) === jumpHadith) {
            div.classList.add("highlight");
        }

        // Some hadith objects might miss certain properties — guard against undefined
        const hid = h.hadith_id !== undefined ? h.hadith_id : "N/A";
        const ar = h.arabic_text !== undefined ? h.arabic_text : "";
        const en = h.english_text !== undefined ? h.english_text : "";
        const narr = h.narrators_en !== undefined ? h.narrators_en : "";

        div.innerHTML = `
            <div class="hadith-id">Hadith #${hid}</div>
            <div class="ar">${ar}</div>
            <div class="en">${en}</div>
            <div class="narr"><strong>Narrators:</strong> ${narr}</div>
        `;
        results.appendChild(div);
    });

    // ---------- PAGINATION / NAV ----------
    if (jumpHadith === 0) {
        renderPaginationControls();
    } else {
        renderJumpNavigation();
    }
}

//---------------------------------------------------------
// Smart Pagination Controls (only show nearby pages)
//---------------------------------------------------------
function renderPaginationControls() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    pagination.innerHTML = "";

    const maxOffset = 5;  // how many pages left & right of current page
    const startPage = Math.max(1, currentPage - maxOffset);
    const endPage = Math.min(TOTAL_PAGES, currentPage + maxOffset);

    let html = "";

    // First + Prev
    if (currentPage > 1) {
        html += `<a href="?page=1" style="margin:0 6px;">First</a>`;
        html += `<a href="?page=${currentPage - 1}" style="margin:0 6px;">Prev</a>`;
    }

    // leading dots
    if (startPage > 1) {
        html += `<span style="margin:0 6px;">...</span>`;
    }

    // pages
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span style="font-weight:bold; margin:0 6px;">[${i}]</span>`;
        } else {
            html += `<a href="?page=${i}" style="margin:0 6px;">${i}</a>`;
        }
    }

    // trailing dots
    if (endPage < TOTAL_PAGES) {
        html += `<span style="margin:0 6px;">...</span>`;
    }

    // Next + Last
    if (currentPage < TOTAL_PAGES) {
        html += `<a href="?page=${currentPage + 1}" style="margin:0 6px;">Next</a>`;
        html += `<a href="?page=${TOTAL_PAGES}" style="margin:0 6px;">Last</a>`;
    }

    // also show simple info
    html += `<span style="margin-left:12px;">Page ${currentPage} of ${TOTAL_PAGES}</span>`;

    pagination.innerHTML = html;
}

//---------------------------------------------------------
// Jump Navigation Buttons: FIRST | PREV | NEXT | LAST (for single hadith)
//---------------------------------------------------------
function renderJumpNavigation() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    let prev = jumpHadith > 1 ? jumpHadith - 1 : 1;
    let next = jumpHadith < TOTAL_HADITH ? jumpHadith + 1 : TOTAL_HADITH;

    pagination.innerHTML = `
        <button onclick="jumpDirect(1)" style="margin:0 6px;">First</button>
        <button onclick="jumpDirect(${prev})" style="margin:0 6px;">Previous</button>
        <span style="padding:0 10px;">Hadith ${jumpHadith} of ${TOTAL_HADITH}</span>
        <button onclick="jumpDirect(${next})" style="margin:0 6px;">Next</button>
        <button onclick="jumpDirect(${TOTAL_HADITH})" style="margin:0 6px;">Last</button>
    `;
}

// Jump directly to hadith #
function jumpDirect(num) {
    const file = fileForGlobalHadith(num);
    const params = new URLSearchParams();
    params.set("file", file);
    params.set("jump", num);
    window.location.search = params.toString();
}

//---------------------------------------------------------
// Jump to Hadith (input)
//---------------------------------------------------------
function jumpToHadith() {
    const input = document.getElementById("hadith-number-input");
    if (!input) return;

    let num = parseInt(input.value, 10);
    if (isNaN(num) || num < 1 || num > TOTAL_HADITH) {
        alert(`Please enter a number between 1 and ${TOTAL_HADITH}.`);
        return;
    }

    jumpDirect(num);
}

//---------------------------------------------------------
// Add Enter key support & hook jump button if exists
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("hadith-number-input");
    const goBtn = document.getElementById("jumpBtn");

    if (input) {
        input.addEventListener("keyup", e => {
            if (e.key === "Enter") jumpToHadith();
        });
    }
    if (goBtn) {
        goBtn.addEventListener("click", jumpToHadith);
    }
});

//---------------------------------------------------------
// Start: determine correct file to load and show page
//---------------------------------------------------------
async function start() {
    // If jumpHadith is present, choose file by jumpHadith.
    // Otherwise choose file based on currentPage.
    if (jumpHadith > 0) {
        currentFile = fileForGlobalHadith(jumpHadith);
    } else {
        // Determine global start hadith for the requested page and choose file accordingly.
        const { globalStart } = globalHadithRangeForPage(currentPage);
        currentFile = fileForGlobalHadith(globalStart);
    }

    // Load the chunk we've decided to use
    const hadiths = await loadChunk(currentFile);

    // Render page using the loaded chunk and the file number used
    renderPage(hadiths, currentFile);
}

start();