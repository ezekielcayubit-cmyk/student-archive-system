import {
    db,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection
} from "./firebase.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function loadResearch() {

    if (!id) {
        alert("No abstract selected.");
        return;
    }

    const researchRef = doc(db, "abstracts", id);
    const researchSnap = await getDoc(researchRef);

    if (!researchSnap.exists()) {
        alert("Abstract not found.");
        return;
    }

    const data = researchSnap.data();

    document.getElementById("title").value = data.title || "";
    document.getElementById("number").value = data.number || "";
    document.getElementById("researcher").value = data.researcher || "";
    document.getElementById("adviser").value = data.adviser || "";
    document.getElementById("schoolYear").value = data.schoolYear || "";
    document.getElementById("strand").value = data.strand || "";
    document.getElementById("gradeLevel").value = data.gradeLevel || "";
    document.getElementById("category").value = data.category || "";

}

loadResearch();

document.getElementById("saveEdit").addEventListener("click", async () => {

    try {

        const researchRef = doc(db, "abstracts", id);

        await updateDoc(researchRef, {

            title: document.getElementById("title").value,
            researcher: document.getElementById("researcher").value,
            adviser: document.getElementById("adviser").value,
            schoolYear: document.getElementById("schoolYear").value,
            strand: document.getElementById("strand").value,
            gradeLevel: document.getElementById("gradeLevel").value,
            category: document.getElementById("category").value

        });

        await addDoc(collection(db, "activityLogs"), {

            action: "Edit Abstract",

            teacher: sessionStorage.getItem("teacherEmail") || "Teacher",

            details: document.getElementById("title").value,

            date: new Date().toISOString()

        });

        

        window.location.href = "abstract.html";

    } catch (error) {

        console.error(error);

        alert("Failed to update abstract.");

    }

});