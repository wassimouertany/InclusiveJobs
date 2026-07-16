# Migration vers une architecture microservices — InclusiveJobs

## Contexte

Le backend actuel (`backend/`) est un monolithe FastAPI unique : 8 routers montés sur une seule `FastAPI()` app, tous branchés sur un **client MongoDB partagé** (`database.py` : `db = client["inclusive_jobs"]`), importé directement (`from database import db`) dans quasiment chaque module. Trois frontends distincts (`frontend/`, `backoffice/`) consomment ce backend via une **URL unique** (`VITE_API_URL`, défaut `http://localhost:8000`), sans aucune notion de service.

L'exploration du code a révélé deux faits déterminants :

1. **Couplage fort entre domaines métier** : `routes_applications.py` écrit directement dans `db.notifications`, lit `db.job_offers` et `db.recruiters` ; `routes_admin.py` agrège des données de 6 collections différentes ; `routes_users.py` (le plus gros fichier, ~1000 lignes) mélange auth, profils candidat/recruteur, admin, upload GridFS et déclenche l'enrichissement IA. Découper ces domaines en services séparés exigerait de remplacer tous ces accès croisés directs par des appels réseau ou un event bus — un chantier lourd et risqué avant une soutenance.
2. **Un candidat d'extraction naturel et à forte valeur** existe : `rag_service.py` (matching IA). Il est déjà quasi autonome (aucune autre logique métier n'y est mêlée), il est le plus coûteux en ressources (reconstruit un index FAISS en mémoire à chaque appel + appels Gemini/Groq par résultat), et il est déjà namespacé côté frontend (`/ai/...`). Le traitement de documents (OCR + extraction Gemini) est le deuxième candidat naturel : il est stateless (bytes → JSON), CPU-bound (Tesseract/Poppler), et ses chemins actuels sont d'ailleurs codés en dur pour Windows — un problème de portabilité que la conteneurisation résout au passage.

Décisions validées avec l'utilisateur : extraction progressive de **2-3 services** (pas un découpage complet des 8 domaines), orchestration via **Docker Compose**, et une **base MongoDB partagée mais avec propriété de collections par service** (pas de DB dédiée par service). L'objectif est double : démontrer un vrai pattern microservices _et_ obtenir un bénéfice réel de scalabilité sur les deux points chauds identifiés (appels LLM, OCR).

## Architecture cible

```
                        ┌─────────────┐
   frontend/ ─────┐     │             │
   backoffice/ ────┼───▶│   gateway   │  (nginx, routing par préfixe de chemin)
                        │             │
                        └──────┬──────┘
                 ┌─────────────┼──────────────────┐
                 ▼              ▼                  ▼
          ┌─────────────┐ ┌───────────┐   ┌──────────────────┐
          │ core-service│ │ai-service │   │ parsing-service   │
          │ (FastAPI)   │ │(FastAPI)  │   │ (FastAPI)         │
          │ users, jobs,│ │ matching  │   │ OCR + extraction  │
          │ applications│ │ (rag_svc) │   │ structurée Gemini │
          │ notif,      │ │           │   │ (stateless)       │
          │ stories,    │ └─────┬─────┘   └───────────────────┘
          │ badges,     │       │ lecture seule
          │ admin       │       ▼
          └──────┬──────┘ candidates, job_offers
                 │
                 ▼
          MongoDB Atlas (même cluster, collections réparties par
          responsabilité d'écriture : core écrit tout sauf ce que
          l'ai-service lit ; parsing-service n'a aucun accès DB)
```

- **core-service** : reste le "monolithe" actuel, débarrassé de `rag_service.py`, `routes_ai.py`, `resume_extraction.py` et `services/parser_service.py`. Garde tout le reste (auth, users, job-offers, applications, notifications, stories, badges, admin/backoffice) car ces domaines sont trop couplés pour être séparés sans risque à ce stade.
- **ai-service** : `rag_service.py` + `routes_ai.py` déplacés tels quels. Valide le JWT lui-même (même `SECRET_KEY` partagée via variable d'env — pas de service d'auth séparé, chaque service vérifie le token de façon stateless). A un accès MongoDB **en lecture seule** à `candidates` et `job_offers` (seul core-service y écrit) — compromis pragmatique assumé pour éviter une synchronisation par événements hors de portée pour ce projet.
- **parsing-service** : `resume_extraction.py` + `services/parser_service.py` déplacés. Aucun accès DB — reçoit des bytes, renvoie du JSON structuré. Le seul consommateur est core-service (appel HTTP interne), pas besoin de route gateway dédiée.
- **gateway** (nginx) : point d'entrée unique, remplace `http://localhost:8000` dans les deux frontends sans qu'ils aient à changer de logique (un seul `VITE_API_URL`). Route `/ai/*` → ai-service, tout le reste → core-service. Gère seul le CORS (les services internes n'ont plus besoin de `CORSMiddleware`, ils ne sont plus jamais appelés directement par un navigateur).

## Étapes de migration (ordre pensé pour rester exécutable à chaque étape)

### 1. Squelette Docker Compose + gateway passthrough

Créer `docker-compose.yml` à la racine avec un service `gateway` (nginx) qui route tout vers le backend actuel inchangé. Vérifier que `frontend`/`backoffice` fonctionnent identiquement en pointant `VITE_API_URL` vers `http://localhost:8000` (le gateway). Ceci prouve que l'introduction du gateway ne casse rien avant de toucher au code Python.

### 2. Extraire `parsing-service`

- Créer `backend/parsing-service/` avec `main.py` (nouvelle FastAPI app), `resume_extraction.py`, `parser_service.py` déplacés, et un petit `llm_client.py` dupliquant le `get_llm()` actuellement importé depuis `rag_service.py` (découplage volontaire — éviter une lib partagée pour un projet de cette taille).
- Exposer un endpoint HTTP équivalent à `POST /users/candidates/extract-documents` (même contrat multipart : `resume`, `disability_card`).
- Dans `core-service/routes_users.py` : remplacer les appels directs à `extract_text_from_resume_pdf`, `extract_text_from_disability_document`, `parse_document_text` par des appels `httpx` vers `parsing-service` — à la fois dans `extract_candidate_documents` (endpoint synchrone) et dans `_enrich_candidate_with_ai` (tâche de fond après inscription).
- Dockerfile du parsing-service basé sur une image avec `tesseract-ocr` et `poppler-utils` installés via apt (règle le problème des chemins Windows codés en dur, cf. `resume_extraction.py`).
- Vérifier : inscription candidat avec CV + carte d'invalidité (auto-remplissage + enrichissement en tâche de fond), mise à jour de profil avec nouveau CV.

### 3. Extraire `ai-service`

- Créer `backend/ai-service/` avec `main.py` (les 3 endpoints de `routes_ai.py`), `rag_service.py` déplacé, un `auth.py` allégé (juste `get_current_candidate`/`get_current_recruiter` — décode JWT + lookup, dupliqué depuis `core-service/auth.py`), et un `database.py` en lecture seule (accès à `candidates` et `job_offers` uniquement).
- Mettre à jour le gateway pour router `/ai/*` directement vers `ai-service` (bypass complet de core-service — démontre l'indépendance réelle du service).
- Dans `core-service` : supprimer `rag_service.py`, `routes_ai.py`, et les imports résiduels (`invalidate_candidate_index_cache`/`invalidate_offer_index_cache` dans `routes_users.py` et `routes_job_offers.py` — ce sont déjà des no-ops, à supprimer proprement plutôt que garder un import mort).
- Vérifier : un recruteur lance un matching IA sur une offre, un candidat voit ses offres recommandées, l'analyse détaillée offre/candidat fonctionne.

### 4. Finalisation

- Renommer `backend/` → `backend/core-service/` (ou équivalent), ajuster les 3 `requirements.txt` pour ne garder que les dépendances réellement utilisées par chaque service (le rapport d'exploration a déjà établi le découpage naturel : web/DB/auth pour core, langchain+faiss pour ai-service, pdfplumber/pytesseract/pdf2image pour parsing-service).
- `docker-compose.yml` final avec les 4 services (gateway, core-service, ai-service, parsing-service), variables d'env partagées (`SECRET_KEY`, `MONGODB_URL`, `GOOGLE_API_KEY`) injectées via `.env` à la racine.
- Retirer `CORSMiddleware` de `core-service` et `ai-service` (seul le gateway le garde).
- Mettre à jour `frontend/.env.local` et toute config équivalente dans `backoffice/` pour pointer vers le gateway.
- Mettre à jour `CLAUDE.md` (section Development Commands) pour documenter `docker-compose up` comme nouveau mode de lancement, en gardant les commandes `uvicorn`/`npm run dev` individuelles pour le dev service-par-service.

## Fichiers clés

- `backend/main.py`, `backend/database.py` — à dupliquer/adapter par service
- `backend/rag_service.py`, `backend/routes_ai.py` → `ai-service/`
- `backend/resume_extraction.py`, `backend/services/parser_service.py` → `parsing-service/`
- `backend/routes_users.py:192-241,244-299` — points d'intégration à remplacer par des appels HTTP vers parsing-service
- `backend/routes_users.py:29,416,698` et `backend/routes_job_offers.py:13` — imports `invalidate_*_index_cache` à supprimer
- `backend/auth.py` — base pour la version allégée dupliquée dans ai-service
- `frontend/src/config/api.ts`, `backoffice/src/services/adminApi.ts` — confirment que seule la variable `VITE_API_URL` doit changer (aucune autre modif frontend nécessaire)

## Vérification

1. `docker-compose up --build` — les 4 conteneurs démarrent, `ping_db()` réussit pour core-service.
2. Health check direct de chaque service via le réseau docker (`/docs` Swagger de chacun).
3. Parcours de bout en bout via le frontend réel (`npm run dev` pointé sur le gateway) :
   - Inscription candidat avec CV + carte d'invalidité → vérifie parsing-service.
   - Connexion, navigation offres, candidature → vérifie core-service seul.
   - Recruteur : lancer le matching IA sur une offre → vérifie ai-service + routage gateway `/ai/*`.
   - Backoffice : dashboard stats admin → vérifie que core-service seul suffit (aucune dépendance IA/OCR).
4. Confirmer que l'OCR fonctionne bien depuis le conteneur Linux du parsing-service (test avec un vrai PDF scanné), ce qui valide la résolution du problème de chemins Tesseract/Poppler codés en dur pour Windows.
