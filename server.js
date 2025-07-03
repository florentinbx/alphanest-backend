import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './firebase.js';
import binanceRoutes from "./routes/binance.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Route test
app.get('/', (req, res) => {
  res.send('✅ AlphaNest backend est en ligne !');
});

// Middleware pour protéger toutes les routes sauf vérification publique
app.use((req, res, next) => {
  if (req.path === '/api/cle/verification') return next(); // exception
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(403).json({ message: 'Clé secrète invalide ❌' });
  }
  next();
});

// ✅ Routes Binance
app.use("/api/binance", binanceRoutes);

// ✅ Route publique : vérification de clé
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

app.listen(PORT, () => {
  console.log(`✅ Backend AlphaNest en ligne sur le port ${PORT}`);
});