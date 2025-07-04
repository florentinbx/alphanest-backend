import express from 'express';
import { db } from '../firebase.js';
import crypto from 'crypto';
import axios from 'axios';

async function enregistrerLog(userId, action, details) {
  try {
    await db.collection("logs").add({
      userId,
      action,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("❌ Erreur enregistrement log :", err.message);
  }
}

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

async function obtenirSoldeUSDT(apiKey, apiSecret) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");

  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        headers: {
          "X-MBX-APIKEY": apiKey
        }
      }
    );

    const balances = response.data.balances;
    const usdt = balances.find(b => b.asset === "USDT");
    return parseFloat(usdt?.free || "0");
  } catch (err) {
    console.error("❌ Erreur récupération solde USDT :", err.response?.data || err.message);
    return null;
  }
}

// ✅ ACHAT RÉEL
router.post('/acheter', async (req, res) => {
  const { userId, montant, actif = "BTC" } = req.body;
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
    console.log("🧪 Clé API déchiffrée :", apiKey);
    console.log("🧪 Clé secrète déchiffrée :", apiSecret);

    const soldeUSDT = await obtenirSoldeUSDT(apiKey, apiSecret);
    console.log("💰 Solde USDT :", soldeUSDT);

    if (soldeUSDT === null) {
      return res.status(500).json({ message: "❌ Impossible de récupérer le solde" });
    }

    if (soldeUSDT < montant) {
      return res.status(400).json({ message: `❌ Solde insuffisant : ${soldeUSDT} USDT disponibles` });
    }
    
    const timestamp = Date.now();
    const symbol = actif.toUpperCase() + "USDT";
    const queryString = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const response = await axios({
      method: 'POST',
      url: 'https://api.binance.com/api/v3/order',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}&signature=${signature}`
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
    
    await enregistrerLog(userId, "achat", {
      actif,
      montant,
      reponseBinance: data
    });
    return res.json({ message: "✅ Achat exécuté avec succès", data: trade });
    
  } catch (err) {
    console.error("❌ Erreur achat Binance :", err.response?.data || err.message);
    await enregistrerLog(userId, "erreur_achat", {
      erreur: err.response?.data || err.message
    });
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
// ✅ ROUTE : solde réel USDT
router.get('/solde/:userId', async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ message: "Aucune clé trouvée ❌" });

    const data = doc.data();
    const apiKey = dechiffrerTexte(data.apiKey);
    const apiSecret = dechiffrerTexte(data.apiSecret);

    const soldeUSDT = await obtenirSoldeUSDT(apiKey, apiSecret);
    if (soldeUSDT === null) {
      return res.status(500).json({ message: "❌ Erreur récupération solde" });
    }
     await enregistrerLog(userId, "consultation_solde", { actif });
    return res.json({ userId, soldeUSDT });
   
  } catch (err) {
    console.error("❌ Erreur route solde :", err);
    return res.status(500).json({ message: "❌ Erreur interne", error: err.message });
  }
});
// ✅ VENTE RÉELLE
router.post('/vendre', async (req, res) => {
  const { userId, montant, actif = "BTC" } = req.body;
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
    const symbol = actif.toUpperCase() + "USDT";

    const queryString = `symbol=${symbol}&side=SELL&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const response = await axios({
      method: 'POST',
      url: 'https://api.binance.com/api/v3/order',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `symbol=${symbol}&side=SELL&type=MARKET&quoteOrderQty=${montant}&timestamp=${timestamp}&signature=${signature}`
    });

    const vente = response.data;

    await db.collection("ventes_reelles").add({
      userId,
      montant,
      actif,
      prixVente: vente.fills?.[0]?.price || "Inconnu",
      quantite: vente.executedQty,
      date: new Date(),
      idTransaction: vente.orderId,
    });

    return res.json({ message: "✅ Vente exécutée avec succès", data: vente });

  } catch (err) {
    console.error("❌ Erreur vente Binance :", err.response?.data || err.message);
    return res.status(500).json({ message: "❌ Erreur lors de la vente", error: err.response?.data || err.message });
  }
});
// 📜 HISTORIQUE DES VENTES
router.get("/historique-ventes/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const snapshot = await db.collection("ventes_reelles")
      .where("userId", "==", userId)
      .orderBy("date", "desc")
      .get();

    const ventes = snapshot.docs.map(doc => doc.data());
    res.json({ ventes });

  } catch (err) {
    console.error("❌ Erreur historique ventes :", err);
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique des ventes" });
  }
});
// 🔐 RETRAIT D'USDT
router.post('/retirer', async (req, res) => {
  const { userId, adresse, montant, reseau = "TRX" } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId || !adresse || !montant) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    const doc = await db.collection("cles_binance").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ message: "Clé introuvable ❌" });

    const data = doc.data();
    const apiKey = dechiffrerTexte(data.apiKey);
    const apiSecret = dechiffrerTexte(data.apiSecret);

    const timestamp = Date.now();
    const params = `coin=USDT&address=${adresse}&amount=${montant}&network=${reseau}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(params).digest('hex');

    const response = await axios({
      method: 'POST',
      url: 'https://api.binance.com/sapi/v1/capital/withdraw/apply',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `${params}&signature=${signature}`
    });

    const retrait = response.data;

    await db.collection("retraits").add({
      userId,
      adresse,
      montant,
      reseau,
      date: new Date(),
      idRetrait: retrait.id || "inconnu",
      status: retrait.msg || "En attente"
    });
    await enregistrerLog(userId, "retrait", {
      montant,
      adresse,
      actif,
      reponseBinance: data
    });
    return res.json({ message: "✅ Retrait demandé avec succès", data: retrait });
    
  } catch (err) {
    console.error("❌ Erreur retrait :", err.response?.data || err.message);
    res.status(500).json({ message: "❌ Erreur lors du retrait", error: err.response?.data || err.message });
  }
});
// 🔍 HISTORIQUE DES RETRAITS
router.get('/retraits/:userId', async (req, res) => {
  const userId = req.params.userId;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const snapshot = await db.collection("retraits")
      .where("userId", "==", userId)
      .orderBy("date", "desc")
      .get();

    const retraits = snapshot.docs.map(doc => doc.data());
    return res.json({ message: "✅ Historique récupéré", data: retraits });

  } catch (err) {
    console.error("❌ Erreur récupération retraits :", err);
    return res.status(500).json({ message: "❌ Erreur récupération retraits", error: err.message });
  }
});

export default router;