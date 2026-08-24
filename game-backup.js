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

const uploadMenu = document.getElementById("uploadMenu");

if(uploadMenu && !isTeacher){

    uploadMenu.style.display="none";

}

const contactMenu=document.getElementById("contactMenu");

if(contactMenu && !isTeacher){

    contactMenu.style.display="none";

}

let currentPage = 1;
const cardsPerPage = 10;
let filteredResearch = [];

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

    const schoolYear = document.getElementById("schoolYear");

    if (!schoolYear) return;

    const currentYear = new Date().getFullYear();

    // 2 years before hanggang 20 years after
    for (let year = currentYear - 2; year <= currentYear + 20; year++) {

        const option = document.createElement("option");

        option.value = `${year}-${year + 1}`;
        option.textContent = `${year}-${year + 1}`;

        if (year === currentYear) {
            option.selected = true;
        }

        schoolYear.appendChild(option);

    }

}

loadSchoolYears();


const uploadForm = document.getElementById("uploadForm");

// ==========================
// AUTO GENERATE RESEARCH NUMBER
// ==========================

async function generateResearchNumber() {

    const input = document.getElementById("researchNo");

    if (!input) return;

    const snapshot = await getDocs(collection(db, "research"));

    let highest = 0;

    snapshot.forEach((research) => {

        const number = research.data().number || "";

        const match = number.match(/R-\d{4}-(\d+)/);

        if (match) {

            const current = parseInt(match[1]);

            if (current > highest) {
                highest = current;
            }

        }

    });

    const year = new Date().getFullYear();

    input.value = `R-${year}-${String(highest + 1).padStart(3, "0")}`;

}
if (uploadForm) {
    
generateResearchNumber();

    uploadForm.addEventListener("submit", async function (e) {

        e.preventDefault();

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

const abstractFile =
    document.getElementById("abstractFile").files[0];

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

let abstractURL = "";

if (abstractFile) {

    const abstractForm = new FormData();

    abstractForm.append("file", abstractFile);

    abstractForm.append("upload_preset", "student_archive");

    const abstractResponse = await fetch(
        "https://api.cloudinary.com/v1_1/itoh6vi9/auto/upload",
        {
            method: "POST",
            body: abstractForm
        }
    );

    const abstractData = await abstractResponse.json();

    abstractURL = abstractData.secure_url || "";

}

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

await addDoc(collection(db, "abstracts"), {

    number: document.getElementById("researchNo").value,

    title: document.getElementById("title").value,

    researcher: document.getElementById("researcher").value,

    adviser: document.getElementById("adviser").value,

    schoolYear: document.getElementById("schoolYear").value,

    strand: document.getElementById("strand").value,

    category: document.getElementById("category").value,

    remarks: document.getElementById("remarks").value,

    abstractFileURL: abstractURL,

    status: "Approved"

});



await addDoc(collection(db, "activityLogs"), {

    action: "Upload",

    teacher: sessionStorage.getItem("teacherEmail") || "Teacher",

    details: document.getElementById("title").value,

    date: new Date().toISOString()

});

     console.log("Activity log created.");

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

            Swal.fire({
    icon: "error",
    title: "Upload Failed",
    text: "Unable to upload the research.",
    confirmButtonColor: "#d33"
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

loadFolderResearch(strand);

await new Promise(resolve => setTimeout(resolve, 700));
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

    // Recent Uploads
    const recentContainer = document.getElementById("recentUploads");

    if (recentContainer) {

        recentContainer.innerHTML = "";

        const recentResearch = [];

        snapshot.forEach(doc => {
            recentResearch.push(doc.data());
        });

        recentResearch.reverse();

        recentResearch.slice(0,5).forEach(data => {

            recentContainer.innerHTML += `
                <div class="recent-item">
                    <strong>📄 ${data.title}</strong><br>
                    👨‍🎓 ${data.researcher}<br>
                    📂 ${data.strand}<br>
                    📅 ${data.schoolYear}
                </div>
            `;

        });

    }

}

loadDashboardStatistics();


// ==========================
// PAGINATION
// ==========================

let currentPage = 1;
const cardsPerPage = 10;
let allResearch = [];

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

    allResearch = [];

snapshot.forEach((researchDoc)=>{

    const data = researchDoc.data();

    if ((data.strand || "").toUpperCase() !== strand.toUpperCase()) return;

    allResearch.push({
        id: researchDoc.id,
        data: data
    });

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
    let total = 0;

let advisers = new Set();

let researchers = new Set();

let latestYear = "";

    const folderBody = document.getElementById("folderBody");

    if (!folderBody) return;

    const params = new URLSearchParams(window.location.search);
    const strand = params.get("strand");

    document.getElementById("folderTitle").textContent =
        strand + " Research Folder";

    document.getElementById("folderSubtitle").textContent =
        "Showing all approved research papers under " + strand;

    folderBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

        if (data.strand !== strand) return;
        
        total++;

if(data.adviser){

advisers.add(data.adviser);

}

if(data.researcher){

data.researcher.split(",")

.forEach(name=>researchers.add(name.trim()));

}

if (data.schoolYear > latestYear) {
    latestYear = data.schoolYear;
}

document.getElementById("folderResearchCount").textContent = total;
document.getElementById("folderAdviserCount").textContent = advisers.size;
document.getElementById("folderResearcherCount").textContent = researchers.size;
document.getElementById("folderLatestYear").textContent = latestYear || "-";

       folderBody.innerHTML += `

<div class="research-card">

    <div class="card-top">

        <div class="pdf-preview">
    <img src="images/pdf.png" alt="PDF">
</div>

        <div>

            <h3>${data.title}</h3>

            <span class="research-badge">${data.strand}</span>

        </div>

    </div>

    <hr>

    <p><strong>Research No:</strong> ${data.number}</p>

    <p><strong>Researchers:</strong> ${data.researcher}</p>

    <p><strong>Adviser:</strong> ${data.adviser}</p>

    <p><strong>School Year:</strong> ${data.schoolYear}</p>

   <div class="research-actions">

   <button onclick="previewFile('${data.fileURL}','${data.title}')">

View

</button>

   <button onclick="downloadFile('${data.fileURL}', '${(data.title || "Research").replace(/'/g, "\\'")}.pdf')">
        ⬇ Download
    </button>

    <button onclick="editResearch('${researchDoc.id}')">
        ✏ Edit
    </button>

    <button onclick="deleteResearch('${researchDoc.id}')">
        🗑 Delete
    </button>

</div>

`;
    });

}

loadFolderResearch();

// ===============================
// LOAD FOLDER INSIDE ARCHIVE PAGE
// ===============================

window.loadFolder = async function (strand) {
     window.currentResearch = [];
    const title = document.getElementById("researchTitle");
    const list = document.getElementById("researchList");

    if (!title || !list) return;

    title.textContent = `${strand} Research Archive`;

    list.innerHTML = "<p>Loading...</p>";

    const snapshot = await getDocs(collection(db, "research"));

    list.innerHTML = "";

    let found = false;
    
    let total = 0;
    let advisers = new Set();
    let researchers = new Set();
    let latestYear = "";
    let researchList = [];
    currentPage = 1;
    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

window.currentResearch.push(data);

if (data.strand !== strand) return;

researchList.push(data);
        
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

        list.innerHTML += `

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

    <span class="number-badge">

        ${data.number}

    </span>

</p>

        <p><strong>Researchers</strong><br>${data.researcher}</p>

        <p><strong>Adviser</strong><br>${data.adviser}</p>

        <p><strong>School Year</strong><br>${data.schoolYear}</p>

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

    <button onclick="downloadFile('${data.fileURL}')">
        ⬇ Download
    </button>

    <button onclick="editResearch('${researchDoc.id}')">
        ✏ Edit
    </button>

    <button onclick="deleteResearch('${researchDoc.id}')">
        🗑 Delete
    </button>

</div>

`;
  // Highlight selected folder
document.querySelectorAll(".folder-card").forEach(card => {
    card.classList.remove("active-folder");
});

document.querySelectorAll(".folder-card").forEach(card => {

    card.classList.remove("active-folder");

    const folderName = card.querySelector("h3").textContent.trim();

    console.log("Folder:", folderName);
    console.log("Selected:", strand);

    if (folderName === strand) {
        card.classList.add("active-folder");
    }

});
});
document.getElementById("totalResearchFolder").textContent = total;
document.getElementById("totalResearchersFolder").textContent = researchers.size;
document.getElementById("totalAdvisersFolder").textContent = advisers.size;
document.getElementById("latestYearFolder").textContent = latestYear || "-";

    if (!found) {

        list.innerHTML = `
            <div class="empty-state">
                <h3>No research found.</h3>
            </div>
        `;

    }

};

const researchSearch = document.getElementById("researchSearch");

if(researchSearch){

researchSearch.addEventListener("keyup",function(){

const keyword=this.value.toLowerCase();

document.querySelectorAll(".research-card").forEach(card=>{

card.style.display=
card.innerText.toLowerCase().includes(keyword)
?
"block"
:
"none";

});

});

}

const categoryFilter = document.getElementById("categoryFilter");

if (categoryFilter) {

    categoryFilter.addEventListener("change", function () {

        const category = this.value.toLowerCase();

        document.querySelectorAll(".research-card").forEach(card => {

            if (category === "") {

                card.style.display = "block";

            } else {

                card.style.display =
                    card.innerText.toLowerCase().includes(category)
                    ? "block"
                    : "none";

            }

        });

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

const emailBox = document.getElementById("userEmail");
const roleBox = document.getElementById("userRole");

if(emailBox && roleBox){

    const role = sessionStorage.getItem("role");

    if(role === "teacher"){

        emailBox.textContent =
            sessionStorage.getItem("teacherEmail");

roleBox.innerHTML = `
<span class="online-status"></span>
Teacher's Mode
`;

    }else{

        emailBox.textContent = "Student";

        roleBox.innerHTML = `
<span class="online-status"></span>
View Only Mode
`;

    }

}

async function loadAbstractResearch(){

    let total = 0;

let advisers = new Set();

let researchers = new Set();

let latestYear = "";

    const folderBody = document.getElementById("folderBody");

    if (!folderBody) return;

    const params = new URLSearchParams(window.location.search);
    const strand = params.get("strand");

    document.getElementById("folderTitle").textContent =
        strand + " Research Folder";

    document.getElementById("folderSubtitle").textContent =
        "Showing all approved research papers under " + strand;

    folderBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

        if (data.strand !== strand) return;
        
        total++;

if(data.adviser){

advisers.add(data.adviser);

}

if(data.researcher){

data.researcher.split(",")

.forEach(name=>researchers.add(name.trim()));

}

if (data.schoolYear > latestYear) {
    latestYear = data.schoolYear;
}

document.getElementById("folderResearchCount").textContent = total;
document.getElementById("folderAdviserCount").textContent = advisers.size;
document.getElementById("folderResearcherCount").textContent = researchers.size;
document.getElementById("folderLatestYear").textContent = latestYear || "-";

       folderBody.innerHTML += `

<div class="research-card">

    <div class="card-top">

        <div class="pdf-preview">
    <img src="images/pdf.png" alt="PDF">
</div>

        <div>

            <h3>${data.title}</h3>

            <span class="research-badge">${data.strand}</span>

        </div>

    </div>

    <hr>

    <p><strong>Research No:</strong> ${data.number}</p>

    <p><strong>Researchers:</strong> ${data.researcher}</p>

    <p><strong>Adviser:</strong> ${data.adviser}</p>

    <p><strong>School Year:</strong> ${data.schoolYear}</p>

   <div class="research-actions">

    <button onclick="previewFile('${data.abstractFileURL}','${data.title} (Abstract)')">

View Abstract

</button>

    <button onclick="downloadFile('${data.abstractFileURL}','${data.title}.pdf')">

        ⬇ Download Abstract

    </button>

</div>

`;
    });

}

if(document.getElementById("abstractPage")){

    loadAbstractResearch();

}else{

   

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

        const strand = (data.strand || "").toUpperCase();

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

function displayResearchPage(){

    const researchList = document.getElementById("researchList");

    researchList.innerHTML = "";

    const start = (currentPage - 1) * cardsPerPage;

    const end = start + cardsPerPage;

    const pageItems = allResearch.slice(start, end);

    pageItems.forEach(item=>{

        const data = item.data;

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

    document.getElementById("pageNumber").textContent =
        "Page " + currentPage;

}

document.getElementById("nextPage")?.addEventListener("click",()=>{

    if(currentPage * cardsPerPage < allResearch.length){

        currentPage++;

        displayResearchPage();

    }

});

document.getElementById("prevPage")?.addEventListener("click",()=>{

    if(currentPage>1){

        currentPage--;

        displayResearchPage();

    }

});