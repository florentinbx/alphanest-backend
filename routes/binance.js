// routes/binance.js

import express from "express";
import CryptoJS from "crypto-js";
import { db } from "../firebase.js";

const router = express.Router();

// Remplace par une clé secrète longue et complexe
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

// POST /api/binance
router.post("/", async (req, res) => {
  const { userId, apiKey, apiSecret } = req.body;

  if (!userId || !apiKey || !apiSecret) {
    return res.status(400).json({ message: "Champs manquants ❌" });
  }

  try {
    // Chiffrement AES
    const encryptedKey = CryptoJS.AES.encrypt(apiKey, ENCRYPTION_SECRET).toString();
    const encryptedSecret = CryptoJS.AES.encrypt(apiSecret, ENCRYPTION_SECRET).toString();

    await db.collection("cles_binance").doc(userId).set({
      apiKey: encryptedKey,
      apiSecret: encryptedSecret,
      date: new Date().toISOString()
    });

    res.json({ message: "Clés Binance sauvegardées 🔐" });
  } catch (error) {
    console.error("Erreur enregistrement clés Binance:", error);
    res.status(500).json({ message: "Erreur serveur ❌" });
  }
});

export default router;