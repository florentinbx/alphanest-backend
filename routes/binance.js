import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';

const router = express.Router();

function chiffrerTexte(texte) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(process.env.CRYPT_KEY, "hex");
  const iv = crypto.randomBytes(16);
  
  console.log("🔑 CRYPT_KEY utilisée :", process.env.CRYPT_KEY);
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

// 🔓 Route pour récupérer la clé Binance déchiffrée
router.get('/recuperer-cle/:userId', async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Aucune clé trouvée pour ce userId ❌" });
    }

    const data = doc.data();

    const dechiffrerTexte = (chiffre) => {
      const algorithm = "aes-256-cbc";
      const key = Buffer.from(process.env.CRYPT_KEY, "hex");
      const iv = Buffer.from(chiffre.iv, "hex");

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypte = decipher.update(chiffre.contenu, "hex", "utf8");
      decrypte += decipher.final("utf8");

      return decrypte;
    };

    const apiKey = dechiffrerTexte(data.apiKey);
    const apiSecret = dechiffrerTexte(data.apiSecret);

    return res.json({ userId, apiKey, apiSecret });
  } catch (err) {
    console.error("❌ Erreur Firestore :", err);
    res.status(500).json({ message: "Erreur lors de la récupération" });
  }
});

export default router;