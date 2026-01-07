import { db, storage } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Types ---

export interface Chapter {
  name: string;
}

export interface ClassLevel {
  name: string;
  chapters: string[]; // Chapter names
}

export interface Subject {
  name: string;
  classes: ClassLevel[];
}

export interface ExamStructure {
  subjects: Subject[];
}

export interface Exam {
  id: string; // slug, e.g., 'jee-mains'
  name: string; // Display name, e.g., 'JEE Mains'
  structure: ExamStructure;
}

export interface Resource {
  id?: string;
  examId: string;
  subject: string;
  class: string;
  chapter: string;
  type: 'note' | 'pyq';
  year?: string;
  title: string;
  fileUrl: string;
  createdAt?: Date;
}

// --- Exam Structure Helpers ---

export const saveExamStructure = async (examId: string, structure: ExamStructure) => {
  const examRef = doc(db, "exams", examId);
  // We merge to avoid overwriting other fields like 'name' if they exist, 
  // but for structure updates, we usually want to replace the structure.
  await setDoc(examRef, { structure }, { merge: true });
};

export const getExamStructure = async (examId: string): Promise<ExamStructure | null> => {
  const examRef = doc(db, "exams", examId);
  const snap = await getDoc(examRef);
  if (snap.exists()) {
    return snap.data().structure as ExamStructure;
  }
  return null;
};

export const getExam = async (examId: string): Promise<Exam | null> => {
  const examRef = doc(db, "exams", examId);
  const snap = await getDoc(examRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Exam;
  }
  return null;
};

export const getAllExams = async (): Promise<Exam[]> => {
  const examsRef = collection(db, "exams");
  const snap = await getDocs(examsRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Exam));
};

// --- Resource Helpers ---

export const addResource = async (resource: Omit<Resource, 'id'>) => {
  const resourcesRef = collection(db, "resources");
  await addDoc(resourcesRef, {
    ...resource,
    createdAt: new Date()
  });
};

export const deleteResource = async (resourceId: string) => {
  const resourceRef = doc(db, "resources", resourceId);
  await deleteDoc(resourceRef);
};

export const getResources = async (
  examId: string, 
  subject: string, 
  classLevel: string, 
  chapter: string,
  type?: 'note' | 'pyq'
): Promise<Resource[]> => {
  const resourcesRef = collection(db, "resources");
  const constraints = [
    where("examId", "==", examId),
    where("subject", "==", subject),
    where("class", "==", classLevel),
    where("chapter", "==", chapter)
  ];
  
  if (type) {
    constraints.push(where("type", "==", type));
  }

  const q = query(resourcesRef, ...constraints);
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};
