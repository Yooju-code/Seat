/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDqlVYC0HDBZjDfQw9Ilg6GHGBFxClZ0iU",
  authDomain: "eastern-landing-nmvz5.firebaseapp.com",
  projectId: "eastern-landing-nmvz5",
  storageBucket: "eastern-landing-nmvz5.firebasestorage.app",
  messagingSenderId: "767773519696",
  appId: "1:767773519696:web:91436fc881c394b52f8655"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID
export const db = getFirestore(app, "ai-studio-091cb9d3-b81d-45f5-92a3-e2856715a606");

// Save classroom config and state to Firestore
export async function saveClassroomToFirebase(data: {
  studentCount: number;
  studentList: string[];
  blockedSeats: boolean[];
  fixedSeats: (string | null)[]; // size 20, element is student name or null
  assignedSeats: (string | null)[]; // size 20, element is student name or "X" or null
}) {
  try {
    const docRef = doc(db, "classroom_configs", "default_classroom");
    await setDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    throw error;
  }
}

// Load classroom config and state from Firestore
export async function loadClassroomFromFirebase() {
  try {
    const docRef = doc(db, "classroom_configs", "default_classroom");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    throw error;
  }
}
