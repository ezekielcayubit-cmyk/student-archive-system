import { db, collection, onSnapshot } from "./firebase.js";

// ==========================
// FORMAT DATE
// ==========================

function formatLogDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function actionClass(action) {
    return (action || "").toLowerCase().replace(/\s+/g, "-");
}

function normalizeAction(action) {
    const a = (action || "").trim();
    if (a === "Move to Trash" || a === "Purge Trash") return "Permanent Delete";
    return a || "-";
}

const role = sessionStorage.getItem("role");

if (role !== "teacher") {
    Swal.fire({
        icon: "warning",
        title: "Access Denied",
        text: "Teachers only."
    }).then(() => {
        window.location.href = "archive.html";
    });
}

// ==========================
// STATE
// ==========================

const LOGS_PER_PAGE = 10;

let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
let searchKeyword = "";
let actionFilter = "";

const tbody = document.getElementById("logsBody");
const pagination = document.getElementById("logsPagination");

if (tbody) {
    tbody.innerHTML = `
        <tr>
            <td colspan="4">Loading activity logs...</td>
        </tr>
    `;
}

// ==========================
// LIVE ACTIVITY LOGS (newest first, auto-refresh)
// ==========================

if (tbody) {
    onSnapshot(collection(db, "activityLogs"), (snapshot) => {
        allLogs = [];
        snapshot.forEach((doc) => {
            allLogs.push(doc.data());
        });
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        currentPage = 1;
        applyFilters();
    }, (error) => {
        console.error(error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4">Failed to load activity logs.</td>
            </tr>
        `;
    });
}

// ==========================
// FILTER + PAGINATE
// ==========================

function applyFilters() {
    const kw = searchKeyword.trim().toLowerCase();

    filteredLogs = allLogs.filter((log) => {
        const matchesAction = !actionFilter ||
            (log.action || "").toLowerCase() === actionFilter;

        const matchesKeyword = !kw ||
            (log.teacher || "").toLowerCase().includes(kw) ||
            (log.action || "").toLowerCase().includes(kw) ||
            (log.details || "").toLowerCase().includes(kw) ||
            formatLogDate(log.date).toLowerCase().includes(kw);

        return matchesAction && matchesKeyword;
    });

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    renderLogs();
    renderPagination();
}

function renderLogs() {
    if (!tbody) return;

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">No activity logs found.</td>
            </tr>
        `;
        return;
    }

    const start = (currentPage - 1) * LOGS_PER_PAGE;
    const pageItems = filteredLogs.slice(start, start + LOGS_PER_PAGE);

    tbody.innerHTML = "";

    pageItems.forEach((log) => {
        tbody.innerHTML += `

        <tr>

            <td data-label="Date">${formatLogDate(log.date)}</td>

            <td data-label="Teacher">${(log.teacher || "-").split("@")[0]}</td>

            <td data-label="Action">

                <span class="log-badge ${actionClass(normalizeAction(log.action))}">

                    ${normalizeAction(log.action)}

                </span>

            </td>

            <td data-label="Details">${log.details || "-"}</td>

        </tr>

        `;
    });
}

function renderPagination() {
    if (!pagination) return;

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));

    if (filteredLogs.length <= LOGS_PER_PAGE) {
        pagination.innerHTML = "";
        return;
    }

    pagination.innerHTML = `
        <button type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>
            Previous
        </button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button type="button" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>
            Next
        </button>
    `;

    const container = document.querySelector(".logs-container");

    pagination.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderLogs();
            renderPagination();
            if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    pagination.querySelector('[data-page="next"]')?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderLogs();
            renderPagination();
            if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

// ==========================
// SEARCH
// ==========================

const search = document.getElementById("logSearch");

if (search) {
    search.addEventListener("input", function () {
        searchKeyword = this.value;
        currentPage = 1;
        applyFilters();
    });
}

// ==========================
// FILTER
// ==========================

const filter = document.getElementById("actionFilter");

if (filter) {
    filter.addEventListener("change", function () {
        actionFilter = this.value.toLowerCase();
        currentPage = 1;
        applyFilters();
    });
}
