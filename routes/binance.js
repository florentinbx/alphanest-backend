import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';
import axios from 'axios';

const router = express.Router();

function dechiffrerTexte(chiffre) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(process.env.CRYPT_KEY, "hex");
  const iv = Buffer.from(chiffre.iv, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(chiffre.contenu, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ✅ Route POST : achat réel BTC/USDT
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

    const response = await axios.post(
      `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: { 'X-MBX-APIKEY': apiKey }
      }
    );

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

// ✅ Route GET : historique des achats
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
// ✅ Route GET pour récupérer les clés Binance d’un utilisateur (test/debug uniquement)
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