// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    deleteDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwVkREvGxFNQymRHZXV7nxnvxZDtgXcRE",
  authDomain: "yasci-archive.firebaseapp.com",
  projectId: "yasci-archive",
  storageBucket: "yasci-archive.firebasestorage.app",
  messagingSenderId: "991644913205",
  appId: "1:991644913205:web:69538f49702f832e4eeb7c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
    db,
    auth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    getDoc,
    deleteDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    orderBy
};
