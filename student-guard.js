const isTeacher = sessionStorage.getItem("role") === "teacher";

function hideStudentOnlyLinks() {
    if (isTeacher) return;
    document
        .querySelectorAll('a[href="activity-logs.html"], a[href="trash.html"]')
        .forEach((el) => (el.style.display = "none"));
}

function protectTeacherOnlyPages() {
    if (isTeacher) return;
    const page = location.pathname.split("/").pop();
    if (page === "trash.html" || page === "activity-logs.html") {
        window.location.href = "archive.html";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideStudentOnlyLinks);
} else {
    hideStudentOnlyLinks();
}

protectTeacherOnlyPages();

export { isTeacher };
