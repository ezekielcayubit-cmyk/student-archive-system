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

// Firebase Authentication only accepts an email format internally, so a
// teacher's plain username is converted to <username>@yasci.local behind
// the scenes. Teacher accounts in the Firebase Console must be created
// using this same "<username>@yasci.local" pattern as their email.
const USERNAME_DOMAIN = "@yasci.local";

if (loginBtn) {

    loginBtn.addEventListener("click", async () => {

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !password) {

            Swal.fire({
                icon: "warning",
                title: "Missing Information",
                text: "Please enter your username and password."
            });

            return;
        }

        const email = username.includes("@") ? username : username + USERNAME_DOMAIN;

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

    // Role is owned ONLY by an explicit action:
    //   - teacher login  -> sessionStorage "teacher"
    //   - "Continue as Student" -> sessionStorage "student"
    // Never infer role from Firebase auth. A teacher's login is persisted by
    // Firebase in the browser, so inferring "authenticated == teacher" would
    // wrongly promote a student visitor (or anyone just browsing) to teacher
    // and reveal Activity Logs / Trash Bin.
    window.dispatchEvent(new Event('session:update'));

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

