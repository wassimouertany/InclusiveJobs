#🌐 InclusiveJobs

> **L'emploi adapté, pour chaque talent.**

Une plateforme IA de recrutement inclusif conçue pour faciliter l'accès à l'emploi des personnes à besoins spécifiques, tout en accompagnant les entreprises dans une démarche de recrutement responsable.

---

## 📌 À propos du projet

**InclusiveJobs** est une solution numérique intelligente qui met en relation trois types d'utilisateurs :

- 🧑‍💼 **Candidats à besoins spécifiques** — Créer un profil, déposer un CV, déclarer leurs besoins et postuler à des offres adaptées.
- 🏢 **Recruteurs (entreprises)** — Publier des offres, décrire leur environnement de travail et consulter des profils compatibles.
- 🛡️ **Administrateurs** — Gérer et superviser la plateforme.

Contrairement aux plateformes classiques, InclusiveJobs utilise l'**Intelligence Artificielle Générative (Gemini)** combinée à une architecture **RAG (Retrieval Augmented Generation)** pour un matching intelligent qui prend en compte non seulement les compétences techniques, mais aussi les contraintes d'accessibilité, les besoins spécifiques du candidat et l'environnement proposé par l'entreprise.

---

## 🚀 Technologies utilisées

### Backend
| Technologie | Rôle |
|---|---|
| **FastAPI** | Framework API REST asynchrone |
| **MongoDB + Motor** | Base de données NoSQL (async) |
| **GridFS** | Stockage fichiers (CV, carte handicap, logo) |
| **Pydantic** | Validation des données |
| **bcrypt + JWT** | Authentification sécurisée |
| **LangChain** | Orchestration des agents IA |
| **Gemini API** | Intelligence Artificielle Générative |
| **Text-Embedding-004** | Embeddings vectoriels (Google) |
| **FAISS** | Base vectorielle pour le matching RAG |
| **pdfplumber** | Extraction de texte des CV PDF |

### Frontend
| Technologie | Rôle |
|---|---|
| **React** | Interface utilisateur |
| **Axios** | Appels API REST |

---
