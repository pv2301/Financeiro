import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkConfig() {
  const docRef = doc(db, 'fin_config', 'global');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log('Global Config:', JSON.stringify(snap.data(), null, 2));
  } else {
    console.log('No global config found.');
  }
  process.exit(0);
}

checkConfig();
