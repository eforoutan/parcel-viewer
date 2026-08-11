import { CONFIG } from "./config.js";

import {
  initAddressSearch,
  initMap,
  loadPayneBoundary
} from "./map.js";

import {
  refreshLabels
} from "./parcels.js";

import {
  initStreetView,
  openStreetViewAt
} from "./streetview.js";

import {
  initUi,
  setStatus
} from "./ui.js";


/* ============================================================
   APPLICATION BOOTSTRAP
   ============================================================ */

async function initApp() {
  initMap(
    openStreetViewAt
  );

  initStreetView();

  initUi(
    refreshLabels
  );

  await initAddressSearch(
    openStreetViewAt
  );

  loadPayneBoundary();
}


/* ============================================================
   GOOGLE MAPS JAVASCRIPT API LOADER
   ============================================================ */

function loadGoogleMaps() {
  const apiKey =
    CONFIG.GOOGLE_MAPS_API_KEY;

  if (
    !apiKey ||
    apiKey ===
      "YOUR_GOOGLE_MAPS_API_KEY"
  ) {
    setStatus(
      "Add your Google Maps API key in js/config.js."
    );

    return;
  }

  // The Google callback must be global because the API loader
  // calls it by name after the script has loaded.
  window.initParcelViewer =
    initApp;

  const script =
    document.createElement(
      "script"
    );

  script.src =
    "https://maps.googleapis.com/maps/api/js" +
    `?key=${encodeURIComponent(apiKey)}` +
    "&callback=initParcelViewer" +
    "&libraries=geometry" +
    "&loading=async";

  script.async =
    true;

  script.onerror =
    () => {
      setStatus(
        "Failed to load Google Maps. " +
        "Check the API key, domain restrictions, API restrictions, and billing."
      );
    };

  document.head.appendChild(
    script
  );
}


loadGoogleMaps();
