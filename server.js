import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './firebase.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Route réelle pour stocker une clé dans Firestore
app.post('/api/cle', async (req, res) => {
  const { userId, apiKey } = req.body;

  if (!userId || !apiKey) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  try {
    await db.collection('cles_api').add({
      userId,
      apiKey,
      date: new Date()
    });

    return res.status(200).json({ message: 'Clé enregistrée avec succès 🔐' });
  } catch (error) {
    console.error('Erreur Firestore:', error);
    return res.status(500).json({ message: 'Erreur lors de l’enregistrement' });
  }
});

// Route test GET
app.get('/', (req, res) => {
  res.send('🚀 Backend AlphaNest sécurisé opérationnel !');
});

app.listen(PORT, () => {
  console.log(`🚀 Backend AlphaNest en ligne sur le port ${PORT}`);
});