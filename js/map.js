import { CONFIG } from "./config.js";
import { setStatus } from "./ui.js";

let map = null;
let locationMarker = null;


/* ============================================================
   GOOGLE MAP
   ============================================================ */

export function initMap(
  onLocationSelected
) {
  map =
    new google.maps.Map(
      document.getElementById("map"),
      {
        center: {
          lat: 36.1156,
          lng: -97.0586
        },

        zoom: 13,

        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false
      }
    );

  map.addListener(
    "click",
    event => {
      if (!event.latLng) {
        return;
      }

      if (
        typeof onLocationSelected ===
        "function"
      ) {
        onLocationSelected(
          event.latLng
        );
      }
    }
  );

  return map;
}


export function getMap() {
  return map;
}


/* ============================================================
   PAYNE COUNTY BOUNDARY
   ============================================================ */

export function loadPayneBoundary() {
  if (!map) {
    return;
  }

  map.data.setStyle({
    fillColor: "#777777",
    fillOpacity: 0.22,

    strokeColor: "#555555",
    strokeOpacity: 0.85,
    strokeWeight: 1.5,

    // Keep normal map clicks available for Street View.
    clickable: false
  });

  map.data.loadGeoJson(
    CONFIG.PAYNE_BOUNDARY_URL,
    null,
    features => {
      if (
        !features ||
        !features.length
      ) {
        console.warn(
          "Payne.geojson loaded but no features were found."
        );

        return;
      }

      const bounds =
        new google.maps.LatLngBounds();

      for (
        const feature
        of features
      ) {
        feature
          .getGeometry()
          .forEachLatLng(
            latLng =>
              bounds.extend(latLng)
          );
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(
          bounds,
          20
        );
      }

      console.log(
        "Payne County boundary loaded:",
        features.length,
        "feature(s)"
      );
    }
  );
}


/* ============================================================
   GOOGLE ADDRESS SEARCH
   ============================================================ */

export async function initAddressSearch(
  onLocationSelected
) {
  try {
    const {
      PlaceAutocompleteElement
    } =
      await google.maps.importLibrary(
        "places"
      );

    const autocomplete =
      new PlaceAutocompleteElement();

    autocomplete.placeholder =
      "Search an address...";

    autocomplete.includedRegionCodes =
      ["us"];

    const host =
      document.getElementById(
        "addressSearch"
      );

    host.replaceChildren(
      autocomplete
    );

    map.addListener(
      "bounds_changed",
      () => {
        const bounds =
          map.getBounds();

        if (bounds) {
          autocomplete.locationBias =
            bounds;
        }
      }
    );

    autocomplete.addEventListener(
      "gmp-select",
      async event => {
        try {
          const place =
            event
              .placePrediction
              .toPlace();

          await place.fetchFields({
            fields: [
              "displayName",
              "formattedAddress",
              "location",
              "viewport"
            ]
          });

          if (!place.location) {
            setStatus(
              "No map location was returned for that address."
            );

            return;
          }

          if (place.viewport) {
            map.fitBounds(
              place.viewport
            );
          }
          else {
            map.setCenter(
              place.location
            );

            map.setZoom(18);
          }

          if (
            typeof onLocationSelected ===
            "function"
          ) {
            onLocationSelected(
              place.location
            );
          }

        }
        catch (error) {
          console.error(
            "Address selection error:",
            error
          );

          setStatus(
            "Could not open that address. Please try another search."
          );
        }
      }
    );

  }
  catch (error) {
    console.error(
      "Google Places address search failed to initialize:",
      error
    );

    document
      .getElementById("addressSearch")
      .innerHTML =
        '<div style="' +
        'background:white;' +
        'color:#333;' +
        'padding:10px 12px;' +
        'border-radius:4px;' +
        'font-size:13px;">' +
        'Address search unavailable. ' +
        'Enable Places API (New) for this key.' +
        '</div>';
  }
}


/* ============================================================
   STREET VIEW LOCATION MARKER
   ============================================================ */

export function setMapLocationMarker(
  position
) {
  if (!map || !position) {
    return;
  }

  if (!locationMarker) {
    locationMarker =
      new google.maps.Marker({
        position,
        map,

        title:
          "Current Street View location"
      });

    return;
  }

  locationMarker.setPosition(
    position
  );

  if (!locationMarker.getMap()) {
    locationMarker.setMap(
      map
    );
  }
}


export function clearMapLocationMarker() {
  if (locationMarker) {
    locationMarker.setMap(null);
  }
}
