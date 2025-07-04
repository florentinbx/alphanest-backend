import express from 'express';
import { db } from '../firebase.js';

const router = express.Router();
const API_KEY = process.env.API_SECRET_KEY;

// ✅ Middleware sécurité
function checkAPIKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(403).json({ message: 'Clé secrète invalide ❌' });
  next();
}

// ✅ Récupérer le profil utilisateur
router.get('/profil/:userId', checkAPIKey, async (req, res) => {
  const { userId } = req.params;
  try {
    const doc = await db.collection('utilisateurs').doc(userId).get();
    if (!doc.exists) return res.status(404).json({ message: 'Utilisateur non trouvé ❌' });

    return res.json({ message: '✅ Profil récupéré', data: doc.data() });
  } catch (err) {
    console.error("❌ Erreur récupération profil :", err.message);
    return res.status(500).json({ message: '❌ Erreur serveur', error: err.message });
  }
});

// ✅ Créer ou mettre à jour un profil utilisateur
router.post('/profil', checkAPIKey, async (req, res) => {
  const { userId, pseudo, email, avatar = '', premium = false } = req.body;
  if (!userId || !email) return res.status(400).json({ message: 'Champs requis manquants ❌' });

  try {
    await db.collection('utilisateurs').doc(userId).set({
      pseudo,
      email,
      avatar,
      premium,
      dateInscription: new Date()
    }, { merge: true });

    return res.json({ message: '✅ Profil mis à jour' });
  } catch (err) {
    console.error("❌ Erreur MAJ profil :", err.message);
    return res.status(500).json({ message: '❌ Erreur serveur', error: err.message });
  }
});

// ✅ Vérifier l’abonnement Premium
router.get('/premium/:userId', checkAPIKey, async (req, res) => {
  const { userId } = req.params;
  try {
    const doc = await db.collection('utilisateurs').doc(userId).get();
    if (!doc.exists) return res.json({ premium: false });

    const data = doc.data();
    return res.json({ premium: data.premium === true });
  } catch (err) {
    console.error("❌ Erreur premium :", err.message);
    return res.status(500).json({ message: '❌ Erreur serveur', error: err.message });
  }
});

export default router;