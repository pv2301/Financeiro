import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
console.log('Using project:', firebaseConfig.projectId);
const db = getFirestore(app);

const CLASSES = [
  // Ensino Fundamental I - PREPAID_DAYS (Calculated by days * snack price)
  { id: '1_ANO_A', name: '1º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '1_ANO_B', name: '1º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '1_ANO_E', name: '1º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '2_ANO_B', name: '2º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '2_ANO_E', name: '2º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '3_ANO_B', name: '3º ANO B', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '3_ANO_E', name: '3º ANO E', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '4_ANO_A', name: '4º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: '5_ANO_A', name: '5º ANO A', segment: 'Ensino Fundamental I', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 20 },

  // Educação Infantil - PREPAID_FIXED
  { id: 'MATERNAL', name: 'MATERNAL', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 220, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: 'GRUPO_1', name: 'GRUPO 1', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: 'GRUPO_2', name: 'GRUPO 2', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: 'GRUPO_3', name: 'GRUPO 3', segment: 'Educação Infantil', billingMode: 'PREPAID_FIXED', basePrice: 290, applyAbsenceDiscount: true, collegeSharePercent: 20 },

  // Berçário - PREPAID_FIXED
  { id: 'BABY', name: 'BABY', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 340, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: 'NINHO', name: 'NINHO', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 380, applyAbsenceDiscount: true, collegeSharePercent: 20 },
  { id: 'EXTRA', name: 'EXTRA', segment: 'Berçário', billingMode: 'PREPAID_FIXED', basePrice: 420, applyAbsenceDiscount: true, collegeSharePercent: 20 },
];

async function seed() {
  console.log('Restoring classes...');
  for (const cls of CLASSES) {
    await setDoc(doc(db, 'fin_classes', cls.id), cls);
    console.log(`Class ${cls.name} restored.`);
  }
  console.log('Restore completed!');
  process.exit(0);
}

seed();
