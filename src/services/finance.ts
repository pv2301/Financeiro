import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, ClassInfo, Snack, Invoice } from '../types';

const COLLECTIONS = {
  STUDENTS: 'fin_students',
  CLASSES: 'fin_classes',
  SNACKS: 'fin_snacks',
  INVOICES: 'fin_invoices',
  CONFIG: 'fin_config',
};

async function getAllFromCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
    return [];
  }
}

async function saveItem<T extends { id: string }>(collectionName: string, item: T): Promise<void> {
  try {
    const docRef = doc(db, collectionName, item.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(item)));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

async function deleteItem(collectionName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionName);
  }
}

async function saveAllToCollection<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // Simplistic full sync approach for small lists (similar to original app)
    const existingDocs = await getDocs(collection(db, collectionName));
    existingDocs.forEach((d) => {
      batch.delete(d.ref);
    });

    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, JSON.parse(JSON.stringify(item)));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

export const finance = {
  getClasses: () => getAllFromCollection<ClassInfo>(COLLECTIONS.CLASSES),
  saveClass: (classInfo: ClassInfo) => saveItem(COLLECTIONS.CLASSES, classInfo),
  deleteClass: (id: string) => deleteItem(COLLECTIONS.CLASSES, id),
  saveAllClasses: (classes: ClassInfo[]) => saveAllToCollection(COLLECTIONS.CLASSES, classes),

  getStudents: () => getAllFromCollection<Student>(COLLECTIONS.STUDENTS),
  saveStudent: (student: Student) => saveItem(COLLECTIONS.STUDENTS, student),
  deleteStudent: (id: string) => deleteItem(COLLECTIONS.STUDENTS, id),

  getSnacks: () => getAllFromCollection<Snack>(COLLECTIONS.SNACKS),
  saveSnack: (snack: Snack) => saveItem(COLLECTIONS.SNACKS, snack),
  deleteSnack: (id: string) => deleteItem(COLLECTIONS.SNACKS, id),
  saveAllSnacks: (snacks: Snack[]) => saveAllToCollection(COLLECTIONS.SNACKS, snacks),

  getInvoices: () => getAllFromCollection<Invoice>(COLLECTIONS.INVOICES),
  saveInvoice: (invoice: Invoice) => saveItem(COLLECTIONS.INVOICES, invoice),
  deleteInvoice: (id: string) => deleteItem(COLLECTIONS.INVOICES, id),
};
