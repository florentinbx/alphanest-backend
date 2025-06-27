# 🔐 AlphaNest Backend API

Backend sécurisé Node.js/Express connecté à Firebase Firestore, utilisé pour gérer les clés API premium du robot d'investissement **AlphaNest**.

---

## 🚀 Fonctionnalités

- Créer, vérifier, modifier, supprimer des clés API
- Protection par clé secrète (`x-api-key`)
- Connexion sécurisée à Firebase via service account
- Middleware intelligent pour restreindre l'accès aux routes sensibles
- API REST complète et simple à intégrer dans un front-end ou une application

---

## 🛠️ Installation locale

1. **Cloner le repo**
   ```bash
   git clone https://github.com/ton-pseudo/alphanest-backend.git
   cd alphanest-backend