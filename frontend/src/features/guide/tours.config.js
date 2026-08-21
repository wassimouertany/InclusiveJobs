// tours.config.js
//
// Déclaration statique des visites guidées ("Shadow Guide"). Aucune logique ici :
// juste la liste des étapes par rôle, consommée par ShadowGuideProvider/ShadowGuide.
//
// Forme d'une étape :
//   id            identifiant stable, utilisé par guideStorage pour la progression
//   target        sélecteur CSS `[data-guide="..."]` posé sur le vrai élément du DOM
//   route         chemin React Router où vivre l'étape ; si différent de la route
//                 courante, ShadowGuide navigue avant de chercher la cible
//   title         titre court affiché dans l'en-tête du tooltip
//   body          texte complet (max ~20 mots/phrase, sans jargon)
//   body_simple   variante "langage simplifié" (toggle dans le tooltip)
//   placement     position préférée du tooltip par rapport à la cible
//   actionHint    micro-texte d'action affiché sous le corps ("Cliquez sur…")
//   locked        optionnel — si true, le tooltip affiche un aperçu grisé de la
//                 cible et un bouton vers l'abonnement à la place de "Suivant"

export const TOURS = {
  candidat_onboarding: {
    version: 1,
    role: "candidat",
    steps: [
      {
        id: "a11y_widget",
        target: "[data-guide='a11y_widget']",
        route: "/dashboard/candidate/home",
        title: "Adaptez votre confort de lecture",
        body: "Ce bouton ouvre les réglages d'accessibilité : taille du texte, contrastes, curseur, et plus encore.",
        body_simple: "Ce bouton change l'affichage : texte plus grand, couleurs plus lisibles, curseur plus visible.",
        placement: "left",
        actionHint: "Disponible sur toutes les pages, à tout moment.",
      },
      {
        id: "cv_upload",
        target: "[data-guide='cv_upload']",
        route: "/dashboard/candidate/profile",
        title: "Téléversez votre CV et votre carte",
        body: "Dans l'onglet Documents, ajoutez votre CV en PDF et votre carte de personnes à besoins spécifiques.",
        body_simple: "Cliquez ici pour ajouter votre CV et votre carte de besoins spécifiques.",
        placement: "bottom",
        actionHint: "Cliquez sur l'onglet Documents pour continuer.",
      },
      {
        id: "ai_profile_review",
        target: "[data-guide='ai_profile_review']",
        route: "/dashboard/candidate/profile",
        title: "Votre profil enrichi par l'IA",
        body: "Notre IA lit votre CV pour préremplir vos informations. Vous vérifiez et corrigez toujours ce qui est affiché ici.",
        body_simple: "L'IA remplit vos informations pour vous. Vous pouvez tout vérifier et tout changer ici.",
        placement: "bottom",
        actionHint: "Vous gardez le contrôle : rien n'est enregistré sans votre validation.",
      },
      {
        id: "accessibility_needs",
        target: "[data-guide='accessibility_needs']",
        route: "/dashboard/candidate/profile",
        title: "Vos besoins et aménagements",
        body: "Décrivez vos besoins spécifiques et choisissez les aménagements de travail qui vous conviennent.",
        body_simple: "Dites-nous vos besoins. Choisissez les aménagements qui vous aident au travail.",
        placement: "bottom",
        actionHint: "Cliquez sur l'onglet Accessibilité pour continuer.",
      },
      {
        id: "match_score",
        target: "[data-guide='match_score']",
        route: "/dashboard/candidate/home",
        title: "Votre score de compatibilité",
        body: "Chaque offre reçoit un score et une explication claire de l'IA sur vos points forts pour ce poste.",
        body_simple: "Un score indique si l'offre vous correspond. Une explication accompagne chaque score.",
        placement: "top",
        actionHint: "Cliquez sur \"Get AI Recommendations\" si aucune suggestion n'est encore affichée.",
      },
      {
        id: "apply_track",
        target: "[data-guide='apply_track']",
        route: "/dashboard/candidate/home",
        title: "Postulez et suivez votre candidature",
        body: "Postulez directement depuis une offre, puis suivez ici l'avancement de chaque candidature envoyée.",
        body_simple: "Cliquez sur Postuler pour envoyer votre candidature. Suivez son état ici.",
        placement: "top",
        actionHint: "Retrouvez l'historique complet dans l'onglet Applications.",
      },
    ],
  },

  recruteur_onboarding: {
    version: 1,
    role: "recruteur",
    steps: [
      {
        id: "recruiter_headcount",
        target: "[data-guide='recruiter_headcount']",
        route: "/dashboard/recruiter",
        title: "L'effectif de votre entreprise",
        body: "Ce chiffre indique le nombre de personnes à besoins spécifiques déjà employées dans votre entreprise.",
        body_simple: "Ce nombre montre combien de personnes à besoins spécifiques travaillent déjà chez vous.",
        placement: "bottom",
        actionHint: "Modifiable depuis votre profil entreprise.",
      },
      {
        id: "offer_accommodations",
        target: "[data-guide='offer_accommodations']",
        route: "/dashboard/recruiter/jobs",
        title: "Publiez une offre inclusive",
        body: "En créant une offre, décrivez les aménagements que vous pouvez proposer aux personnes à besoins spécifiques.",
        body_simple: "Créez une offre. Dites quels aménagements vous pouvez proposer.",
        placement: "bottom",
        actionHint: "Le champ \"Possible Accommodations\" du formulaire est fait pour ça.",
      },
      {
        id: "top5_candidates",
        target: "[data-guide='top5_candidates']",
        route: "/dashboard/recruiter/jobs",
        title: "Vos 5 meilleurs candidats",
        body: "Pour chaque offre, l'IA classe les 5 candidats les plus compatibles avec leur score et son explication.",
        body_simple: "L'IA choisit les 5 meilleurs candidats pour votre offre, avec un score pour chacun.",
        placement: "right",
        actionHint: "Cliquez sur \"AI Match\" depuis une offre pour lancer l'analyse.",
      },
    ],
  },
};

export default TOURS;
