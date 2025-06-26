import fetch from 'node-fetch';

const userId = "florentin";

fetch(`https://alphanest-backend-production-3002.up.railway.app/api/cle?userId=${userId}`)
  .then(res => res.json())
  .then(data => {
    console.log("🧾 Clés récupérées :", data);
  })
  .catch(err => {
    console.error("❌ Erreur lors de la requête :", err);
  });
