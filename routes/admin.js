import express from "express";
import { db } from "../firebase.js";

const router = express.Router();

// 🔐 Middleware de sécurité (clé secrète)
router.use((req, res, next) => {
  const adminKey = req.headers["x-api-key"];
  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }
  next();
});

// 📋 Récupérer les logs récents
router.get("/logs", async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  try {
    const snapshot = await db
      .collection("logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc) => doc.data());
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});

// 👥 Liste des utilisateurs avec clés Binance
router.get("/utilisateurs", async (req, res) => {
  try {
    const snapshot = await db.collection("cles_binance").get();
    const utilisateurs = snapshot.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    }));
    res.json({ utilisateurs });
  } catch (err) {
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});

// 🗑️ Supprimer un utilisateur
router.delete("/supprimer-utilisateur/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.collection("cles_binance").doc(userId).delete();
    res.json({ message: `✅ Clés supprimées pour ${userId}` });
  } catch (err) {
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});

// 📊 Statistiques utilisateurs
router.get("/stats", async (req, res) => {
  try {
    const snapshot = await db.collection("cles_binance").get();
    const total = snapshot.size;
    const utilisateurs = snapshot.docs.map((doc) => doc.id);
    res.json({ totalUtilisateurs: total, utilisateurs });
  } catch (err) {
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});
// 🔍 Obtenir le rôle d’un utilisateur
router.get("/roles/:userId", async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const doc = await db.collection("roles").doc(userId).get();
    if (!doc.exists) {
      return res.json({ role: "utilisateur" }); // 🔹 Par défaut
    }

    return res.json({ role: doc.data().role || "utilisateur" });

  } catch (err) {
    console.error("❌ Erreur récupération rôle :", err.message);
    return res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});
// 🚀 Activer Premium pour un utilisateur
router.post("/activer-premium", async (req, res) => {
  const { userId } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId) {
    return res.status(400).json({ message: "userId manquant ❌" });
  }

  try {
    await db.collection("roles").doc(userId).set({
      role: "premium"
    });

    res.json({ message: `✅ Premium activé pour ${userId}` });

  } catch (err) {
    console.error("❌ Erreur activation premium :", err.message);
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});
// 🎫 Récupérer le rôle d’un utilisateur
router.get("/roles/:userId", async (req, res) => {
  const { userId } = req.params;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  try {
    const doc = await db.collection("roles").doc(userId).get();
    if (!doc.exists) {
      return res.json({ role: "standard" });
    }
    const data = doc.data();
    return res.json({ role: data.role || "standard" });

  } catch (err) {
    console.error("❌ Erreur récupération rôle :", err.message);
    return res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});
// ✅ Activer le rôle premium d’un utilisateur
router.post("/activer-premium", async (req, res) => {
  const { userId } = req.body;
  const adminKey = req.headers["x-api-key"];

  if (adminKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: "Clé secrète invalide ❌" });
  }

  if (!userId) return res.status(400).json({ message: "userId manquant ❌" });

  try {
    await db.collection("roles").doc(userId).set({ role: "premium" });
    return res.json({ message: "✅ Premium activé avec succès" });
  } catch (err) {
    console.error("❌ Erreur Firestore :", err.message);
    return res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});

export default router;