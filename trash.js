import {
    db,
    collection,
    addDoc,
    getDocs,
    getDoc,
    deleteDoc,
    updateDoc,
    setDoc,
    doc,
    query,
    where,
    onSnapshot,
    orderBy
} from "./firebase.js";

const TRASH_COLLECTION = "trash";
const PURGE_DAYS = 30;

// Centralized, deduplicated activity logging.
// `op` differentiates move-to-trash vs purge vs restore so the same
// document does not create a duplicate log within a short window.
async function logActivity({ action, teacher, details, docId, op }) {
    const logKey = docId && op ? `${docId}|${op}` : null;

    if (logKey) {
        const snap = await getDocs(
            query(collection(db, "activityLogs"), where("logKey", "==", logKey))
        );
        const isDuplicate = snap.docs.some((d) => {
            const t = new Date(d.data().date).getTime();
            return Date.now() - t < 5000;
        });
        if (isDuplicate) return;
    }

    await addDoc(collection(db, "activityLogs"), {
        action,
        teacher,
        details,
        ...(logKey ? { logKey } : {}),
        date: new Date().toISOString()
    });
}

function isExpired(deletedAt) {
    if (!deletedAt) return true;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffMs = now - deleted;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= PURGE_DAYS;
}

function daysUntilPurge(deletedAt) {
    if (!deletedAt) return 0;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const purgeDate = new Date(deleted);
    purgeDate.setDate(purgeDate.getDate() + PURGE_DAYS);
    const diffMs = purgeDate - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diffDays));
}

function formatDeletedDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export async function moveToTrash(collectionName, docId, docData, deletedBy) {
    const trashRef = doc(collection(db, TRASH_COLLECTION));

    const trashItem = {
        originalCollection: collectionName,
        originalDocId: docId,
        data: docData,
        deletedBy: deletedBy || "Teacher",
        deletedAt: new Date().toISOString()
    };

    await setDoc(trashRef, trashItem);

    await deleteDoc(doc(db, collectionName, docId));

    const teacher = deletedBy || "Teacher";
    const title = docData?.title || docId;
    const number = docData?.number ? ` (${docData.number})` : "";
    const collectionLabel = collectionName === "abstracts" ? "Abstract Archive" : "Archive";

    await logActivity({
        action: "Permanent Delete",
        teacher,
        docId,
        op: "trash",
        details: `"${title}"${number} was moved to Trash from the ${collectionLabel} by ${teacher}.`
    });

    return trashRef.id;
}

async function restoreFromTrash(trashDocId) {
    const trashRef = doc(db, TRASH_COLLECTION, trashDocId);
    const trashSnap = await getDoc(trashRef);

    if (!trashSnap.exists()) {
        throw new Error("Trash item not found.");
    }

    const trashItem = trashSnap.data();

    if (!trashItem.originalCollection || !trashItem.originalDocId) {
        throw new Error("Invalid trash item.");
    }

    const originalRef = doc(db, trashItem.originalCollection, trashItem.originalDocId);

    await setDoc(originalRef, trashItem.data || {});

    await deleteDoc(trashRef);

    const teacher = trashItem.deletedBy || "Teacher";
    const title = trashItem.data?.title || trashItem.originalDocId;
    const number = trashItem.data?.number ? ` (${trashItem.data.number})` : "";
    const collectionLabel = trashItem.originalCollection === "abstracts" ? "Abstract Archive" : "Archive";

    await logActivity({
        action: "Restore",
        teacher,
        docId: trashItem.originalDocId,
        op: "restore",
        details: `"${title}"${number} was restored to the ${collectionLabel} by ${teacher}.`
    });
}

async function purgeTrashItem(trashDocId) {
    const trashRef = doc(db, TRASH_COLLECTION, trashDocId);
    const trashSnap = await getDoc(trashRef);

    if (!trashSnap.exists()) {
        throw new Error("Trash item not found.");
    }

    const trashItem = trashSnap.data();

    await deleteDoc(trashRef);

    const teacher = trashItem.deletedBy || "Teacher";
    const title = trashItem.data?.title || trashItem.originalDocId;
    const number = trashItem.data?.number ? ` (${trashItem.data.number})` : "";

    await logActivity({
        action: "Permanent Delete",
        teacher,
        docId: trashItem.originalDocId,
        op: "purge",
        details: `"${title}"${number} was permanently deleted from Trash by ${teacher}.`
    });
}

async function loadTrashItems() {
    const snapshot = await getDocs(collection(db, TRASH_COLLECTION));
    const items = [];

    snapshot.forEach((trashDoc) => {
        const data = trashDoc.data();
        items.push({
            id: trashDoc.id,
            ...data
        });
    });

    items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    return items;
}

async function autoPurgeExpired() {
    const snapshot = await getDocs(collection(db, TRASH_COLLECTION));
    const now = new Date();
    let purgedCount = 0;

    for (const trashDoc of snapshot.docs) {
        const data = trashDoc.data();
        const deletedAt = data.deletedAt ? new Date(data.deletedAt) : null;

        if (!deletedAt) {
            await deleteDoc(trashDoc.ref);
            purgedCount++;
            continue;
        }

        const diffMs = now - deletedAt;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays >= PURGE_DAYS) {
            await deleteDoc(trashDoc.ref);
            purgedCount++;
        }
    }

    return purgedCount;
}

function getItemTypeLabel(originalCollection) {
    if (originalCollection === "abstracts") return "Abstract";
    if (originalCollection === "research") return "Research";
    return originalCollection;
}

function renderTrashCard(item) {
    const data = item.data || {};
    const title = data.title || "Untitled";
    const typeLabel = getItemTypeLabel(item.originalCollection);
    const deletedDate = formatDeletedDate(item.deletedAt);
    const daysLeft = daysUntilPurge(item.deletedAt);
    const expired = isExpired(item.deletedAt);

    let statusBadge = "";
    if (expired) {
        statusBadge = `<span class="trash-badge expired">Expired</span>`;
    } else {
        statusBadge = `<span class="trash-badge active">${daysLeft} day${daysLeft !== 1 ? "s" : ""} left</span>`;
    }

    return `
    <div class="research-card">
        <div class="card-top">
            <div class="pdf-icon">🗑</div>
            <div>
                <h3>${title}</h3>
                <span class="research-badge">${typeLabel}</span>
                ${statusBadge}
            </div>
        </div>

        <hr>

        <p><strong>Deleted By:</strong> ${item.deletedBy || "-"}</p>
        <p><strong>Deleted At:</strong> ${deletedDate}</p>
        ${data.number ? `<p><strong>Research No:</strong> ${data.number}</p>` : ""}
        ${data.researcher ? `<p><strong>Researcher:</strong> ${data.researcher}</p>` : ""}
        ${data.adviser ? `<p><strong>Adviser:</strong> ${data.adviser}</p>` : ""}
        ${data.schoolYear ? `<p><strong>School Year:</strong> ${data.schoolYear}</p>` : ""}

        <div class="research-actions">
            <button onclick="restoreTrashItem('${item.id}')">
                <i class="fa-solid fa-rotate-left"></i> Restore
            </button>
            <button onclick="purgeTrashItem('${item.id}')">
                <i class="fa-solid fa-trash"></i> Delete Forever
            </button>
        </div>
    </div>
    `;
}

async function loadTrash() {
    const trashBody = document.getElementById("trashBody");
    if (!trashBody) return;

    trashBody.innerHTML = `
        <div class="loading-state">
            <h2>Loading trash...</h2>
        </div>
    `;

    try {
        const items = await loadTrashItems();

        trashBody.innerHTML = "";

        if (items.length === 0) {
            trashBody.innerHTML = `
                <div class="empty-state">
                    <h3>Trash is empty.</h3>
                </div>
            `;
            return;
        }

        items.forEach((item) => {
            trashBody.insertAdjacentHTML("beforeend", renderTrashCard(item));
        });
    } catch (error) {
        console.error("Failed to load trash:", error);
        trashBody.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load trash.</h3>
            </div>
        `;
    }
}

window.restoreTrashItem = async function (trashDocId) {
    const result = await Swal.fire({
        title: "Restore Item?",
        text: "This will move the item back to the archive.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Restore",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
        await restoreFromTrash(trashDocId);
        await Swal.fire({
            icon: "success",
            title: "Restored!",
            text: "Item restored successfully.",
            timer: 1800,
            showConfirmButton: false
        });
        loadTrash();
    } catch (error) {
        console.error("Restore failed:", error);
        Swal.fire({
            icon: "error",
            title: "Restore Failed",
            text: error.message || "Unable to restore item."
        });
    }
};

window.purgeTrashItem = async function (trashDocId) {
    const result = await Swal.fire({
        title: "Delete Forever?",
        text: "This action cannot be undone. The item will be permanently deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Delete Forever",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
        await purgeTrashItem(trashDocId);
        await Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Item permanently deleted.",
            timer: 1800,
            showConfirmButton: false
        });
        loadTrash();
    } catch (error) {
        console.error("Purge failed:", error);
        Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: error.message || "Unable to delete item."
        });
    }
};

window.emptyExpiredTrash = async function () {
    const result = await Swal.fire({
        title: "Empty Expired Trash?",
        text: "This will permanently delete all items that have been in trash for 30 days or more.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Empty Expired",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
        const count = await autoPurgeExpired();
        await Swal.fire({
            icon: "success",
            title: "Trash Emptied",
            text: count === 0
                ? "No expired items found."
                : `${count} expired item${count !== 1 ? "s" : ""} permanently deleted.`,
            timer: 1800,
            showConfirmButton: false
        });
        loadTrash();
    } catch (error) {
        console.error("Auto purge failed:", error);
        Swal.fire({
            icon: "error",
            title: "Operation Failed",
            text: error.message || "Unable to empty expired trash."
        });
    }
};

function updateClock() {
    const now = new Date();
    const date = document.getElementById("date");
    const clock = document.getElementById("clock");
    if (date) date.textContent = now.toLocaleDateString();
    if (clock) clock.textContent = now.toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

loadTrash();
