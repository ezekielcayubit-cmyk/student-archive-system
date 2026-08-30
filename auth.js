import {
    auth,
    db,
    collection,
    addDoc,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "./firebase.js";
// ==========================
// TEACHER LOGIN
// ==========================

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {

            Swal.fire({
                icon: "warning",
                title: "Missing Information",
                text: "Please enter your email and password."
            });

            return;
        }

        try {

   const userCredential = await signInWithEmailAndPassword(auth, email, password);

    sessionStorage.setItem("role", "teacher");
    sessionStorage.setItem("teacherEmail", userCredential.user.email);
    await addDoc(collection(db, "activityLogs"), {
    teacher: userCredential.user.email,
    action: "Login",
    details: "Teacher logged in",
    date: new Date().toLocaleString()
});

    Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Welcome!",
        timer: 1200,
        showConfirmButton: false
    });

    await addDoc(collection(db, "activityLogs"), {

    action: "Login",

    teacher: userCredential.user.email,

    details: "Teacher logged into the system.",

    date: new Date().toISOString()

});


    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 1200);

} catch (error) {

    console.error(error);

    Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.message
    });

}

    });

}

// ==========================
// KEEP LOGIN
// ==========================

onAuthStateChanged(auth, (user) => {

    const currentRole = sessionStorage.getItem("role");

    if (user) {

        // Never promote an explicit student session to teacher, even if a
        // teacher's Firebase auth happens to be persisted in this browser.
        if (currentRole !== "student") {
            sessionStorage.setItem("role", "teacher");
            sessionStorage.setItem("teacherEmail", user.email || "Teacher");
        }
        window.dispatchEvent(new Event('session:update'));

    } else {

        // Don't wipe a student session just because no Firebase user is present.
        if (currentRole !== "student") {
            sessionStorage.removeItem("role");
            sessionStorage.removeItem("teacherEmail");
        }
        window.dispatchEvent(new Event('session:update'));

    }

});

// ==========================
// LOGOUT
// ==========================

window.teacherLogout = async function () {

    const result = await Swal.fire({
        title: "Logout?",
        text: "Are you sure?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Logout"
    });

    if (!result.isConfirmed) return;

    // Save log but don't stop logout if it fails
    try {

    const teacherEmail =
        auth.currentUser?.email ||
        sessionStorage.getItem("teacherEmail") ||
        "Unknown Teacher";

    console.log("Logging out:", teacherEmail);
  

    await addDoc(collection(db, "activityLogs"), {

        action: "Logout",

        teacher: teacherEmail,

        details: "Teacher logged out.",

        date: new Date().toISOString()

    });

    console.log("Logout log saved.");

} catch (error) {

    console.error("Logout log failed:", error);

}

    await signOut(auth);

    sessionStorage.clear();

    window.location.href = "index.html";

};

