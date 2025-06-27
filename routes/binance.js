import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';

const router = express.Router();

function chiffrerTexte(texte) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(process.env.CRYPT_KEY, "hex");
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let chiffré = cipher.update(texte, "utf8", "hex");
  chiffré += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    contenu: chiffré,
  };
}

// ✅ Route POST pour enregistrer une clé Binance chiffrée
router.post('/ajouter-cle', async (req, res) => {
  const { userId, apiKey, apiSecret } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId || !apiKey || !apiSecret) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    const cleChiffree = {
      apiKey: chiffrerTexte(apiKey),
      apiSecret: chiffrerTexte(apiSecret),
      date: new Date(),
    };

    await db.collection("cles_binance").doc(userId).set(cleChiffree);
    res.json({ message: "✅ Clé Binance enregistrée avec succès !" });
  } catch (err) {
    console.error("Erreur Firestore :", err);
    res.status(500).json({ message: "❌ Erreur lors de l'enregistrement" });
  }
});

export default router;