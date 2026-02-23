from datetime import datetime
from enum import Enum
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Genre(str, Enum):
    HOMME = "homme"
    FEMME = "femme"


class NiveauAcademique(str, Enum):
    AUCUN_DIPLOME = "aucun_diplome"
    FORMATION_PROFESSIONNELLE = "formation_professionnelle"
    BACCALAUREAT = "baccalaureat"
    LICENCE = "licence"
    MASTER = "master"
    DIPLOME_INGENIEUR = "diplome_ingenieur"
    DOCTORAT = "doctorat"
    AUTRES_DIPLOMES = "autres_diplomes"

class TypeHandicap(str, Enum):
    MOTEUR = "moteur"
    VISUEL = "visuel"
    AUDITIF = "auditif"
    COGNITIF = "cognitif"
    PSYCHOLOGIQUE = "psychologique"
    AUTRE = "autre"


class PreferenceTravail(str, Enum):
    TELETRAVAIL_TOTAL = "teletravail_total"
    TELETRAVAIL_PARTIEL = "teletravail_partiel"
    SUR_SITE = "sur_site"
    HORAIRES_FLEXIBLES = "horaires_flexibles"
    TEMPS_PARTIEL = "temps_partiel"


class StatutDisponibilite(str, Enum):
    EN_RECHERCHE = "en_recherche"
    NON_DISPONIBLE = "non_disponible"


class Role(str, Enum):
    RECRUTEUR = "RECRUTEUR"
    CANDIDAT = "CANDIDAT"
    ADMIN = "ADMIN"


class LoginRequest(BaseModel):
    """Modèle pour la requête de connexion (body JSON)."""
    email: str
    motDePasse: str


class CandidatDB(BaseModel):
    """Modèle représentant un candidat stocké dans MongoDB."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.CANDIDAT)
    nom: str
    prenom: str
    email: str
    motDePasse: str
    telephone: str = ""
    adresse: str = ""
    secteur: str = ""
    genre: Genre
    annesExperience: int = 0
    niveauAcademique: NiveauAcademique
    amenagementsTravail: list[str] = Field(default_factory=list)
    titreProfil: str = ""
    competencesCles: list[str] = Field(default_factory=list)
    typeHandicap: TypeHandicap
    besoinAccibilite: str = ""
    preferenceTravail: PreferenceTravail
    statutDisponibilite: StatutDisponibilite

    # Identifiants GridFS pour les fichiers
    logo_id: Optional[str] = None
    carteHandicap_id: Optional[str] = None
    cv_id: Optional[str] = None

    dateCreation: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convertit ObjectId MongoDB en str pour le champ id."""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class RecruteurDB(BaseModel):
    """Modèle représentant un recruteur stocké dans MongoDB."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.RECRUTEUR)
    email: str
    motDePasse: str
    nomEntreprise: str
    secteurActivite: str = ""
    telephone: str = ""
    localisation: str = ""
    fondeeDepuis: int = 0
    nombreEmploye: int = 0
    nombreEmployeHandicape: int = 0
    strategieInclusion: str = ""

    # Identifiant GridFS pour le logo
    logo_id: Optional[str] = None

    dateCreation: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convertit ObjectId MongoDB en str pour le champ id."""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class AdminCreate(BaseModel):
    """Modèle pour la requête API de création d'un administrateur."""
    email: str
    motDePasse: str


class AdminDB(BaseModel):
    """Modèle représentant un administrateur stocké dans MongoDB."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.ADMIN)
    email: str
    motDePasse: str
    dateCreation: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convertit ObjectId MongoDB en str pour le champ id."""
        if isinstance(v, ObjectId):
            return str(v)
        return v
