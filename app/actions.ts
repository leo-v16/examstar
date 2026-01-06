"use server";

import { adminDb } from "@/lib/firebase-admin";
import { ExamStructure } from "@/lib/firestore"; // Sharing the Type definition

export async function getExamStructureAction(examId: string): Promise<{ success: boolean; data?: ExamStructure; error?: string }> {
  try {
    if (!examId) throw new Error("Exam ID is required");

    const docRef = adminDb.collection("exams").doc(examId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: true, data: { subjects: [] } };
    }

    // Firestore Admin SDK returns data directly, but we need to ensure it matches our type
    const structure = docSnap.data()?.structure as ExamStructure;
    
    // Serialization check: Ensure only plain objects are returned (Firestore Timestamps might need conversion if present, but ExamStructure is JSON-pure)
    return { success: true, data: structure || { subjects: [] } };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error fetching exam structure:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function saveExamStructureAction(examId: string, structure: ExamStructure): Promise<{ success: boolean; error?: string }> {
  try {
    if (!examId) throw new Error("Exam ID is required");

    const docRef = adminDb.collection("exams").doc(examId);
    
    // We use set with merge: true to avoid overwriting other potential fields on the exam document
    await docRef.set({ structure }, { merge: true });

    return { success: true };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error saving exam structure:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function getAllExamIdsAction(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const snapshot = await adminDb.collection("exams").get();
    const ids = snapshot.docs.map(doc => doc.id);
    return { success: true, data: ids };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error fetching all exam IDs:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function deleteExamAction(examId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!examId) throw new Error("Exam ID is required");
    await adminDb.collection("exams").doc(examId).delete();
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error deleting exam:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
