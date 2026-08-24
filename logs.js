import { db, collection, getDocs } from "./firebase.js";

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
// LOAD ACTIVITY LOGS
// ==========================

async function loadActivityLogs() {

    const tbody = document.getElementById("logsBody");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4">Loading activity logs...</td>
        </tr>
    `;

    try {

        const snapshot = await getDocs(collection(db, "activityLogs"));

        let logs = [];

        snapshot.forEach((doc) => {

            logs.push(doc.data());

        });

        logs.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = "";

        if (logs.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">No activity logs found.</td>
                </tr>
            `;

            return;

        }

        logs.forEach((log) => {

            tbody.innerHTML += `

            <tr>

                <td>${formatLogDate(log.date)}</td>

                <td>${log.teacher || "-"}</td>

                <td>

                    <span class="log-badge ${(log.action || "").toLowerCase()}">

                        ${log.action || "-"}

                    </span>

                </td>

                <td>${log.details || "-"}</td>

            </tr>

            `;

        });

    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="4">Failed to load activity logs.</td>
            </tr>
        `;

    }

}

// ==========================
// SEARCH
// ==========================

const search = document.getElementById("logSearch");

if (search) {

    search.addEventListener("input", function () {

        const keyword = this.value.toLowerCase();

        document.querySelectorAll("#logsBody tr").forEach((row) => {

            row.style.display =
                row.textContent.toLowerCase().includes(keyword)
                    ? ""
                    : "none";

        });

    });

}

// ==========================
// FILTER
// ==========================

const filter = document.getElementById("actionFilter");

if (filter) {

    filter.addEventListener("change", function () {

        const action = this.value.toLowerCase();

        document.querySelectorAll("#logsBody tr").forEach((row) => {

            if (!action) {

                row.style.display = "";

                return;

            }

            const badge = row.querySelector(".log-badge");

            row.style.display =
                badge &&
                badge.textContent.toLowerCase() === action
                    ? ""
                    : "none";

        });

    });

}

// ==========================
// START
// ==========================

loadActivityLogs();