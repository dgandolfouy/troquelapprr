/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if specified
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const NOTES_COLLECTION = "troquel_notes";

/**
 * Subscribe to real-time updates of custom notes/descriptions/client tags for troqueles across all devices.
 */
export function subscribeCustomNotes(onNotesUpdated: (notes: Record<string, string>) => void) {
  const colRef = collection(db, NOTES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const notesMap: Record<string, string> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && docSnap.id) {
          notesMap[docSnap.id] = data.note || "";
        }
      });
      // Update local storage cache
      try {
        localStorage.setItem("troquel_notes", JSON.stringify(notesMap));
      } catch (e) {
        console.error("Error caching notes to localStorage:", e);
      }
      onNotesUpdated(notesMap);
    },
    (error) => {
      console.error("Error listening to Firestore troquel_notes:", error);
    }
  );
}

/**
 * Save or update a note/description/client name for a specific troquel in Firestore.
 * This makes it immediately available to all users on any computer or device.
 */
export async function saveCustomNote(codigo: string, note: string) {
  if (!codigo) return;
  const docRef = doc(db, NOTES_COLLECTION, String(codigo));
  const trimmed = note.trim();

  if (!trimmed) {
    // Delete note if cleared
    await deleteDoc(docRef);
  } else {
    await setDoc(
      docRef, 
      {
        codigo: String(codigo),
        note: trimmed,
        updatedAt: serverTimestamp(),
      }, 
      { merge: true }
    );
  }
}
