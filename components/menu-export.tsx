"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Export et intégration. Les liens portent les filtres courants : on télécharge
 * exactement ce qui est affiché, et le code iframe reproduit la même vue.
 */
export default function MenuExport({ parametres }: { parametres: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const suffixe = parametres ? `&${parametres}` : "";
  const requeteEmbed = parametres ? `?${parametres}` : "";

  useEffect(() => {
    if (!ouvert) return;

    const auClic = (evenement: MouseEvent) => {
      if (!conteneurRef.current?.contains(evenement.target as Node)) setOuvert(false);
    };
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setOuvert(false);
    };

    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  const codeEmbed =
    typeof window === "undefined"
      ? ""
      : `<iframe src="${window.location.origin}/embed${requeteEmbed}" width="100%" height="480" style="border:0" loading="lazy" title="Baklouti — Cartographie des acteurs du piment en Tunisie"></iframe>`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(codeEmbed);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((precedent) => !precedent)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ardoise-700 transition-colors hover:bg-ardoise-100"
      >
        Exporter
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-1 w-72 rounded-xl border border-ardoise-200 bg-white p-2 shadow-xl"
        >
          <a
            role="menuitem"
            href={`/api/export?format=csv${suffixe}`}
            className="block rounded-lg px-3 py-2 text-sm text-ardoise-900 hover:bg-ardoise-50"
          >
            <span className="font-medium">CSV</span>
            <span className="block text-xs text-ardoise-500">Tableur (Excel, LibreOffice)</span>
          </a>
          <a
            role="menuitem"
            href={`/api/export?format=geojson${suffixe}`}
            className="block rounded-lg px-3 py-2 text-sm text-ardoise-900 hover:bg-ardoise-50"
          >
            <span className="font-medium">GeoJSON</span>
            <span className="block text-xs text-ardoise-500">SIG (QGIS, Leaflet, PostGIS)</span>
          </a>

          <hr className="my-2 border-ardoise-100" />

          <div className="px-3 py-1">
            <p className="text-xs font-medium text-ardoise-700">Intégrer cette vue</p>
            <p className="mt-0.5 text-xs text-ardoise-500">
              Iframe reprenant les filtres actuels.
            </p>
            <button
              type="button"
              onClick={copier}
              className="mt-2 w-full rounded-lg border border-ardoise-200 px-2.5 py-1.5 text-xs font-medium text-ardoise-700 transition-colors hover:bg-ardoise-50"
            >
              {copie ? "Code copié ✓" : "Copier le code d’intégration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
