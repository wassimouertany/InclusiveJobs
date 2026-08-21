// useBlockageDetector.js
//
// Aide contextuelle discrète déclenchée sur détection de blocage :
//   - inactivité > 25 s sur une route jugée critique
//   - >= 2 échecs de validation signalés sur le même champ
//   - échec d'upload de CV ou de carte de besoin spécifique
//   - >= 3 allers-retours entre les deux mêmes routes en moins de 60 s
//
// Rendu : une bulle discrète en bas de page (role="status" + aria-live
// "polite"), jamais une modale, jamais de vol de focus. Anti-agacement
// strict : un déclenchement maximum par type et par session ; si fermée deux
// fois, ce type se tait 7 jours (persisté via guideStorage) ; jamais pendant
// une saisie active ; toujours respecté si l'utilisateur a demandé "ne plus
// me proposer d'aide".
//
// Les échecs de formulaire/upload ne sont pas observables depuis ce module
// (ils vivent dans des pages hors de features/guide/) : `emitGuideBlockage`
// est le petit bus d'événements que ces pages utilisent pour les signaler,
// sans que ce module ait besoin de les importer.
//
// Pure logique ici, aucun JSX : le composant `BlockageBubble` qui rend la
// bulle vit dans BlockageBubble.jsx (séparé pour rester une extension .js,
// comme demandé, puisque le bundler exige .jsx dès qu'un fichier contient
// du JSX).

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getBlockageOptOut,
  isBlockageTypeCoolingDown,
  recordBlockageDismissal,
  setBlockageOptOut,
} from "./guideStorage";

export const BLOCKAGE_EVENT = "ij-guide:blockage";

/** Call from anywhere (no import of this hook needed) to report a blockage
 * signal, e.g. `emitGuideBlockage("upload_failure")` or
 * `emitGuideBlockage("form_error", { field: "phone_number" })`. */
export function emitGuideBlockage(type, meta) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(BLOCKAGE_EVENT, { detail: { type, meta } }));
  } catch {
    // CustomEvent unsupported — silently skip, never break the caller's flow.
  }
}

const CRITICAL_ROUTES = [
  "/dashboard/candidate/profile",
  "/dashboard/candidate/find-jobs",
  "/dashboard/recruiter/jobs",
];

const INACTIVITY_MS = 25_000;
const PINGPONG_WINDOW_MS = 60_000;
const PINGPONG_MIN_HOPS = 3; // 3 aller-retours = 4 changements de route mini

const MESSAGES = {
  inactivity:
    "Besoin d'aide pour continuer sur cette page ? Le guide reste disponible à tout moment.",
  form_errors: "Ce champ semble poser problème. Le guide peut vous montrer comment le remplir.",
  upload_failure: "Le fichier n'a pas pu être envoyé. Vérifiez qu'il s'agit d'un PDF ou d'une image.",
  route_pingpong: "Vous naviguez beaucoup entre ces deux pages. Besoin d'un coup de main ?",
};

// Session-scoped: resets on a full page reload, which is exactly the "par
// session" boundary asked for. Module scope on purpose, so it survives
// remounts of the component tree without becoming a new "session".
const firedTypesThisSession = new Set();

function isTypingActive() {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

export function useBlockageDetector() {
  const location = useLocation();
  const [active, setActive] = useState(null); // { type, message } | null
  const optedOutRef = useRef(false);
  const lastInteractionRef = useRef(Date.now());
  const routeHistoryRef = useRef([]); // [{ path, time }]
  const fieldFailureCountsRef = useRef({});

  useEffect(() => {
    try {
      optedOutRef.current = getBlockageOptOut();
    } catch {
      optedOutRef.current = false;
    }
  }, []);

  const tryFire = useCallback(
    (type) => {
      if (optedOutRef.current) return;
      if (active) return; // one bubble on screen at a time
      if (firedTypesThisSession.has(type)) return;
      if (isBlockageTypeCoolingDown(type)) return;
      if (isTypingActive()) return;
      firedTypesThisSession.add(type);
      setActive({ type, message: MESSAGES[type] || "" });
    },
    [active]
  );

  // ---- Inactivity on a critical route ------------------------------------
  useEffect(() => {
    const bump = () => {
      lastInteractionRef.current = Date.now();
    };
    window.addEventListener("mousemove", bump, { passive: true });
    window.addEventListener("keydown", bump);
    window.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("touchstart", bump, { passive: true });
    lastInteractionRef.current = Date.now();

    const isCritical = CRITICAL_ROUTES.some((r) => location.pathname.startsWith(r));
    let intervalId;
    if (isCritical) {
      intervalId = window.setInterval(() => {
        if (Date.now() - lastInteractionRef.current >= INACTIVITY_MS) {
          tryFire("inactivity");
        }
      }, 2000);
    }
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("scroll", bump);
      window.removeEventListener("touchstart", bump);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [location.pathname, tryFire]);

  // ---- Route ping-pong ----------------------------------------------------
  useEffect(() => {
    const now = Date.now();
    const history = [...routeHistoryRef.current, { path: location.pathname, time: now }].filter(
      (entry) => now - entry.time <= PINGPONG_WINDOW_MS
    );
    routeHistoryRef.current = history;
    if (history.length >= PINGPONG_MIN_HOPS + 1) {
      const distinctPaths = new Set(history.map((h) => h.path));
      if (distinctPaths.size === 2) {
        tryFire("route_pingpong");
      }
    }
  }, [location.pathname, tryFire]);

  // ---- External signals: form validation failures / upload failures ------
  useEffect(() => {
    const onBlockage = (event) => {
      const detail = event.detail || {};
      if (detail.type === "upload_failure") {
        tryFire("upload_failure");
        return;
      }
      if (detail.type === "form_error" && detail.meta?.field) {
        const counts = fieldFailureCountsRef.current;
        const field = detail.meta.field;
        counts[field] = (counts[field] || 0) + 1;
        if (counts[field] >= 2) {
          tryFire("form_errors");
        }
      }
    };
    window.addEventListener(BLOCKAGE_EVENT, onBlockage);
    return () => window.removeEventListener(BLOCKAGE_EVENT, onBlockage);
  }, [tryFire]);

  // Never interrupt an active input: if the bubble is showing and the user
  // starts typing anywhere, hide it without counting it as a dismissal.
  useEffect(() => {
    if (!active) return undefined;
    const onFocusIn = () => {
      if (isTypingActive()) setActive(null);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [active]);

  const dismiss = useCallback(() => {
    if (!active) return;
    recordBlockageDismissal(active.type);
    setActive(null);
  }, [active]);

  const optOut = useCallback(() => {
    optedOutRef.current = true;
    setBlockageOptOut(true);
    setActive(null);
  }, []);

  return { active, dismiss, optOut };
}

export default useBlockageDetector;
