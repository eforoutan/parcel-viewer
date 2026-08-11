import { CONFIG } from "./config.js";

import {
  clearMapLocationMarker,
  setMapLocationMarker
} from "./map.js";

import {
  clearParcelSelection,
  queryNearbyParcels,
  refreshLabels,
  scheduleParcelQuery,
  setParcelPanorama
} from "./parcels.js";

import {
  hideStatus,
  setStatus
} from "./ui.js";


let panorama = null;
let streetViewService = null;
let streetViewReady = false;


/* ============================================================
   STREET VIEW INITIALIZATION
   ============================================================ */

export function initStreetView() {
  panorama =
    new google.maps.StreetViewPanorama(
      document.getElementById(
        "pano"
      ),
      {
        // No default position intentionally.
        pov: {
          heading: 0,
          pitch: 0
        },

        zoom: 1,

        addressControl: true,
        motionTracking: false,
        fullscreenControl: false,
        linksControl: true,
        panControl: true,
        zoomControl: true
      }
    );

  streetViewService =
    new google.maps.StreetViewService();

  setParcelPanorama(
    panorama
  );

  panorama.addListener(
    "pov_changed",
    refreshLabels
  );

  panorama.addListener(
    "zoom_changed",
    refreshLabels
  );

  panorama.addListener(
    "pano_changed",
    refreshLabels
  );

  panorama.addListener(
    "position_changed",
    () => {
      if (!streetViewReady) {
        return;
      }

      const position =
        panorama.getPosition();

      if (!position) {
        return;
      }

      setMapLocationMarker(
        position
      );

      scheduleParcelQuery(
        position
      );
    }
  );

  return panorama;
}


/* ============================================================
   MAP/SEARCH SELECTION -> STREET VIEW
   ============================================================ */

export function openStreetViewAt(
  latLng
) {
  if (
    !streetViewService ||
    !latLng
  ) {
    return;
  }

  setStatus(
    "Looking for nearby Street View…"
  );

  clearParcelSelection();
  clearMapLocationMarker();

  setMapLocationMarker(
    latLng
  );

  streetViewService.getPanorama(
    {
      location: latLng,

      radius:
        CONFIG.streetViewSearchRadius,

      source:
        google.maps
          .StreetViewSource
          .OUTDOOR
    },

    (data, status) => {
      if (
        status !==
          google.maps
            .StreetViewStatus
            .OK ||

        !data ||
        !data.location
      ) {
        setStatus(
          "No Street View found within " +
          CONFIG.streetViewSearchRadius +
          " m. Try another street."
        );

        return;
      }

      streetViewReady =
        true;

      document
        .getElementById(
          "streetPlaceholder"
        )
        .classList
        .add("hidden");

      document
        .getElementById("pano")
        .style
        .visibility =
          "visible";

      panorama.setPano(
        data.location.pano
      );

      const panoPosition =
        data.location.latLng;

      const heading =
        google.maps.geometry.spherical
          .computeHeading(
            panoPosition,
            latLng
          );

      panorama.setPov({
        heading:
          Number.isFinite(heading)
            ? heading
            : 0,

        pitch: 0
      });

      panorama.setZoom(1);

      setMapLocationMarker(
        panoPosition
      );

      hideStatus();

      window.setTimeout(
        () => {
          const currentPosition =
            panorama.getPosition();

          if (currentPosition) {
            queryNearbyParcels(
              currentPosition,
              true
            );
          }
        },
        150
      );
    }
  );
}
