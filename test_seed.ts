import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('Seeding test data...');
  try {
    const classId = 'test_class_1';
    await setDoc(doc(db, 'fin_classes', classId), {
      id: classId,
      name: 'Maternal 1 (Teste)',
      billingMode: 'ANTICIPATED_FIXED',
      basePrice: 500,
      applyAbsenceDiscount: true
    });
    console.log('Class added.');

    const studentId = 'test_student_1';
    await setDoc(doc(db, 'fin_students', studentId), {
      id: studentId,
      name: 'Joãozinho da Silva',
      classId: classId,
      responsibleName: 'Maria da Silva',
      responsibleCpf: '111.222.333-44',
      contactPhone: '(11) 99999-9999',
      personalDiscount: 10,
      hasTimelyPaymentDiscount: true
    });
    console.log('Student added.');
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
