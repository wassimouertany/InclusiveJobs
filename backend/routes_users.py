from datetime import datetime, timezone
from typing import Optional

import bcrypt
from bson import ObjectId
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import Json

from auth import create_access_token, get_current_admin, verify_password
from database import db, fs
from models import (
    AdminCreate,
    Genre,
    LoginRequest,
    NiveauAcademique,
    PreferenceTravail,
    StatutDisponibilite,
    TypeHandicap,
)

router = APIRouter(prefix="/users", tags=["users"])


def hash_password(password: str) -> str:
    """Hache le mot de passe avec bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


async def upload_file_to_gridfs(upload_file: UploadFile) -> Optional[str]:
    """
    Lit le contenu d'un UploadFile et l'envoie dans GridFS.
    Retourne l'id du fichier (str) ou None si le fichier est vide.
    """
    content = await upload_file.read()
    if not content:
        return None
    file_id = await fs.upload_from_stream(
        upload_file.filename or "file",
        content,
        metadata={"content_type": upload_file.content_type or "application/octet-stream"},
    )
    return str(file_id)


@router.post("/candidats/")
async def inscrire_candidat(
    nom: str = Form(...),
    prenom: str = Form(...),
    email: str = Form(...),
    motDePasse: str = Form(...),
    telephone: str = Form(""),
    adresse: str = Form(""),
    secteur: str = Form(""),
    genre: Genre = Form(...),
    annesExperience: int = Form(0),
    niveauAcademique: NiveauAcademique = Form(...),
    amenagementsTravail: Json[list[str]] = Form("[]"),
    titreProfil: str = Form(""),
    competencesCles: Json[list[str]] = Form("[]"),
    typeHandicap: TypeHandicap = Form(...),
    besoinAccibilite: str = Form(""),
    preferenceTravail: PreferenceTravail = Form(...),
    statutDisponibilite: StatutDisponibilite = Form(...),
    logo: Optional[UploadFile] = File(None),
    carteHandicap: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
):
    """
    Inscription d'un candidat.
    Accepte multipart/form-data avec champs texte et fichiers (logo, carteHandicap, cv).
    """
    # Validations strictes avant tout traitement
    try:
        validate_email(email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Format d'email invalide.")

    existing = await db.candidats.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà associé à un compte.")

    if len(motDePasse) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")

    if cv and cv.filename and not cv.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le CV doit être un fichier PDF.")

    logo_id: Optional[str] = None
    carte_handicap_id: Optional[str] = None
    cv_id: Optional[str] = None

    if logo and logo.filename:
        logo_id = await upload_file_to_gridfs(logo)
    if carteHandicap and carteHandicap.filename:
        carte_handicap_id = await upload_file_to_gridfs(carteHandicap)
    if cv and cv.filename:
        cv_id = await upload_file_to_gridfs(cv)

    candidat_dict = {
        "role": "CANDIDAT",
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "motDePasse": hash_password(motDePasse),
        "telephone": telephone,
        "adresse": adresse,
        "secteur": secteur,
        "genre": genre.value,
        "annesExperience": annesExperience,
        "niveauAcademique": niveauAcademique.value,
        "amenagementsTravail": amenagementsTravail,
        "titreProfil": titreProfil,
        "competencesCles": competencesCles,
        "typeHandicap": typeHandicap.value,
        "besoinAccibilite": besoinAccibilite,
        "preferenceTravail": preferenceTravail.value,
        "statutDisponibilite": statutDisponibilite.value,
        "logo_id": logo_id,
        "carteHandicap_id": carte_handicap_id,
        "cv_id": cv_id,
        "dateCreation": datetime.now(timezone.utc),
    }

    result = await db.candidats.insert_one(candidat_dict)
    candidat_id = str(result.inserted_id)

    return {
        "id": candidat_id,
        "message": "Candidat inscrit avec succès.",
    }


@router.post("/login/")
async def login(request: LoginRequest):
    """
    Authentification par email/mot de passe.
    Accepte un body JSON avec email et motDePasse.
    """
    user = await db.candidats.find_one({"email": request.email})
    role = "CANDIDAT"
    if user is None:
        user = await db.recruteurs.find_one({"email": request.email})
        role = "RECRUTEUR"
    if user is None:
        user = await db.admins.find_one({"email": request.email})
        role = "ADMIN"

    if user is None:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not verify_password(request.motDePasse, user["motDePasse"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    role = user.get("role", role)

    token = create_access_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "id": str(user["_id"]),
    }


@router.post("/recruteurs/")
async def inscrire_recruteur(
    email: str = Form(...),
    motDePasse: str = Form(...),
    nomEntreprise: str = Form(...),
    secteurActivite: str = Form(""),
    telephone: str = Form(""),
    localisation: str = Form(""),
    fondeeDepuis: int = Form(0),
    nombreEmploye: int = Form(0),
    nombreEmployeHandicape: int = Form(0),
    strategieInclusion: str = Form(""),
    logo: Optional[UploadFile] = File(None),
):
    """
    Inscription d'un recruteur.
    Accepte multipart/form-data avec champs texte, entiers et fichier logo.
    """
    # 1. Validation Email (Format)
    try:
        validate_email(email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Format d'email invalide.")

    # 2. Validation Email (Unicité globale)
    existing_recruteur = await db.recruteurs.find_one({"email": email})
    existing_candidat = await db.candidats.find_one({"email": email})
    if existing_recruteur or existing_candidat:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # 3. Validation Mot de passe
    if len(motDePasse) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")

    # 4. Validation du Logo
    if logo and logo.filename:
        allowed_extensions = (".png", ".jpg", ".jpeg")
        if not logo.filename.lower().endswith(allowed_extensions):
            raise HTTPException(status_code=400, detail="Le logo doit être une image PNG ou JPEG.")

    # 5. Upload du logo dans GridFS
    logo_id: Optional[str] = None
    if logo and logo.filename:
        logo_id = await upload_file_to_gridfs(logo)

    # 6. Hachage du mot de passe
    # 7. Construction du dictionnaire
    recruteur_dict = {
        "role": "RECRUTEUR",
        "email": email,
        "motDePasse": hash_password(motDePasse),
        "nomEntreprise": nomEntreprise,
        "secteurActivite": secteurActivite,
        "telephone": telephone,
        "localisation": localisation,
        "fondeeDepuis": fondeeDepuis,
        "nombreEmploye": nombreEmploye,
        "nombreEmployeHandicape": nombreEmployeHandicape,
        "strategieInclusion": strategieInclusion,
        "logo_id": logo_id,
        "dateCreation": datetime.now(timezone.utc),
    }

    # 8. Insertion dans db.recruteurs
    result = await db.recruteurs.insert_one(recruteur_dict)
    recruteur_id = str(result.inserted_id)

    # 9. Retour
    return {
        "id": recruteur_id,
        "message": "Recruteur inscrit avec succès.",
    }


@router.post("/admins/")
async def creer_admin(admin_data: AdminCreate):
    """
    Création d'un administrateur.
    Accepte un body JSON avec email et motDePasse.
    """
    # 4. Validation Email (Format)
    try:
        validate_email(admin_data.email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Format d'email invalide.")

    # 5. Validation Email (Unicité globale)
    existing_admin = await db.admins.find_one({"email": admin_data.email})
    existing_recruteur = await db.recruteurs.find_one({"email": admin_data.email})
    existing_candidat = await db.candidats.find_one({"email": admin_data.email})
    if existing_admin or existing_recruteur or existing_candidat:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # 6. Validation Mot de passe
    if len(admin_data.motDePasse) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")

    # 7. Hachage du mot de passe
    # 8. Construction du dictionnaire
    admin_dict = {
        "role": "ADMIN",
        "email": admin_data.email,
        "motDePasse": hash_password(admin_data.motDePasse),
        "dateCreation": datetime.now(timezone.utc),
    }

    # 9. Insertion dans db.admins
    result = await db.admins.insert_one(admin_dict)
    admin_id = str(result.inserted_id)

    # 10. Retour
    return {
        "id": admin_id,
        "message": "Administrateur créé avec succès.",
    }


@router.get("/admin/candidats/")
async def list_candidats(admin: dict = Depends(get_current_admin)):
    """Liste tous les candidats (réservé aux administrateurs)."""
    cursor = db.candidats.find()
    candidats = await cursor.to_list(length=100)
    for c in candidats:
        c["_id"] = str(c["_id"])
    return candidats


@router.get("/admin/recruteurs/")
async def list_recruteurs(admin: dict = Depends(get_current_admin)):
    """Liste tous les recruteurs (réservé aux administrateurs)."""
    cursor = db.recruteurs.find()
    recruteurs = await cursor.to_list(length=100)
    for r in recruteurs:
        r["_id"] = str(r["_id"])
    return recruteurs


@router.delete("/admin/users/{role}/{user_id}")
async def supprimer_utilisateur(
    role: str,
    user_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Supprime un utilisateur (candidat ou recruteur) et ses fichiers GridFS associés."""
    if role not in ("candidat", "recruteur"):
        raise HTTPException(status_code=400, detail="Role invalide. Utilisez 'candidat' ou 'recruteur'.")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID utilisateur invalide.")

    collection = db.candidats if role == "candidat" else db.recruteurs
    user = await collection.find_one({"_id": oid})
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    # Suppression des fichiers GridFS associés
    file_fields = ["logo_id", "carteHandicap_id", "cv_id"]
    for field in file_fields:
        file_id = user.get(field)
        if file_id and ObjectId.is_valid(str(file_id)):
            try:
                await fs.delete(ObjectId(file_id))
            except Exception:
                pass

    await collection.delete_one({"_id": oid})
    return {"message": f"{role.capitalize()} supprimé avec succès."}
