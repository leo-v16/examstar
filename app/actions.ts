"use server";

import { adminDb } from "@/lib/firebase-admin";
import { ExamStructure, Resource } from "@/lib/firestore"; // Sharing the Type definition

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

export async function getExamAction(examId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!examId) throw new Error("Exam ID is required");
    const docRef = adminDb.collection("exams").doc(examId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return { success: false, error: "Exam not found" };
    }
    return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error fetching exam:", errorMessage);
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

// --- Rename Actions ---

export async function renameSubjectAction(examId: string, oldName: string, newName: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const examRef = adminDb.collection("exams").doc(examId);
    const resourcesRef = adminDb.collection("resources");

    // 1. Transaction to update structure
    await adminDb.runTransaction(async (t) => {
        const doc = await t.get(examRef);
        if (!doc.exists) throw new Error("Exam not found");
        
        const data = doc.data();
        const structure = data?.structure as ExamStructure;
        
        const subjectIndex = structure.subjects.findIndex(s => s.name === oldName);
        if (subjectIndex === -1) {
             throw new Error("ITEM_NOT_FOUND");
        }
        
        structure.subjects[subjectIndex].name = newName;
        t.update(examRef, { structure });
    });
    
    // 2. Batch Update Resources
    const snapshot = await resourcesRef
        .where("examId", "==", examId)
        .where("subject", "==", oldName)
        .get();
        
    if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { subject: newName });
        });
        await batch.commit();
    }
    
    return { success: true };
  } catch (error: any) {
      if (error.message === "ITEM_NOT_FOUND") {
          return { success: false, code: "ITEM_NOT_FOUND" };
      }
      console.error("Error renaming subject:", error);
      return { success: false, error: error.message };
  }
}

export async function renameClassAction(examId: string, subjectName: string, oldName: string, newName: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const examRef = adminDb.collection("exams").doc(examId);
    const resourcesRef = adminDb.collection("resources");

    // 1. Transaction to update structure
    await adminDb.runTransaction(async (t) => {
        const doc = await t.get(examRef);
        if (!doc.exists) throw new Error("Exam not found");
        
        const data = doc.data();
        const structure = data?.structure as ExamStructure;
        
        const subject = structure.subjects.find(s => s.name === subjectName);
        if (!subject) throw new Error("SUBJECT_NOT_FOUND");

        const classIndex = subject.classes.findIndex(c => c.name === oldName);
        if (classIndex === -1) throw new Error("ITEM_NOT_FOUND");
        
        subject.classes[classIndex].name = newName;
        t.update(examRef, { structure });
    });
    
    // 2. Batch Update Resources
    const snapshot = await resourcesRef
        .where("examId", "==", examId)
        .where("subject", "==", subjectName)
        .where("class", "==", oldName)
        .get();
        
    if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { class: newName });
        });
        await batch.commit();
    }
    
    return { success: true };
  } catch (error: any) {
      if (error.message === "ITEM_NOT_FOUND" || error.message === "SUBJECT_NOT_FOUND") {
          return { success: false, code: "ITEM_NOT_FOUND" };
      }
      console.error("Error renaming class:", error);
      return { success: false, error: error.message };
  }
}

export async function renameChapterAction(examId: string, subjectName: string, className: string, oldName: string, newName: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const examRef = adminDb.collection("exams").doc(examId);
    const resourcesRef = adminDb.collection("resources");

    // 1. Transaction to update structure
    await adminDb.runTransaction(async (t) => {
        const doc = await t.get(examRef);
        if (!doc.exists) throw new Error("Exam not found");
        
        const data = doc.data();
        const structure = data?.structure as ExamStructure;
        
        const subject = structure.subjects.find(s => s.name === subjectName);
        if (!subject) throw new Error("SUBJECT_NOT_FOUND");

        const classItem = subject.classes.find(c => c.name === className);
        if (!classItem) throw new Error("CLASS_NOT_FOUND");

        const chapterIndex = classItem.chapters.indexOf(oldName);
        if (chapterIndex === -1) throw new Error("ITEM_NOT_FOUND");
        
        classItem.chapters[chapterIndex] = newName;
        t.update(examRef, { structure });
    });
    
    // 2. Batch Update Resources
    const snapshot = await resourcesRef
        .where("examId", "==", examId)
        .where("subject", "==", subjectName)
        .where("class", "==", className)
        .where("chapter", "==", oldName)
        .get();
        
    if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { chapter: newName });
        });
        await batch.commit();
    }
    
    return { success: true };
  } catch (error: any) {
      if (["ITEM_NOT_FOUND", "SUBJECT_NOT_FOUND", "CLASS_NOT_FOUND"].includes(error.message)) {
          return { success: false, code: "ITEM_NOT_FOUND" };
      }
      console.error("Error renaming chapter:", error);
      return { success: false, error: error.message };
  }
}


// --- Suggestions / Feedback Actions ---

export interface Suggestion {
  id: string;
  content: string;
  createdAt: string; // ISO string for easier serialization
}

export async function submitSuggestionAction(content: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!content.trim()) throw new Error("Suggestion content cannot be empty");
    if (content.length > 500) throw new Error("Suggestion content cannot exceed 500 characters");
    
    await adminDb.collection("suggestions").add({
      content,
      createdAt: new Date().toISOString(), // Use ISO string for simplicity
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error submitting suggestion:", error);
    return { success: false, error: "Failed to submit suggestion" };
  }
}

export async function getSuggestionsAction(): Promise<{ success: boolean; data?: Suggestion[]; error?: string }> {
  try {
    const snapshot = await adminDb.collection("suggestions").orderBy("createdAt", "desc").get();
    
    const suggestions = snapshot.docs.map(doc => ({
      id: doc.id,
      content: doc.data().content,
      createdAt: doc.data().createdAt,
    })) as Suggestion[];

    return { success: true, data: suggestions };
  } catch (error: unknown) {
    console.error("Error fetching suggestions:", error);
    return { success: false, error: "Failed to fetch suggestions" };
  }
}

export async function deleteSuggestionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) throw new Error("ID is required");
    await adminDb.collection("suggestions").doc(id).delete();
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting suggestion:", error);
    return { success: false, error: "Failed to delete suggestion" };
  }
}

// --- Maintenance / Orphaned Resources Actions ---

export async function getOrphanedResourcesAction(examId: string): Promise<{ success: boolean; data?: Resource[]; error?: string }> {
    try {
        if (!examId) throw new Error("Exam ID is required");

        // 1. Get Structure
        const structureRes = await getExamStructureAction(examId);
        if (!structureRes.success || !structureRes.data) return { success: false, error: "Exam not found" };
        const structure = structureRes.data;

        // 2. Get All Resources
        const snap = await adminDb.collection("resources").where("examId", "==", examId).get();
        const resources = snap.docs.map(d => {
             const data = d.data();
             return {
                 id: d.id,
                 ...data,
                 // Convert timestamps to Date objects for client consistency if needed, 
                 // but Resource type has Date for createdAt.
                 // Firestore Admin returns Timestamp.
                 createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
             } as Resource;
        });

        // 3. Find Orphans
        const orphans = resources.filter(r => {
            const sub = structure.subjects.find(s => s.name === r.subject);
            if (!sub) return true;
            const cls = sub.classes.find(c => c.name === r.class);
            if (!cls) return true;
            const chap = cls.chapters.includes(r.chapter);
            if (!chap) return true;
            return false;
        });

        return { success: true, data: orphans };
    } catch (error: any) {
        console.error("Error fetching orphans:", error);
        return { success: false, error: error.message };
    }
}

export async function moveResourceAction(resourceId: string, targetSubject: string, targetClass: string, targetChapter: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!resourceId) throw new Error("Resource ID is required");
        await adminDb.collection("resources").doc(resourceId).update({
            subject: targetSubject,
            class: targetClass,
            chapter: targetChapter
        });
        return { success: true };
    } catch (e: any) {
        console.error("Error moving resource:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteResourceAction(resourceId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!resourceId) throw new Error("Resource ID is required");
        await adminDb.collection("resources").doc(resourceId).delete();
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting resource:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteAllOrphanedResourcesAction(resourceIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        if (!resourceIds || resourceIds.length === 0) return { success: true };
        
        const batch = adminDb.batch();
        resourceIds.forEach(id => {
            const ref = adminDb.collection("resources").doc(id);
            batch.delete(ref);
        });
        
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting orphaned resources:", e);
        return { success: false, error: e.message };
    }
}
