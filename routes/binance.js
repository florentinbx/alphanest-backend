import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';
import axios from 'axios';

const router = express.Router();

// 💡 Fonction utilitaire
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

function dechiffrerTexte(chiffre) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(process.env.CRYPT_KEY, "hex");
  const iv = Buffer.from(chiffre.iv, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(chiffre.contenu, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ✅ ENREGISTRER CLÉS BINANCE
router.post('/enregistrer', async (req, res) => {
  const { userId, apiKey, apiSecret } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId || !apiKey || !apiSecret) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    const chiffreeApiKey = chiffrerTexte(apiKey);
    const chiffreeApiSecret = chiffrerTexte(apiSecret);

    await db.collection("cles_binance").doc(userId).set({
      userId,
      apiKey: chiffreeApiKey,
      apiSecret: chiffreeApiSecret,
      date: new Date()
    });

    res.status(200).json({ message: "✅ Clés Binance enregistrées avec succès" });
  } catch (err) {
    console.error("❌ Erreur enregistrement Firestore :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ✅ ACHAT RÉEL
router.post('/acheter', async (req, res) => {
  const { userId, montant } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId || !montant) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ message: "Aucune clé trouvée ❌" });

    const data = doc.data();
    const apiKey = dechiffrerTexte(data.apiKey);
    const apiSecret = dechiffrerTexte(data.apiSecret);

    const timestamp = Date.now();
    const queryString = `symbol=BTCUSDT&side=BUY&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const response = await axios({
      method: 'POST',
      url: 'https://api.binance.com/api/v3/order',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `symbol=BTCUSDT&side=BUY&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}&signature=${signature}`
    });

    const trade = response.data;

    await db.collection("achats_reels").add({
      userId,
      montant,
      prixBTC: trade.fills?.[0]?.price || "Inconnu",
      quantite: trade.executedQty,
      date: new Date(),
      idTransaction: trade.orderId,
    });

    return res.json({ message: "✅ Achat exécuté avec succès", data: trade });

  } catch (err) {
    console.error("❌ Erreur achat Binance :", err.response?.data || err.message);
    return res.status(500).json({ message: "❌ Erreur lors de l'achat", error: err.response?.data || err.message });
  }
});

// ✅ HISTORIQUE
router.get('/historique/:userId', async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const snapshot = await db.collection("achats_reels")
      .where("userId", "==", userId)
      .orderBy("date", "desc")
      .get();

    const historique = snapshot.docs.map(doc => doc.data());
    res.json({ historique });

  } catch (err) {
    console.error("❌ Erreur Firestore :", err);
    res.status(500).json({ message: "❌ Erreur récupération historique", error: err.message });
  }
});

// ✅ ROUTE DEBUG : récupérer les clés binance chiffrées d'un utilisateur
router.get('/recuperer-cle/:userId', async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "❌ Aucune clé trouvée pour cet utilisateur" });
    }

    const data = doc.data();
    return res.json({ message: "✅ Clé récupérée avec succès", data });
  } catch (error) {
    console.error("❌ Erreur Firestore :", error);
    return res.status(500).json({ message: "❌ Erreur récupération clé", error: error.message });
  }
});

export default router;