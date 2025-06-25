import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Exemple de route sécurisée POST pour stocker une clé
app.post('/api/cle', (req, res) => {
  const { userId, apiKey } = req.body;

  if (!userId || !apiKey) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  console.log(`🔐 Stockage de la clé pour ${userId} : ${apiKey}`);

  // Ici tu pourras plus tard stocker la clé dans une base de données

  return res.status(200).json({ message: 'Clé stockée avec succès (fake pour l’instant)' });
});

// Test GET
app.get('/', (req, res) => {
  res.send('🚀 Backend AlphaNest sécurisé opérationnel !');
});

app.listen(PORT, () => {
  console.log(`🚀 Backend AlphaNest en ligne sur le port ${PORT}`);
});