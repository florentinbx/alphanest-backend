import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Ne pas afficher la clé en production
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error("❌ Variable FIREBASE_SERVICE_ACCOUNT_KEY manquante.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount)
});

export const db = getFirestore(app);
