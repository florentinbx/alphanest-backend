import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';
import axios from 'axios';
import querystring from 'querystring';

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


// 🟢 Route POST pour exécuter un achat réel de BTC
router.post('/executer-achat', async (req, res) => {
  const { userId, montant } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId || !montant) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    // 🔓 Récupération et déchiffrement des clés
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "❌ Clé introuvable pour cet utilisateur" });
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

    // 🔁 Préparer la requête d'achat chez Binance
    const timestamp = Date.now();
    const quantity = (parseFloat(montant) / 30000).toFixed(6); // exemple si BTC = 30 000 USD
    const params = {
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity,
      timestamp,
    };

    const query = querystring.stringify(params);
    const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');

    const response = await axios.post(`https://api.binance.com/api/v3/order?${query}&signature=${signature}`, null, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      }
    });

    res.json({ message: '✅ Achat effectué avec succès !', resultat: response.data });
  } catch (err) {
    console.error("❌ Erreur Binance :", err.response?.data || err.message);
    res.status(500).json({ message: "❌ Erreur lors de l'achat", details: err.response?.data || err.message });
  }
});

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
    // 🔓 Récupérer la clé chiffrée
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ message: "Aucune clé trouvée ❌" });

    const data = doc.data();

    const dechiffrerTexte = (chiffre) => {
      const algorithm = "aes-256-cbc";
      const key = Buffer.from(process.env.CRYPT_KEY, "hex");
      const iv = Buffer.from(chiffre.iv, "hex");
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(chiffre.contenu, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    };

    const apiKey = dechiffrerTexte(data.apiKey);
    const apiSecret = dechiffrerTexte(data.apiSecret);

    // ✅ Signature de la requête d’achat (BTC/USDT au market)
    const timestamp = Date.now();
    const queryString = `symbol=BTCUSDT&side=BUY&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const response = await axios.post(
      `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`,
      {},
      {
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      }
    );

    return res.json({ message: "✅ Achat exécuté avec succès", data: response.data });

  } catch (err) {
    console.error("❌ Erreur achat Binance :", err.response?.data || err.message);
    return res.status(500).json({ message: "❌ Erreur lors de l'achat", error: err.response?.data || err.message });
  }
});

export default router;