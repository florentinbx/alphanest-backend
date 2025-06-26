const BASE_URL = "https://alphanest-backend-production-3002.up.railway.app/api/cle";
const API_KEY = "E0GI3itgKOOjud5lvPWVttrxhac53FfFbqLZB1s2uzW0hCjhNIBM5seaZc8TGyyq";
const USER_ID = "florentin";

async function testAPI() {
  try {
    // 1. POST : Ajouter une clé
    const postRes = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({ userId: USER_ID, apiKey: "cle_test_123" })
    });
    const postData = await postRes.json();
    console.log("✅ POST :", postData);
    const keyId = postData.id;

    // 2. GET : Lire les clés
    const getRes = await fetch(`${BASE_URL}?userId=${USER_ID}`, {
      headers: { "x-api-key": API_KEY }
    });
    const getData = await getRes.json();
    console.log("📦 GET :", getData);

    // 3. PUT : Mettre à jour la clé
    const putRes = await fetch(`${BASE_URL}/${keyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({ newApiKey: "cle_mise_a_jour_456" })
    });
    const putText = await putRes.text();
    try {
      const putData = JSON.parse(putText);
      console.log("🔁 PUT :", putData);
    } catch (e) {
      console.log("⚠️ PUT Erreur JSON :", putText);
    }

    // 4. DELETE : Supprimer la clé
    const deleteRes = await fetch(`${BASE_URL}/${keyId}`, {
      method: "DELETE",
      headers: { "x-api-key": API_KEY }
    });
    const deleteText = await deleteRes.text();
    try {
      const deleteData = JSON.parse(deleteText);
      console.log("🗑️ DELETE :", deleteData);
    } catch (e) {
      console.log("⚠️ DELETE Erreur JSON :", deleteText);
    }

  } catch (err) {
    console.error("❌ Erreur générale :", err);
  }
}

testAPI();