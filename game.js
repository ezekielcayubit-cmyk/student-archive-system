import {
    db,
    collection,
    addDoc,
    getDocs,
    getDoc,
    deleteDoc,
    doc
} from "./firebase.js";

const isTeacher = sessionStorage.getItem("role") === "teacher";
const LAST_UPLOAD_KEY = "latestUploadAt";
let lastUploadAtValue = localStorage.getItem(LAST_UPLOAD_KEY);

const uploadMenu = document.getElementById("uploadMenu");

if(uploadMenu && !isTeacher){

    uploadMenu.style.display="none";

}

const contactMenu=document.getElementById("contactMenu");

if(contactMenu && !isTeacher){

    contactMenu.style.display="none";

}

let visibleCards = 10;

const cardsPerPage = 10;

let allResearch = [];
let currentPage = 1;
let activeStrand = "";
let allResearchForCurrentStrand = [];
let filteredResearchForCurrentStrand = [];
let activeKeyword = "";
let activeCategory = "";

// ==========================
// LOGIN
// ==========================


    async function login() {

    window.location.href = "dashboard.html";

    return false;

}

window.login = login;
// ==========================
// LOGOUT
// ==========================

window.logout = async function () {

    const result = await Swal.fire({
        title: "Logout?",
        text: "Are you sure you want to logout?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "🚪 Logout",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) {
        return false;
    }

    window.location.href = "index.html";

    return false;

};

// ==========================
// UPLOAD RESEARCH
// ==========================

function loadSchoolYears() {

    const schoolYearSelects = [
        document.getElementById("schoolYear"),
        document.getElementById("abstractSchoolYear")
    ];

    const currentYear = new Date().getFullYear();

    schoolYearSelects.forEach((schoolYear) => {
        if (!schoolYear) return;

        schoolYear.innerHTML = "";

        for (let year = currentYear - 2; year <= currentYear + 20; year++) {
            const option = document.createElement("option");
            option.value = `${year}-${year + 1}`;
            option.textContent = `${year}-${year + 1}`;

            if (year === currentYear) {
                option.selected = true;
            }

            schoolYear.appendChild(option);
        }
    });

}

loadSchoolYears();


const uploadForm = document.getElementById("uploadForm");
const abstractUploadForm = document.getElementById("abstractUploadForm");

// ==========================
// AUTO GENERATE RESEARCH NUMBER
// ==========================

async function generateResearchNumber(inputId = "researchNo") {

    const input = document.getElementById(inputId);

    if (!input) return;

    const researchSnapshot = await getDocs(collection(db, "research"));
    const abstractSnapshot = await getDocs(collection(db, "abstracts"));

    let highest = 0;

    [researchSnapshot, abstractSnapshot].forEach((snapshot) => {
        snapshot.forEach((docItem) => {
            const number = docItem.data().number || "";
            const match = number.match(/R-\d{4}-(\d+)/);

            if (match) {
                const current = parseInt(match[1]);

                if (current > highest) {
                    highest = current;
                }
            }
        });
    });

    const year = new Date().getFullYear();

    input.value = `R-${year}-${String(highest + 1).padStart(3, "0")}`;

}
if (uploadForm) {
    
generateResearchNumber("researchNo");

    uploadForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        // notify UI that upload started
        try {
            window.dispatchEvent(new Event('upload:start'));

        } catch (err) {
            console.warn('Could not dispatch upload:start', err);
        }

        try {
// Check if Research Number already exists
const existing = await getDocs(collection(db, "research"));

let duplicate = false;

existing.forEach((research) => {

    const data = research.data();

    if (
        data.number.trim().toLowerCase() ===
        document.getElementById("researchNo").value.trim().toLowerCase()
    ) {
        duplicate = true;
    }

    if (
        data.title.trim().toLowerCase() ===
        document.getElementById("title").value.trim().toLowerCase()
    ) {
        duplicate = true;
    }

});

if (duplicate) {
    await Swal.fire({
    icon: "warning",
    title: "Duplicate Research",
    text: "This research number or title already exists.",
    confirmButtonColor: "#f39c12"
});

return;
}


const file = document.getElementById("researchFile").files[0];

if (!file) {
    Swal.fire({
        icon: "warning",
        title: "No File",
        text: "Please select a PDF, DOC or DOCX file."
    });
    return;
}

const formData = new FormData();

formData.append("file", file);
formData.append("upload_preset", "student_archive");

const response = await fetch(
    "https://api.cloudinary.com/v1_1/itoh6vi9/auto/upload",
    {
        method: "POST",
        body: formData
    }
);

const uploadData = await response.json();

if (!uploadData.secure_url) {
    console.error(uploadData);

    Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Cloudinary did not return a file URL."
    });

    return;
}

const fileURL = uploadData.secure_url; 

await addDoc(collection(db, "research"), {

    number: document.getElementById("researchNo").value,

    title: document.getElementById("title").value,

    researcher: document.getElementById("researcher").value,

    adviser: document.getElementById("adviser").value,

    schoolYear: document.getElementById("schoolYear").value,

    strand: document.getElementById("strand").value,

    category: document.getElementById("category").value,

    remarks: document.getElementById("remarks").value,

    fileType: document.getElementById("fileType").value,

    fileURL: fileURL,

    status: "Approved"

});

await addDoc(collection(db, "activityLogs"), {

    action: "Upload",

    teacher: sessionStorage.getItem("teacherEmail") || "Teacher",

    details: document.getElementById("title").value,

    date: new Date().toISOString()

});

            localStorage.setItem(LAST_UPLOAD_KEY, new Date().toISOString());

            await Swal.fire({
                icon: "success",
                title: "Upload Successful",
                text: "Research uploaded successfully.",
                confirmButtonColor: "#3085d6"
            });

            uploadForm.reset();

            window.location.href = "archive.html";
        } catch (error) {
            console.error(error);

            try {
                window.dispatchEvent(new Event('upload:error'));
            } catch (err) {
                console.warn('Could not dispatch upload:error', err);
            }

            Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: "Unable to upload the research.",
                confirmButtonColor: "#d33"
            });
        }

    });

}

if (abstractUploadForm) {

    generateResearchNumber("abstractResearchNo");

    abstractUploadForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        // notify UI that abstract upload started
        try {
            window.dispatchEvent(new Event('upload:start'));
        } catch (err) {
            console.warn('Could not dispatch upload:start', err);
        }

        try {

            const abstractFile = document.getElementById("abstractFile").files[0];

            if (!abstractFile) {
                Swal.fire({
                    icon: "warning",
                    title: "No Abstract File",
                    text: "Please select a PDF file for the abstract."
                });
                return;
            }

            const existingAbstracts = await getDocs(collection(db, "abstracts"));
            let duplicateAbstract = false;

            existingAbstracts.forEach((abstractDoc) => {
                const data = abstractDoc.data();

                if (
                    data.number?.trim().toLowerCase() ===
                    document.getElementById("abstractResearchNo").value.trim().toLowerCase()
                ) {
                    duplicateAbstract = true;
                }

                if (
                    data.title?.trim().toLowerCase() ===
                    document.getElementById("abstractTitle").value.trim().toLowerCase()
                ) {
                    duplicateAbstract = true;
                }
            });

            if (duplicateAbstract) {
                await Swal.fire({
                    icon: "warning",
                    title: "Duplicate Abstract",
                    text: "This abstract number or title already exists."
                });
                return;
            }

            const abstractFormData = new FormData();
            abstractFormData.append("file", abstractFile);
            abstractFormData.append("upload_preset", "student_archive");

            const abstractResponse = await fetch(
                "https://api.cloudinary.com/v1_1/itoh6vi9/auto/upload",
                {
                    method: "POST",
                    body: abstractFormData
                }
            );

            const abstractData = await abstractResponse.json();

            if (!abstractData.secure_url) {
                Swal.fire({
                    icon: "error",
                    title: "Upload Failed",
                    text: "Cloudinary did not return an abstract file URL."
                });
                return;
            }

            await addDoc(collection(db, "abstracts"), {
                number: document.getElementById("abstractResearchNo").value,
                title: document.getElementById("abstractTitle").value,
                researcher: document.getElementById("abstractResearcher").value,
                adviser: document.getElementById("abstractAdviser").value,
                schoolYear: document.getElementById("abstractSchoolYear").value,
                strand: document.getElementById("abstractStrand").value,
                category: document.getElementById("abstractCategory").value,
                remarks: document.getElementById("abstractRemarks").value,
                abstractFileURL: abstractData.secure_url,
                status: "Approved"
            });

            await addDoc(collection(db, "activityLogs"), {
                action: "Upload Abstract",
                teacher: sessionStorage.getItem("teacherEmail") || "Teacher",
                details: document.getElementById("abstractTitle").value,
                date: new Date().toISOString()
            });

            localStorage.setItem(LAST_UPLOAD_KEY, new Date().toISOString());

            try {
                window.dispatchEvent(new Event('upload:success'));
            } catch (err) {
                console.warn('Could not dispatch upload:success', err);
            }

            await Swal.fire({
                icon: "success",
                title: "Abstract Uploaded",
                text: "The abstract file was uploaded successfully."
            });

            abstractUploadForm.reset();

        } catch (error) {
            console.error(error);
            try {
                window.dispatchEvent(new Event('upload:error'));
            } catch (err) {
                console.warn('Could not dispatch upload:error', err);
            }
            Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: "Unable to upload the abstract."
            });
        }

    });

}

// ==========================
// SEARCH TABLE
// ==========================

const search = document.getElementById("search");

if (search) {

    search.addEventListener("keyup", function () {

        const filter = this.value.toLowerCase();

        const rows = document.querySelectorAll("#archiveTable tbody tr");

        rows.forEach(function (row) {

            row.style.display = row.textContent
                .toLowerCase()
                .includes(filter)
                ? ""
                : "none";

        });

    });

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

setInterval(updateClock, 1000);
updateClock();
const roleBadge=document.getElementById("roleBadge");

if(roleBadge){

    roleBadge.innerHTML=isTeacher

    ? ' | <span class="teacher-badge">🟢 Teacher Mode</span>'

    : ' | <span class="student-badge">🔵 Student Access</span>';

}
const uploadButton=document.getElementById("uploadButton");

if(uploadButton && !isTeacher){

    uploadButton.style.display="none";

}

const exportButton = document.getElementById("exportExcel");

if(exportButton && !isTeacher){

    exportButton.style.display="none";

}

// ==========================
// LOADING SCREEN
// ==========================

window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    if (loader) {

        setTimeout(function () {

            loader.style.display = "none";

        }, 2000);

    }

});

 // ==========================
// DISPLAY RESEARCH FROM FIRESTORE
// ==========================

const researchList = document.getElementById("researchList");

if (

    researchList &&

    !window.location.pathname.includes("abstract.html")

) {

    async function loadArchive() {

        researchList.innerHTML = "";

        await new Promise(resolve => setTimeout(resolve, 300));
        try {

        const snapshot = await getDocs(collection(db, "research"));

        if (snapshot.empty) {

            researchList.innerHTML = `
                <div class="empty-state">
                    <h3>No research uploaded yet.</h3>
                </div>
            `;

            return;
        }

        snapshot.forEach((researchDoc) => {

            const data = researchDoc.data();

            const card = document.createElement("div");
            card.className = "research-card";

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

  <button onclick="previewFile('${data.fileURL}','${data.title}')">
    <i class="fa-solid fa-eye"></i>
    View
</button>

   <button onclick="downloadFile('${data.fileURL}','${data.title}.pdf')">
        <i class="fa-solid fa-download"></i>
        Download
    </button>

    ${isTeacher ? `

    <button onclick="location.href='edit.html?id=${researchDoc.id}'">
        <i class="fa-solid fa-pen"></i>
        Edit
    </button>

    <button onclick="deleteResearch('${researchDoc.id}')">
        <i class="fa-solid fa-trash"></i>
        Delete
    </button>

    ` : ""}

</div>
`;

            researchList.appendChild(card);

        });

    } catch (error) {

    console.error("LOAD ERROR:", error);

    Swal.fire({
        icon: "error",
        title: "Load Error",
        text: error.message
    });

}

}



 // ==========================
// Delete research 
// ==========================

async function deleteResearch(id) {

    const result = await Swal.fire({
        title: "Delete Research?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "🗑 Delete",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {

      const researchDoc = await getDoc(doc(db, "research", id));

const researchTitle = researchDoc.exists()
    ? researchDoc.data().title
    : "Unknown Research";

await deleteDoc(doc(db, "research", id));

await addDoc(collection(db, "activityLogs"), {

    action: "Delete",

    teacher: sessionStorage.getItem("teacherEmail") || "Teacher",

    details: researchTitle,

    date: new Date().toISOString()

});

        await Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Research deleted successfully.",
            timer: 1800,
            showConfirmButton: false
        });

        location.reload();

    } catch (error) {

        console.error(error);

        Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: "Unable to delete the research."
        });

    }

}

window.deleteResearch = deleteResearch;

// ==========================
// DOWNLOAD FILE
// ==========================

async function downloadFile(url, fileName = "Research.pdf") {

    if (!url) {

        Swal.fire({
            icon: "error",
            title: "No File",
            text: "No file found."
        });

        return;

    }

    // Save activity log (don't stop download if logging fails)
    try {

        await addDoc(collection(db, "activityLogs"), {

            teacher: sessionStorage.getItem("teacherEmail") || "Guest",

            action: "Download",

            details: fileName,

            date: new Date().toISOString()

        });

    } catch (error) {

        console.error("Download log failed:", error);

    }

    fetch(url)
        .then(response => response.blob())
        .then(blob => {

            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = blobUrl;

            a.download = fileName;

            document.body.appendChild(a);

            a.click();

            document.body.removeChild(a);

            window.URL.revokeObjectURL(blobUrl);

        })
        .catch(error => {

            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Download Failed",
                text: "Unable to download the file."
            });

        });

}

window.downloadFile = downloadFile;

async function downloadResearchFile(url, fileName = "Research.pdf") {

    if (!url) {

        Swal.fire({
            icon: "warning",
            title: "No Research File",
            text: "No research file found for download."
        });

        return;
    }

    return downloadFile(url, fileName);
}

window.downloadResearchFile = downloadResearchFile;

async function downloadAbstractFile(url, fileName = "Abstract.pdf") {

    if (!url) {

        Swal.fire({
            icon: "warning",
            title: "No Abstract File",
            text: "No abstract file found for download."
        });

        return;
    }

    return downloadFile(url, fileName);
}

window.downloadAbstractFile = downloadAbstractFile;

// ==========================
// PREVIEW FILE
// ==========================

async function previewFile(url, title) {

    if (!url) {

        Swal.fire({
            icon: "error",
            title: "No File",
            text: "No file found."
        });

        return;

    }

    try {

        await addDoc(collection(db, "activityLogs"), {

            action: "Preview",

            teacher: sessionStorage.getItem("teacherEmail") || "Teacher",

            details: title,

            date: new Date().toISOString()

        });

    } catch (error) {

        console.error("Preview log error:", error);

    }

    window.open(url, "_blank");

}

window.previewFile = previewFile;

// ===============================
// DASHBOARD STATISTICS
// ===============================

async function loadDashboardStatistics() {
    console.log("Dashboard function started");

    const snapshot = await getDocs(collection(db, "research"));

    let strandCounts = {
        ICT: 0,
        STEM: 0,
        ABM: 0,
        HUMSS: 0,
        HE: 0,
        GAS: 0,
    };

    const advisers = new Set();
    const researchers = new Set();
    let latestYear = "";

    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

        if (data.strand && strandCounts[data.strand] !== undefined) {
            strandCounts[data.strand]++;
        }

        if (data.adviser) {
            advisers.add(data.adviser.trim());
        }

        if (data.researcher) {
            data.researcher
                .split(/,|\n/)
                .forEach(name => {
                    if (name.trim()) {
                        researchers.add(name.trim());
                    }
                });
        }

        if (data.schoolYear) {
            if (latestYear === "" || data.schoolYear > latestYear) {
                latestYear = data.schoolYear;
            }
        }

    });

    // Dashboard Cards
   const totalResearchFolder = document.getElementById("totalResearchFolder");
if (totalResearchFolder) {
    totalResearchFolder.textContent = snapshot.size;
}

const totalResearchersFolder = document.getElementById("totalResearchersFolder");
if (totalResearchersFolder) {
    totalResearchersFolder.textContent = researchers.size;
}

const totalAdvisersFolder = document.getElementById("totalAdvisersFolder");
if (totalAdvisersFolder) {
    totalAdvisersFolder.textContent = advisers.size;
}

const latestYearFolder = document.getElementById("latestYearFolder");
if (latestYearFolder) {
    latestYearFolder.textContent = latestYear || "-";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

setText("totalResearchFolder", snapshot.size);
setText("totalResearchersFolder", researchers.size);
setText("totalAdvisersFolder", advisers.size);
setText("latestYearFolder", latestYear || "-");

    // Analytics
   if (document.getElementById("dashboardICT")) {

    document.getElementById("dashboardICT").textContent = strandCounts.ICT;
    document.getElementById("dashboardSTEM").textContent = strandCounts.STEM;
    document.getElementById("dashboardABM").textContent = strandCounts.ABM;
    document.getElementById("dashboardHUMSS").textContent = strandCounts.HUMSS;
    document.getElementById("dashboardHE").textContent = strandCounts.HE;
    document.getElementById("dashboardGAS").textContent = strandCounts.GAS;

}

    // Summary
const summaryResearch = document.getElementById("summaryResearch");

if (summaryResearch) {

    summaryResearch.textContent = snapshot.size;

}
   const summaryResearchers = document.getElementById("summaryResearchers");
const summaryAdvisers = document.getElementById("summaryAdvisers");
const summaryYear = document.getElementById("summaryYear");

if (summaryResearchers) {
    summaryResearchers.textContent = researchers.size;
}

if (summaryAdvisers) {
    summaryAdvisers.textContent = advisers.size;
}

if (summaryYear) {
    summaryYear.textContent = latestYear || "-";
}

}

loadDashboardStatistics();
window.addEventListener('focus', () => {
    const last = localStorage.getItem(LAST_UPLOAD_KEY);
    if (last && last !== lastUploadAtValue) {
        lastUploadAtValue = last;
        loadDashboardStatistics();
    }
});


// ==========================
// PAGINATION
// ==========================

// ==========================
// FOLDER COUNTS
// ==========================

async function loadFolderCounts() {
    if (!document.getElementById("ictCount")) return;

    const counts = {
        ICT: 0,
        STEM: 0,
        ABM: 0,
        HUMSS: 0,
        HE: 0,
        GAS: 0
    };

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach((researchDoc) => {
        const data = researchDoc.data();
        const strand = (data.strand || "").trim().toUpperCase();

        if (counts[strand] !== undefined) {
            counts[strand]++;
        }
    });

    document.getElementById("ictCount").textContent =
        `${counts.ICT} Research Papers`;
    document.getElementById("stemCount").textContent =
        `${counts.STEM} Research Papers`;
    document.getElementById("abmCount").textContent =
        `${counts.ABM} Research Papers`;
    document.getElementById("humssCount").textContent =
        `${counts.HUMSS} Research Papers`;
    document.getElementById("heCount").textContent =
        `${counts.HE} Research Papers`;
    document.getElementById("gasCount").textContent =
        `${counts.GAS} Research Papers`;
}

loadFolderCounts();

// ==========================
// LOAD RESEARCH PER STRAND
// ==========================

async function loadFolderResearch() {
    const folderBody = document.getElementById("folderBody");
    if (!folderBody) return;

    const params = new URLSearchParams(window.location.search);
    const strand = (params.get("strand") || "").trim();
    const normalizedStrand = strand.toUpperCase();

    if (!strand) {
        folderBody.innerHTML = `
            <div class="empty-state">
                <h3>Select a folder to view research papers.</h3>
            </div>
        `;
        return;
    }

    const counts = {
        total: 0,
        advisers: new Set(),
        researchers: new Set(),
        latestYear: ""
    };

    document.getElementById("folderTitle").textContent =
        `${strand} Research Folder`;
    document.getElementById("folderSubtitle").textContent =
        `Showing all approved research papers under ${strand}`;
    folderBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach((researchDoc) => {
        const data = researchDoc.data();

        if ((data.strand || "").trim().toUpperCase() !== normalizedStrand) return;

        counts.total++;
        if (data.adviser) counts.advisers.add(data.adviser.trim());
        if (data.researcher) {
            data.researcher.split(",").forEach(name => {
                if (name.trim()) counts.researchers.add(name.trim());
            });
        }
        if (data.schoolYear && data.schoolYear > counts.latestYear) {
            counts.latestYear = data.schoolYear;
        }

        folderBody.innerHTML += `
            <div class="research-card">
                <div class="card-top">
                    <div class="pdf-preview">
                        <img src="images/pdf.png" alt="PDF">
                    </div>
                    <div>
                        <h3>${data.title || "Untitled"}</h3>
                        <span class="research-badge">${data.strand || ""}</span>
                    </div>
                </div>
                <hr>
                <p><strong>Research No:</strong> ${data.number || "-"}</p>
                <p><strong>Researchers:</strong> ${data.researcher || "-"}</p>
                <p><strong>Adviser:</strong> ${data.adviser || "-"}</p>
                <p><strong>School Year:</strong> ${data.schoolYear || "-"}</p>
                <div class="research-actions">
                    <button onclick="previewFile('${data.fileURL}','${data.title || "Research"}')">View</button>
                    <button onclick="downloadFile('${data.fileURL}', '${(data.title || "Research").replace(/'/g, "\\'")}.pdf')">⬇ Download</button>
                    ${isTeacher ? `<button onclick="editResearch('${researchDoc.id}')">✏ Edit</button><button onclick="deleteResearch('${researchDoc.id}')">🗑 Delete</button>` : ""}
                </div>
            </div>
        `;
    });

    document.getElementById("folderResearchCount").textContent = counts.total;
    document.getElementById("folderAdviserCount").textContent = counts.advisers.size;
    document.getElementById("folderResearcherCount").textContent = counts.researchers.size;
    document.getElementById("folderLatestYear").textContent = counts.latestYear || "-";
}

loadFolderResearch();

loadFolderResearch();

function buildResearchCardHTML(data, id) {
    const safeTitle = String(data.title || "Untitled Research").replace(/'/g, "\\'");
    const safeFileUrl = String(data.fileURL || "").replace(/'/g, "\\'");
    const safeResearcher = String(data.researcher || "N/A").replace(/'/g, "\\'");
    const safeAdviser = String(data.adviser || "N/A").replace(/'/g, "\\'");

    return `
<div class="research-card">

    <div class="card-top">

      <div class="pdf-icon">
    <img src="images/pdf.png" alt="PDF">
</div>
        <div class="card-title">

            <h3>${safeTitle}</h3>

            <span class="research-badge">${data.strand || ""}</span>

        </div>

    </div>

    <div class="card-content">

        <p>

    <strong>Research No.</strong><br>

    <span class="number-badge">

        ${data.number || "-"}

    </span>

</p>

        <p><strong>Researchers</strong><br>${safeResearcher}</p>

        <p><strong>Adviser</strong><br>${safeAdviser}</p>

        <p><strong>School Year</strong><br>${data.schoolYear || "-"}</p>

        <p>
    <strong>Category</strong><br>
    <span class="category-badge">
        ${data.category || "Research Paper"}
    </span>
</p>

    </div>

    <div class="research-actions">

    <button onclick="previewFile('${safeFileUrl}','${safeTitle}')">

View

</button>

    <button onclick="downloadResearchFile('${safeFileUrl}','${safeTitle}.pdf')">
        ⬇ Download
    </button>

    ${isTeacher ? `
    <button onclick="editResearch('${id}')">
        ✏ Edit
    </button>

    <button onclick="deleteResearch('${id}')">
        🗑 Delete
    </button>
    ` : ""}

</div>

</div>`;
}

function renderPaginationControls(totalItems) {
    const pagination = document.getElementById("paginationControls");

    if (!pagination) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / cardsPerPage));

    if (totalItems <= cardsPerPage) {
        pagination.innerHTML = "";
        return;
    }

    pagination.innerHTML = `
        <button type="button" ${currentPage === 1 ? "disabled" : ""} data-page="prev">Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button type="button" ${currentPage === totalPages ? "disabled" : ""} data-page="next">Next</button>
    `;

    pagination.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderResearchCards(filteredResearchForCurrentStrand);
        }
    });

    pagination.querySelector('[data-page="next"]')?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderResearchCards(filteredResearchForCurrentStrand);
        }
    });
}

function renderResearchCards(items) {
    const list = document.getElementById("researchList");

    if (!list) return;

    list.innerHTML = "";

    if (!items.length) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No research found.</h3>
            </div>
        `;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * cardsPerPage;
    const pageItems = items.slice(startIndex, startIndex + cardsPerPage);

    pageItems.forEach((item) => {
        list.insertAdjacentHTML("beforeend", buildResearchCardHTML(item.data, item.id));
    });

    renderPaginationControls(items.length);
}

function applyResearchFilters() {
    const keyword = activeKeyword.trim().toLowerCase();
    const category = activeCategory.trim().toLowerCase();

    filteredResearchForCurrentStrand = allResearchForCurrentStrand.filter((item) => {
        const data = item.data || {};
        const searchableText = [
            data.title,
            data.number,
            data.researcher,
            data.adviser,
            data.schoolYear,
            data.category,
            data.strand
        ].join(" ").toLowerCase();

        const matchesKeyword = !keyword || searchableText.includes(keyword);
        const matchesCategory = !category || (data.category || "Research Paper").toLowerCase().includes(category);

        return matchesKeyword && matchesCategory;
    });

    currentPage = 1;
    renderResearchCards(filteredResearchForCurrentStrand);
}

// ===============================
// LOAD FOLDER INSIDE ARCHIVE PAGE
// ===============================

window.loadFolder = async function (strand) {
     window.currentResearch = [];
    const title = document.getElementById("researchTitle");
    const list = document.getElementById("researchList");

    if (!title || !list) return;

    const cleanedStrand = (strand || "").trim();
    const normalizedStrand = cleanedStrand.toUpperCase();

    title.textContent = `📁 ${cleanedStrand} Research Archive`;

    if (!cleanedStrand) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>Please select a valid folder.</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = "<p>Loading...</p>";

    const snapshot = await getDocs(collection(db, "research"));

    list.innerHTML = "";

    let found = false;
    let total = 0;
    let advisers = new Set();
    let researchers = new Set();
    let latestYear = "";
    const researchList = [];
    window.currentResearch = [];
    activeStrand = cleanedStrand;
    activeKeyword = (document.getElementById("researchSearch")?.value || "").toLowerCase().trim();
    activeCategory = (document.getElementById("categoryFilter")?.value || "").toLowerCase().trim();
    sessionStorage.setItem("selectedStrand", cleanedStrand);

    console.log("Loading folder", cleanedStrand, "snapshot size", snapshot.size);

    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

        if ((data.strand || "").trim().toUpperCase() !== normalizedStrand) return;

        const researchItem = {
            id: researchDoc.id,
            data
        };

        window.currentResearch.push(researchItem);
        researchList.push(researchItem);
        total++;

        if (data.adviser) {
            advisers.add(data.adviser);
        }

        if (data.researcher) {
            data.researcher.split(",").forEach(name => {
                researchers.add(name.trim());
            });
        }

        if (!latestYear || data.schoolYear > latestYear) {
            latestYear = data.schoolYear;
        }

        found = true;
    });

    allResearchForCurrentStrand = researchList;
    currentPage = 1;
    applyResearchFilters();

    document.getElementById("totalResearchFolder").textContent = total;
    document.getElementById("totalResearchersFolder").textContent = researchers.size;
    document.getElementById("totalAdvisersFolder").textContent = advisers.size;
    document.getElementById("latestYearFolder").textContent = latestYear || "-";

    document.querySelectorAll(".folder-card").forEach(card => {
        card.classList.remove("active-folder");

        const folderName = card.querySelector("h3")?.textContent.trim();

        if (folderName === strand) {
            card.classList.add("active-folder");
        }
    });

};

const researchSearch = document.getElementById("researchSearch");

if(researchSearch){

researchSearch.addEventListener("keyup",function(){

    activeKeyword = this.value;
    applyResearchFilters();

});

}

const categoryFilter = document.getElementById("categoryFilter");

if (categoryFilter) {

    categoryFilter.addEventListener("change", function () {

        activeCategory = this.value;
        applyResearchFilters();

    });

}

window.openPreview = function(url){

    document.getElementById("pdfModal").style.display="block";

    document.getElementById("pdfFrame").src=url;

}

const closePdf=document.getElementById("closePdf");

if(closePdf){

closePdf.onclick=function(){

document.getElementById("pdfModal").style.display="none";

document.getElementById("pdfFrame").src="";

};

}

window.editResearch = function(id){

    window.location.href = `edit.html?id=${id}`;

}

}

const contactForm = document.getElementById("contactForm");

if (contactForm) {

    emailjs.init("QcoEvL9MDwUw-2GCL");

    contactForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        try {

            await emailjs.send(
                "service_ivf5kml",
                "template_wgvgog4",
                {
                    from_name: document.getElementById("name").value,
                    from_email: document.getElementById("email").value,
                    message: document.getElementById("message").value
                }
            );

            Swal.fire({
                icon: "success",
                title: "Message Sent!",
                text: "Your message has been sent successfully."
            });

            contactForm.reset();

        } catch (error) {
            console.log(error);

            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.text || error.message || "Unknown error"
            });
        }
    });
}

const exportExcel = document.getElementById("exportExcel");

if(exportExcel){

exportExcel.addEventListener("click",async()=>{

const snapshot = await getDocs(collection(db,"research")); 
exportExcel.disabled = true;

exportExcel.innerHTML =
'<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';

exportExcel.disabled = false;

exportExcel.innerHTML =
'<i class="fa-solid fa-file-excel"></i> Export Excel';

const rows=[];

snapshot.forEach(doc=>{

const data=doc.data();

rows.push({

"Research No.":data.number,

"Title":data.title,

"Researcher":data.researcher,

"Adviser":data.adviser,

"Strand":data.strand,

"Category":data.category,

"School Year":data.schoolYear,

"Remarks":data.remarks

});

});

const workbook=XLSX.utils.book_new();

const worksheet = XLSX.utils.json_to_sheet(rows);

XLSX.utils.sheet_add_aoa(
worksheet,
[
["Young Achiever School of Caloocan Inc."],
["Student Archive Management System"],
["Research Records"],
[],
],
{
origin:"A1"
}
);

XLSX.utils.book_append_sheet(workbook,worksheet,"Research");

const today = new Date();

const fileName =
`Research_Archive_${today.getFullYear()}-${
String(today.getMonth()+1).padStart(2,"0")
}-${
String(today.getDate()).padStart(2,"0")
}.xlsx`;

XLSX.writeFile(workbook,fileName);

await Swal.fire({

icon:"success",

title:"Export Complete",

text:"Research records exported successfully.",

confirmButtonColor:"#2e7d32"

});

});

}

function updateUserHeader() {
    const emailBox = document.getElementById("userEmail");
    const roleBox = document.getElementById("userRole");

    if (!emailBox || !roleBox) return;

    const role = sessionStorage.getItem("role");
    const teacherEmail = sessionStorage.getItem("teacherEmail") || "Teacher";

    if (role === "teacher") {
        emailBox.textContent = teacherEmail;
        roleBox.innerHTML = `
<span class="online-status"></span>
Teacher's Mode
`;
    } else {
        emailBox.textContent = "Guest";
        roleBox.innerHTML = `
<span class="online-status"></span>
View Only Mode
`;
    }
}

updateUserHeader();
window.addEventListener('session:update', updateUserHeader);
window.addEventListener('storage', (event) => {
    if (event.key === 'role' || event.key === 'teacherEmail') {
        updateUserHeader();
    }
});

async function loadAbstractResearch() {
    if (!document.getElementById("abstractPage")) return;

    const snapshot = await getDocs(collection(db, "abstracts"));
    const folderBody = document.getElementById("folderBody");

    if (!folderBody) return;

    folderBody.innerHTML = "";

    snapshot.forEach((docItem) => {
        const data = docItem.data();

        folderBody.innerHTML += `
            <div class="research-card">
                <div class="card-top">
                    <div class="pdf-preview">
                        <img src="images/pdf.png" alt="PDF">
                    </div>
                    <div>
                        <h3>${data.title || "Untitled"}</h3>
                        <span class="research-badge">${data.strand || ""}</span>
                    </div>
                </div>
                <hr>
                <p><strong>Research No:</strong> ${data.number || "-"}</p>
                <p><strong>Researchers:</strong> ${data.researcher || "-"}</p>
                <p><strong>Adviser:</strong> ${data.adviser || "-"}</p>
                <p><strong>School Year:</strong> ${data.schoolYear || "-"}</p>
                <div class="research-actions">
                    <button onclick="previewFile('${data.abstractFileURL}','${data.title || "Abstract"}')">
                        View Abstract
                    </button>
                    <button onclick="downloadAbstractFile('${data.abstractFileURL}','${(data.title || "Abstract").replace(/'/g, "\\'")}.pdf')">
                        ⬇ Download Abstract
                    </button>
                </div>
            </div>
        `;
    });
}

if (document.getElementById("abstractPage")) {
    loadAbstractResearch();
}

// ==========================
// LOAD ACTIVITY LOGS
// ==========================

async function loadActivityLogs() {

    function formatLogDate(dateString){

    if(!dateString) return "-";

    const date = new Date(dateString);

    return date.toLocaleString("en-PH",{

        year:"numeric",

        month:"short",

        day:"numeric",

        hour:"2-digit",

        minute:"2-digit"

    });

}

    const logsBody = document.getElementById("logsBody");

    if (!logsBody) return;

    logsBody.innerHTML = "";

    try {

        const snapshot = await getDocs(collection(db, "activityLogs"));

        let logs = [];

        snapshot.forEach(doc => {

            logs.push(doc.data());

        });

        logs.sort((a, b) => {

            return new Date(b.date) - new Date(a.date);

        });

        logs.forEach(log => {

            logsBody.innerHTML += `

<tr>

    <td>${formatLogDate(log.date)}</td>

    <td>${log.teacher || "-"}</td>

    <td>

        <span class="log-badge ${log.action?.toLowerCase()}">

            ${log.action}

        </span>

    </td>

    <td>${log.details || "-"}</td>

</tr>

`;

        });

    } catch (error) {

        console.error(error);

    }

}

if(document.getElementById("logsBody")){

    loadActivityLogs();

}



async function loadFolderCounts() {

    const counts = {

        ICT: 0,
        STEM: 0,
        ABM: 0,
        HUMSS: 0,
        HE: 0,
        GAS: 0

    };

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach(doc => {

        const data = doc.data();

        const strand = (data.strand || "").trim().toUpperCase();

        if (counts[strand] !== undefined) {

            counts[strand]++;

        }


    });

    document.getElementById("ictCount").textContent =
        counts.ICT + " Research Papers";

    document.getElementById("stemCount").textContent =
        counts.STEM + " Research Papers";

    document.getElementById("abmCount").textContent =
        counts.ABM + " Research Papers";

    document.getElementById("humssCount").textContent =
        counts.HUMSS + " Research Papers";

    document.getElementById("heCount").textContent =
        counts.HE + " Research Papers";

    document.getElementById("gasCount").textContent =
        counts.GAS + " Research Papers";

}

window.addEventListener("DOMContentLoaded", () => {

    loadFolderCounts();

    const lastFolder = sessionStorage.getItem("selectedStrand");

    if (lastFolder) {

        loadFolder(lastFolder);

    }

});

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

function displayResearchPage() {

    const researchList = document.getElementById("researchList");

    if (!researchList) return;

    researchList.innerHTML = "";

    const pageItems = allResearch.slice(0, visibleCards);

    pageItems.forEach(item => {

        const data = item.data;
        const id = item.id;

        const card = document.createElement("div");

        card.className = "research-card";

        card.innerHTML = `

<div class="research-card">

    <div class="card-top">

        <div class="pdf-icon">
            <img src="images/pdf.png" alt="PDF">
        </div>

        <div class="card-title">
            <h3>${data.title}</h3>
            <span class="research-badge">${data.strand}</span>
        </div>

    </div>

    <div class="card-content">

        <p>
            <strong>Research No.</strong><br>
            <span class="number-badge">${data.number}</span>
        </p>

        <p>
            <strong>Researchers</strong><br>
            ${data.researcher}
        </p>

        <p>
            <strong>Adviser</strong><br>
            ${data.adviser}
        </p>

        <p>
            <strong>School Year</strong><br>
            ${data.schoolYear}
        </p>

        <p>
            <strong>Category</strong><br>
            <span class="category-badge">
                ${data.category || "Research Paper"}
            </span>
        </p>

    </div>

    <div class="research-actions">

        <button onclick="previewFile('${data.fileURL}','${data.title}')">
            View
        </button>

        <button onclick="downloadFile('${data.fileURL}','${data.title}.pdf')">
            ⬇ Download
        </button>

        ${
            isTeacher
            ? `
            <button onclick="editResearch('${id}')">
                ✏ Edit
            </button>

            <button onclick="deleteResearch('${id}')">
                🗑 Delete
            </button>
            `
            : ""
        }

    </div>

</div>
`;

        researchList.appendChild(card);

    });

const oldButton = document.getElementById("loadMoreBtn");

if (oldButton) {
    oldButton.remove();
}

if (visibleCards < allResearch.length) {

    const container = document.createElement("div");
    container.className = "load-more-container";

    container.innerHTML = `
        <button id="loadMoreBtn" class="load-more-btn">
            Load More
        </button>
    `;

    researchList.after(container);

    document
        .getElementById("loadMoreBtn")
        .addEventListener("click", () => {

            visibleCards += cardsPerPage;

            displayResearchPage();

        });

}
}
   