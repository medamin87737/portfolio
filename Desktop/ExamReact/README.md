# React Exam 23/24 — Agence Immobilière (Partie A + Partie B avec Zustand)

Application React (Vite) + **JSON Server** pour la Partie A, et **Zustand** (au lieu de Redux Toolkit) pour la Partie B.

## Démarrage

Installer:

```bash
npm install
```

Lancer **JSON Server + React**:

```bash
npm run dev:all
```

- JSON Server: `http://localhost:3001/properties`
- App: `http://localhost:5173/`

## Fonctionnalités

### Partie A (JSON Server)
- Liste des propriétés depuis l’API
- Filtre en temps réel par **prix min / prix max**
- Bouton **“Réserver la propriété”** uniquement si `available === true`
- Sur “Réserver”: incrémentation de `views` + redirection vers `/reserve?id=...`
- Sur “Valider”: reset formulaire, propriété devient indisponible, message de confirmation, redirection après 5s

### Partie B (Zustand)
- Bouton “Ajouter une évaluation”
- Select 1 → 5 + bouton “Ajouter”
- Ajout: log console (évaluation + moyenne)
- Alerte si moyenne > 4.5: “Propriété excellente !”

## Dépôt GitHub (pour Blackboard)

```bash
git init
git add .
git commit -m "React Exam - Partie A + Zustand"
git branch -M main
git remote add origin <VOTRE_REPO_GITHUB>
git push -u origin main
```
