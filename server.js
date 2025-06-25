import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './firebase.js';

dotenv.config();
const app = express();
const PORT = 8080; // 🔧 Obligatoire sur Railway

app.use(cors());
app.use(express.json());

app.post('/api/cle', async (req, res) => {
  const { userId, apiKey } = req.body;

  if (!userId || !apiKey) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  try {
    const docRef = await db.collection('cles_api').add({
      userId,
      apiKey,
      date: new Date()
    });

    console.log('✅ Clé enregistrée dans Firestore avec ID :', docRef.id);
    return res.status(200).json({ message: 'Clé enregistrée avec succès 🔐', id: docRef.id });
  } catch (error) {
    console.error('❌ Erreur Firestore:', error);
    return res.status(500).json({ message: 'Erreur Firestore', error: error.message });
  }
});

app.get('/api/cle', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Paramètre userId requis' });
  }

  try {
    const snapshot = await db
      .collection('cles_api')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .get();

    const cles = snapshot.docs.map(doc => doc.data());

    return res.status(200).json({ userId, cles });
  } catch (error) {
    console.error('Erreur Firestore (GET):', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend AlphaNest en ligne sur le port ${PORT}`);
});