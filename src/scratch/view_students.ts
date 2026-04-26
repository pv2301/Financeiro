import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function view() {
  const q = query(collection(db, 'fin_students'), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(doc.id, doc.data().name, 'ClassID:', doc.data().classId);
  });
  process.exit(0);
}

view();
