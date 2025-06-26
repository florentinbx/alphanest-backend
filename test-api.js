// test-api.js
fetch("https://alphanest-backend-production-3002.up.railway.app/api/cle", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "ma_clé_ultra_secrète_2025" // 🔐 ajoute bien la clé secrète ici
  },
  body: JSON.stringify({
    userId: "florentin",
    apiKey: "cle_test_123"
  })
})
  .then(res => res.json())
  .then(data => console.log("✅ Résultat API :", data))
  .catch(err => console.error("❌ Erreur API :", err));