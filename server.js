import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './firebase.js';
import binanceRoutes from "./routes/binance.js";
import crypto from "crypto";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/binance", binanceRoutes);

// ✅ Route test
app.get('/', (req, res) => {
  res.send('✅ AlphaNest backend est en ligne !');
});

// Middleware pour vérifier la clé secrète sauf pour la vérification publique
app.use((req, res, next) => {
  if (req.path === '/api/cle/verification') return next(); // Exception ici ✅

  const apiKeyHeader = req.headers['x-api-key'];
  if (!apiKeyHeader || apiKeyHeader !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: 'Clé secrète invalide ❌' });
  }

  next();
});

// ✅ Récupérer les clés par userId
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

// ✅ Supprimer une clé
app.delete('/api/cle/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Paramètre ID manquant' });
  }

  try {
    await db.collection('cles_api').doc(id).delete();
    console.log(`🗑️ Clé avec ID ${id} supprimée`);
    return res.status(200).json({ message: `Clé supprimée avec succès 🗑️`, id });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression :', error);
    return res.status(500).json({ message: 'Erreur Firestore lors de la suppression', error: error.message });
  }
});

// ✅ Vérifier si une clé API est valide (publique, utilisée par le frontend)
app.post("/api/cle/verification", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ message: "Clé non fournie" });

  try {
    const clesSnapshot = await db.collection("cles_api").where("apiKey", "==", apiKey).get();
    if (clesSnapshot.empty) {
      return res.status(403).json({ message: "Clé invalide ❌" });
    }

    return res.json({ message: "Clé valide ✅" });
  } catch (err) {
    console.error("Erreur vérification clé :", err);
    res.status(500).json({ message: "Erreur serveur lors de la vérification" });
  }
});

function chiffrerTexte(texte) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(process.env.CRYPT_KEY, "hex"); // clé de 32 octets (64 caractères hex)
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let chiffré = cipher.update(texte, "utf8", "hex");
  chiffré += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    contenu: chiffré,
  };
}

// ✅ Modifier une clé
app.put('/api/cle/:id', async (req, res) => {
  const { id } = req.params;
  const { newApiKey } = req.body;

  if (!id || !newApiKey) {
    return res.status(400).json({ message: 'ID ou nouvelle clé manquants' });
  }

  try {
    await db.collection('cles_api').doc(id).update({
      apiKey: newApiKey,
      date: new Date()
    });

    console.log(`🔁 Clé avec ID ${id} mise à jour`);
    return res.status(200).json({ message: 'Clé mise à jour avec succès 🔁', id });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour :', error);
    return res.status(500).json({ message: 'Erreur Firestore lors de la mise à jour', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend AlphaNest en ligne sur le port ${PORT}`);
});