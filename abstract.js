import {
    db,
    collection,
    getDocs
} from "./firebase.js";

const researchList = document.getElementById("researchList");
const isTeacher = sessionStorage.getItem("role") === "teacher";

let allAbstracts = [];
let currentStrand = "";
let currentPage = 1;
const cardsPerPage = 10;
let filteredAbstracts = [];

async function loadAbstractFolder(strand) {

    currentStrand = strand;

    researchList.innerHTML = `

    <div class="loading-state">

        <h2>Loading Abstracts...</h2>

    </div>

    `;

    try {

        const snapshot = await getDocs(collection(db, "abstracts"));

        allAbstracts = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            if ((data.strand || "").toUpperCase() === strand.toUpperCase()) {

                allAbstracts.push(Object.assign({ id: doc.id }, data));

            }

        });

        renderAbstractCards(allAbstracts);

        updateStatistics(allAbstracts);

    } catch (error) {

        console.error(error);

        Swal.fire({

            icon: "error",

            title: "Error",

            text: error.message

        });

    }

}

window.loadAbstractFolder = loadAbstractFolder;
function renderPagination(list) {
    const pagination = document.getElementById("paginationControls");

    if (!pagination) return;

    const totalPages = Math.max(1, Math.ceil(list.length / cardsPerPage));

    if (list.length <= cardsPerPage) {
        pagination.innerHTML = "";
        return;
    }

    pagination.innerHTML = `
        <button type="button" ${currentPage === 1 ? "disabled" : ""} data-page="prev"> Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button type="button" ${currentPage === totalPages ? "disabled" : ""} data-page="next">Next </button>
    `;

    pagination.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderAbstractCards(filteredAbstracts);
        }
    });

    pagination.querySelector('[data-page="next"]')?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderAbstractCards(filteredAbstracts);
        }
    });
}

function renderAbstractCards(list) {

    filteredAbstracts = [...list];
    currentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredAbstracts.length / cardsPerPage)) || 1);
    researchList.innerHTML = "";

    if (filteredAbstracts.length === 0) {

        researchList.innerHTML = `

        <div class="empty-state">

            <h2>📄 No Abstract Found</h2>

            <p>No approved abstract is available in this strand.</p>

        </div>

        `;

        renderPagination(filteredAbstracts);

        return;

    }

    const startIndex = (currentPage - 1) * cardsPerPage;
    const pageItems = filteredAbstracts.slice(startIndex, startIndex + cardsPerPage);

    pageItems.forEach(data => {

        const card = document.createElement('div');
        card.className = 'research-card';

        const safeFileUrl = (data.abstractFileURL || "").replace(/'/g, "\\'");
        const safeTitle = (data.title || "").replace(/'/g, "\\'");

        card.innerHTML = `
<div class="research-top">

    <div class="pdf-box">

        <img src="images/pdf.png" alt="PDF">

    </div>

    <div class="research-head">

        <h3>${data.title || "-"}</h3>

        <span class="strand-badge">

            ${data.strand || "-"}

        </span>

    </div>

</div>

<div class="research-grid">

    <div class="info-box">
        <label>Research No.</label>
        <span>${data.number || "-"}</span>
    </div>

    <div class="info-box">
        <label>Researchers</label>
        <span>${data.researcher || "-"}</span>
    </div>

    <div class="info-box">
        <label>Adviser</label>
        <span>${data.adviser || "-"}</span>
    </div>

    <div class="info-box">
        <label>School Year</label>
        <span>${data.schoolYear || "-"}</span>
    </div>

</div>

<div class="research-actions">

    <button onclick="previewFile('${safeFileUrl}','${safeTitle}')">
    <i class="fa-solid fa-eye"></i>
    View
  </button>

     <button onclick="downloadFile('${safeFileUrl}','${safeTitle}.pdf')">
        <i class="fa-solid fa-download"></i>
        Download
    </button>

</div>
`;

        researchList.appendChild(card);

    });

    renderPagination(filteredAbstracts);

}

function updateStatistics(list) {

    let advisers = new Set();

    let researchers = new Set();

    let latestYear = "-";

    list.forEach(data => {

        if (data.adviser) {

            advisers.add(data.adviser);

        }

        if (data.researcher) {

            data.researcher
                .split(",")
                .forEach(name => researchers.add(name.trim()));

        }

        if (data.schoolYear && data.schoolYear > latestYear) {

            latestYear = data.schoolYear;

        }

    });

    document.getElementById("totalResearchFolder").textContent = list.length;

    document.getElementById("totalResearchersFolder").textContent = researchers.size;

    document.getElementById("totalAdvisersFolder").textContent = advisers.size;

    document.getElementById("latestYearFolder").textContent = latestYear;

}

async function loadAbstractCounts() {

    const counts = {

        ICT: 0,
        STEM: 0,
        ABM: 0,
        HUMSS: 0,
        HE: 0,
        GAS: 0

    };

    const snapshot = await getDocs(collection(db, "abstracts"));

    snapshot.forEach(doc => {

        const data = doc.data();

        const strand = (data.strand || "").toUpperCase();

        if (counts[strand] !== undefined) {

            counts[strand]++;

        }

    });

    document.getElementById("ictCount").textContent = counts.ICT + " Abstract Files";

    document.getElementById("stemCount").textContent = counts.STEM + " Abstract Files";

    document.getElementById("abmCount").textContent = counts.ABM + " Abstract Files";

    document.getElementById("humssCount").textContent = counts.HUMSS + " Abstract Files";

    document.getElementById("heCount").textContent = counts.HE + " Abstract Files";

    document.getElementById("gasCount").textContent = counts.GAS + " Abstract Files";

}

loadAbstractCounts();

// ==========================
// SEARCH
// ==========================

document.getElementById("researchSearch")?.addEventListener("keyup", function () {

    const keyword = this.value.toLowerCase();

    const filtered = allAbstracts.filter(data => {

        return (

            (data.title || "").toLowerCase().includes(keyword) ||

            (data.researcher || "").toLowerCase().includes(keyword) ||

            (data.adviser || "").toLowerCase().includes(keyword) ||

            (data.schoolYear || "").toLowerCase().includes(keyword)

        );

    });

    renderAbstractCards(filtered);

    updateStatistics(filtered);

});

// ==========================
// CATEGORY FILTER
// ==========================

document.getElementById("categoryFilter")?.addEventListener("change", function () {

    const category = this.value;

    if (category === "") {

        renderAbstractCards(allAbstracts);

        updateStatistics(allAbstracts);

        return;

    }

    const filtered = allAbstracts.filter(data =>

        (data.category || "") === category

    );

    renderAbstractCards(filtered);

    updateStatistics(filtered);

});

// ==========================
// SORT
// ==========================

document.getElementById("sortResearch")?.addEventListener("change", function () {

    const value = this.value;

    let sorted = [...allAbstracts];

    if (value === "az") {

        sorted.sort((a, b) => a.title.localeCompare(b.title));

    }

    if (value === "za") {

        sorted.sort((a, b) => b.title.localeCompare(a.title));

    }

    if (value === "new") {

        sorted.sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));

    }

    if (value === "old") {

        sorted.sort((a, b) => a.schoolYear.localeCompare(b.schoolYear));

    }

    renderAbstractCards(sorted);

    updateStatistics(sorted);

});

// ==========================
// EXPORT EXCEL
// ==========================

document.getElementById("exportExcel")?.addEventListener("click", () => {

    const rows = allAbstracts.map(data => ({

        Title: data.title,

        Researchers: data.researcher,

        Adviser: data.adviser,

        Strand: data.strand,

        Category: data.category,

        "School Year": data.schoolYear

    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Abstract Archive");

    XLSX.writeFile(workbook, "AbstractArchive.xlsx");

});

function previewFile(url, title = "Abstract") {

    if (!url) {

        Swal.fire({
            icon: "warning",
            title: "No File",
            text: "No abstract file found."
        });

        return;
    }

    window.open(url, "_blank");

}

window.previewFile = previewFile;

async function downloadFile(url, fileName = "Abstract.pdf") {

    if (!url) {

        Swal.fire({
            icon: "warning",
            title: "No File",
            text: "No abstract file found."
        });

        return;

    }

    try {

        const response = await fetch(url);

        const blob = await response.blob();

        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = blobUrl;

        a.download = fileName;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        window.URL.revokeObjectURL(blobUrl);

    } catch (error) {

        console.error(error);

        Swal.fire({

            icon: "error",

            title: "Download Failed",

            text: "Unable to download the abstract."

        });

    }

}

window.downloadFile = downloadFile;

// ==========================
// HEADER USER INFO
// ==========================

const emailBox = document.getElementById("userEmail");
const roleBox = document.getElementById("userRole");

if (emailBox && roleBox) {

    const role = sessionStorage.getItem("role");

    if (role === "teacher") {

        emailBox.textContent =
            sessionStorage.getItem("teacherEmail") || "Teacher";

        roleBox.innerHTML = `
        <span class="online-status"></span>
        Teacher's Mode
        `;

    } else {

        emailBox.textContent = "Student";

        roleBox.innerHTML = `
        <span class="online-status"></span>
        View Only Mode
        `;

    }

}

// ==========================
// DATE & TIME
// ==========================

function updateClock() {

    const now = new Date();

    const date = document.getElementById("date");
    const clock = document.getElementById("clock");

    if (date) {
        date.textContent = now.toLocaleDateString();
    }

    if (clock) {
        clock.textContent = now.toLocaleTimeString();
    }

}

updateClock();

setInterval(updateClock, 1000);

// ==========================
// Scroll To Top
// ==========================

const scrollBtn = document.getElementById("scrollTopBtn");

if (scrollBtn) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > 300) {

            scrollBtn.style.display = "block";

        } else {

            scrollBtn.style.display = "none";

        }

    });

    scrollBtn.addEventListener("click", () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

}