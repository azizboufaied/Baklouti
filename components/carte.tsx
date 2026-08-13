"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { couleurCategorie } from "@/lib/categories";
import type { Structure } from "@/lib/types";

/**
 * Carte Leaflet pilotée directement par l'API vanilla.
 *
 * Ce composant doit être importé dynamiquement avec `ssr: false` : Leaflet
 * touche `window` dès son chargement et ne peut pas être rendu côté serveur.
 */

// Cadre de la Tunisie : sert de vue par défaut et de garde-fou au dézoom.
const ETENDUE_TUNISIE = L.latLngBounds([30.1, 7.4], [37.6, 11.7]);

// Zoom retenu à la sélection : assez proche pour situer le quartier, assez large
// pour garder les repères alentour.
const ZOOM_SELECTION = 13;

type Props = {
  structures: Structure[];
  selectionId: number | null;
  onSelection: (id: number | null) => void;
  interactive?: boolean;
};

function iconeStructure(structure: Structure, actif: boolean): L.DivIcon {
  const couleur = couleurCategorie(structure.activites[0]?.categorie ?? "");
  const taille = actif ? 24 : 18;

  return L.divIcon({
    className: `marqueur-pastille${actif ? " est-actif" : ""}`,
    html: `<span style="background:${couleur}"></span>`,
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
    popupAnchor: [0, -taille / 2],
  });
}

export default function Carte({ structures, selectionId, onSelection, interactive = true }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<L.Map | null>(null);
  const amasRef = useRef<L.MarkerClusterGroup | null>(null);
  const marqueursRef = useRef<Map<number, L.Marker>>(new Map());

  // `onSelection` change à chaque rendu du parent ; on la lit via une ref pour
  // ne pas reconstruire tous les marqueurs à cause d'une nouvelle référence.
  const onSelectionRef = useRef(onSelection);
  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  // -- Initialisation (une seule fois) -------------------------------------
  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    const carte = L.map(conteneurRef.current, {
      center: ETENDUE_TUNISIE.getCenter(),
      zoom: 7,
      minZoom: 6,
      maxBounds: ETENDUE_TUNISIE.pad(0.7),
      maxBoundsViscosity: 0.6,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(carte);

    if (interactive) L.control.scale({ imperial: false }).addTo(carte);

    const amas = L.markerClusterGroup({
      maxClusterRadius: 38,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      // Plusieurs structures partagent une adresse (Chott Mariem, Mégrine) :
      // sans « spiderfy » leurs pastilles se superposeraient exactement.
      spiderfyDistanceMultiplier: 1.6,
      iconCreateFunction: (groupe) =>
        L.divIcon({
          className: "amas-marqueurs",
          html: `<span>${groupe.getChildCount()}</span>`,
          iconSize: [34, 34],
        }),
    });
    carte.addLayer(amas);

    // Cliquer sur le fond ferme le panneau de détail.
    carte.on("click", () => onSelectionRef.current(null));

    carteRef.current = carte;
    amasRef.current = amas;

    const marqueurs = marqueursRef.current;

    return () => {
      carte.remove();
      carteRef.current = null;
      amasRef.current = null;
      marqueurs.clear();
    };
  }, [interactive]);

  // -- Synchronisation des marqueurs avec les filtres -----------------------
  useEffect(() => {
    const carte = carteRef.current;
    const amas = amasRef.current;
    if (!carte || !amas) return;

    amas.clearLayers();
    marqueursRef.current.clear();

    const positions: L.LatLngExpression[] = [];

    for (const structure of structures) {
      if (structure.lat === null || structure.lng === null) continue;

      const position: L.LatLngExpression = [structure.lat, structure.lng];
      positions.push(position);

      const marqueur = L.marker(position, {
        icon: iconeStructure(structure, structure.id === selectionId),
        title: structure.nom,
        alt: structure.nom,
        riseOnHover: true,
      });

      marqueur.bindTooltip(structure.sigle ?? structure.nom, {
        direction: "top",
        offset: [0, -10],
      });
      marqueur.on("click", (evenement) => {
        L.DomEvent.stopPropagation(evenement);
        onSelectionRef.current(structure.id);
      });

      marqueursRef.current.set(structure.id, marqueur);
      amas.addLayer(marqueur);
    }

    if (positions.length > 0) {
      carte.fitBounds(L.latLngBounds(positions).pad(0.2), { maxZoom: 11, animate: false });
    } else {
      carte.fitBounds(ETENDUE_TUNISIE, { animate: false });
    }
    // `selectionId` est volontairement absent : la sélection ne doit pas
    // reconstruire les marqueurs ni recadrer la vue (effet suivant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structures]);

  // -- Mise en avant de la structure sélectionnée ---------------------------
  useEffect(() => {
    const carte = carteRef.current;
    const amas = amasRef.current;
    if (!carte || !amas) return;

    for (const [id, marqueur] of marqueursRef.current) {
      const structure = structures.find((candidate) => candidate.id === id);
      if (structure) marqueur.setIcon(iconeStructure(structure, id === selectionId));
    }

    if (selectionId === null) return;

    const marqueur = marqueursRef.current.get(selectionId);
    if (!marqueur) return;

    // Plusieurs structures partagent des coordonnées identiques (CRRHAB et ISA
    // à Chott Mariem, UNISEM et Cotugrain à Mégrine). `zoomToShowLayer` zoomerait
    // jusqu'au niveau maximal sans jamais les séparer : on se cale sur un zoom
    // lisible, puis on déploie l'amas en éventail pour révéler le marqueur.
    let traite = false;
    const revelerMarqueur = () => {
      if (traite) return;
      traite = true;
      // `getVisibleParent` est typé `Marker` alors qu'il renvoie le `MarkerCluster`
      // conteneur quand le marqueur est regroupé.
      const parent = amas.getVisibleParent(marqueur) as L.Marker | L.MarkerCluster | null;
      if (parent && parent !== marqueur && "spiderfy" in parent) {
        parent.spiderfy();
      }
    };

    carte.setView(marqueur.getLatLng(), Math.max(carte.getZoom(), ZOOM_SELECTION), {
      animate: true,
    });

    // `animationend` du groupe d'amas signale que le regroupement du nouveau
    // zoom est calculé — avant cela, `getVisibleParent` renvoie un amas périmé.
    // Le délai prend le relais quand la vue ne bouge pas (marqueur déjà centré),
    // cas où aucune animation n'est déclenchée.
    amas.once("animationend", revelerMarqueur);
    const minuterie = window.setTimeout(revelerMarqueur, 700);

    return () => {
      amas.off("animationend", revelerMarqueur);
      window.clearTimeout(minuterie);
    };
  }, [selectionId, structures]);

  return <div ref={conteneurRef} className="h-full w-full" role="application" aria-label="Carte des acteurs du piment" />;
}
