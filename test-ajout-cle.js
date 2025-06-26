// test-ajout-cle.js

fetch("https://alphanest-backend-production-3002.up.railway.app/api/cle", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "E0GI3itgKOOjud5lvPWVttrxhac53FfFbqLZB1s2uzW0hCjhNIBM5seaZc8TGyyq" // ← TA CLÉ SECRÈTE ADMIN
  },
  body: JSON.stringify({
    userId: "florentin",
    apiKey: "cle_test_123"
  })
})
  .then(res => res.json())
  .then(data => console.log("✅ Clé ajoutée :", data))
  .catch(err => console.error("❌ Erreur :", err));