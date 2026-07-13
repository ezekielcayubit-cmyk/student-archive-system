import {
    db,
    collection,
    getDocs
} from "./firebase.js";

const params = new URLSearchParams(window.location.search);
const strand = params.get("strand");

const title = document.getElementById("folderTitle");
const tbody = document.getElementById("folderBody");

title.textContent = `${strand} Research Archive`;

async function loadResearch() {

    tbody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "research"));

    snapshot.forEach((researchDoc) => {

        const data = researchDoc.data();

        if (data.strand !== strand) return;

        const card = document.createElement("div");

card.className = "research-card";

card.innerHTML = `
<div class="card-top">
    <div class="pdf-icon">📄</div>

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

    <button onclick="window.open('${data.fileURL}','_blank')">
        👁 View
    </button>

    <button onclick="downloadFile('${data.fileURL}')">
        ⬇ Download
    </button>

</div>
`;

tbody.appendChild(card);

    });

}

loadResearch();

function downloadFile(url) {

    if (!url) {
        alert("No file found.");
        return;
    }

    if (url.includes("docs.google.com/document")) {

        const id = url.split("/d/")[1].split("/")[0];

        window.open(
            `https://docs.google.com/document/d/${id}/export?format=pdf`,
            "_blank"
        );

        return;
    }

    if (url.includes("drive.google.com/file/d/")) {

        const id = url.split("/d/")[1].split("/")[0];

        window.open(
            `https://drive.google.com/uc?export=download&id=${id}`,
            "_blank"
        );

        return;
    }

    window.open(url, "_blank");

}

window.downloadFile = downloadFile;