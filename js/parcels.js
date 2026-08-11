import { CONFIG } from "./config.js";

import {
  closePopup,
  fmtCurrencyText,
  hideStatus,
  resetDetailPanel,
  setStatus,
  showDetail,
  showPopup
} from "./ui.js";


let panorama = null;

let centroids = [];
const labels =
  new Map();

let parcelQueryTimer = null;
let parcelQuerySequence = 0;
let lastParcelQueryPosition = null;


/* ============================================================
   PUBLIC SETUP
   ============================================================ */

export function setParcelPanorama(
  streetViewPanorama
) {
  panorama =
    streetViewPanorama;
}


/* ============================================================
   DISTANCE HELPERS
   ============================================================ */

function feetToMeters(feet) {
  return feet * 0.3048;
}


/* ============================================================
   ARCGIS ATTRIBUTE HELPERS
   ============================================================ */

function getAttributeCaseInsensitive(
  attributes,
  wantedName
) {
  if (
    !attributes ||
    !wantedName
  ) {
    return null;
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        attributes,
        wantedName
      )
  ) {
    return attributes[
      wantedName
    ];
  }

  const wanted =
    String(wantedName)
      .toLowerCase();

  for (
    const key
    of Object.keys(attributes)
  ) {
    if (
      key.toLowerCase() ===
      wanted
    ) {
      return attributes[key];
    }
  }

  return null;
}


function normalizeParcelAttributes(
  attributes
) {
  const props = {
    ...(attributes || {})
  };

  const address =
    getAttributeCaseInsensitive(
      attributes,
      CONFIG.fields.address
    );

  const owner =
    getAttributeCaseInsensitive(
      attributes,
      CONFIG.fields.owner
    ) ??
    getAttributeCaseInsensitive(
      attributes,
      "OWNERNAME"
    );

  const yearBuilt =
    getAttributeCaseInsensitive(
      attributes,
      CONFIG.fields.yearBuilt
    );

  const totalValue =
    getAttributeCaseInsensitive(
      attributes,
      CONFIG.fields.totalValue
    ) ??
    getAttributeCaseInsensitive(
      attributes,
      "MARKET_VAL"
    );

  const propertyId =
    getAttributeCaseInsensitive(
      attributes,
      CONFIG.fields.propertyId
    );

  props[
    CONFIG.fields.address
  ] = address;

  props[
    CONFIG.fields.owner
  ] = owner;

  props[
    CONFIG.fields.yearBuilt
  ] = yearBuilt;

  props[
    CONFIG.fields.totalValue
  ] = totalValue;

  props[
    CONFIG.fields.propertyId
  ] = propertyId;

  const cleanPropertyId =
    propertyId == null
      ? ""
      : String(propertyId)
          .trim();

  props.PC_URL =
    cleanPropertyId
      ? (
          CONFIG.PROPERTY_URL_BASE +
          encodeURIComponent(
            cleanPropertyId
          )
        )
      : "";

  return props;
}


/* ============================================================
   ESRI POLYGON CENTROID
   ============================================================ */

function centroidOfEsriPolygon(
  geometry
) {
  if (
    !geometry ||
    !Array.isArray(
      geometry.rings
    )
  ) {
    return null;
  }

  let lngSum = 0;
  let latSum = 0;
  let n = 0;

  for (
    const ring
    of geometry.rings
  ) {
    if (!Array.isArray(ring)) {
      continue;
    }

    for (
      const point
      of ring
    ) {
      if (
        !Array.isArray(point) ||
        point.length < 2
      ) {
        continue;
      }

      const lng =
        Number(point[0]);

      const lat =
        Number(point[1]);

      if (
        !Number.isFinite(lng) ||
        !Number.isFinite(lat)
      ) {
        continue;
      }

      lngSum += lng;
      latSum += lat;
      n++;
    }
  }

  if (!n) {
    return null;
  }

  const lng =
    lngSum / n;

  const lat =
    latSum / n;

  if (
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return {
    lng,
    lat
  };
}


/* ============================================================
   QUERY GEOMETRY
   ============================================================ */

function buildQueryEnvelope(
  position,
  radiusFeet
) {
  const lat =
    typeof position.lat ===
    "function"
      ? position.lat()
      : Number(position.lat);

  const lng =
    typeof position.lng ===
    "function"
      ? position.lng()
      : Number(position.lng);

  const radiusMeters =
    feetToMeters(
      radiusFeet
    );

  const latitudeDegrees =
    radiusMeters / 111320;

  const cosLatitude =
    Math.max(
      0.01,
      Math.cos(
        lat *
        Math.PI /
        180
      )
    );

  const longitudeDegrees =
    radiusMeters /
    (
      111320 *
      cosLatitude
    );

  return {
    xmin:
      lng - longitudeDegrees,

    ymin:
      lat - latitudeDegrees,

    xmax:
      lng + longitudeDegrees,

    ymax:
      lat + latitudeDegrees
  };
}


/* ============================================================
   LIVE PARCEL QUERY
   ============================================================ */

export function scheduleParcelQuery(
  position
) {
  if (
    !panorama ||
    !position
  ) {
    return;
  }

  window.clearTimeout(
    parcelQueryTimer
  );

  parcelQueryTimer =
    window.setTimeout(
      () => {
        queryNearbyParcels(
          position
        );
      },
      220
    );
}


export async function queryNearbyParcels(
  position,
  force = false
) {
  if (
    !panorama ||
    !position
  ) {
    return;
  }

  const lat =
    typeof position.lat ===
    "function"
      ? position.lat()
      : Number(position.lat);

  const lng =
    typeof position.lng ===
    "function"
      ? position.lng()
      : Number(position.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return;
  }

  if (
    !force &&
    lastParcelQueryPosition
  ) {
    const previous =
      new google.maps.LatLng(
        lastParcelQueryPosition.lat,
        lastParcelQueryPosition.lng
      );

    const current =
      new google.maps.LatLng(
        lat,
        lng
      );

    const movedMeters =
      google.maps.geometry.spherical
        .computeDistanceBetween(
          previous,
          current
        );

    // Roughly 10 feet.
    if (movedMeters < 3) {
      refreshLabels();
      return;
    }
  }

  lastParcelQueryPosition = {
    lat,
    lng
  };

  const requestSequence =
    ++parcelQuerySequence;

  const envelope =
    buildQueryEnvelope(
      {
        lat,
        lng
      },
      CONFIG.parcelQueryRadiusFeet
    );

  const params =
    new URLSearchParams({
      f: "json",
      where: "1=1",

      geometry: [
        envelope.xmin,
        envelope.ymin,
        envelope.xmax,
        envelope.ymax
      ].join(","),

      geometryType:
        "esriGeometryEnvelope",

      inSR:
        "4326",

      spatialRel:
        "esriSpatialRelIntersects",

      outFields:
        "*",

      returnGeometry:
        "true",

      outSR:
        "4326",

      returnZ:
        "false",

      returnM:
        "false"
    });

  const queryUrl =
    CONFIG.PARCEL_LAYER_URL +
    "/query?" +
    params.toString();

  setStatus(
    "Loading nearby parcel data…"
  );

  try {
    const response =
      await fetch(
        queryUrl,
        {
          method: "GET",
          mode: "cors"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Parcel service returned HTTP " +
        response.status
      );
    }

    const data =
      await response.json();

    if (data?.error) {
      throw new Error(
        data.error.message ||
        "ArcGIS parcel query failed."
      );
    }

    // Ignore stale responses.
    if (
      requestSequence !==
      parcelQuerySequence
    ) {
      return;
    }

    ingestArcgisFeatures(
      Array.isArray(
        data.features
      )
        ? data.features
        : []
    );

    hideStatus();
  }
  catch (error) {
    console.error(
      "Payne County parcel query failed:",
      error
    );

    if (
      requestSequence ===
      parcelQuerySequence
    ) {
      centroids = [];
      clearLabelElements();

      setStatus(
        "Could not load Payne County parcel data: " +
        error.message
      );
    }
  }
}


function ingestArcgisFeatures(
  features
) {
  centroids = [];

  clearLabelElements();

  for (
    const feature
    of features
  ) {
    if (
      !feature ||
      !feature.geometry
    ) {
      continue;
    }

    const c =
      centroidOfEsriPolygon(
        feature.geometry
      );

    if (!c) {
      continue;
    }

    const props =
      normalizeParcelAttributes(
        feature.attributes || {}
      );

    centroids.push({
      c,
      props
    });
  }

  console.log(
    "Live Payne parcel query:",
    features.length,
    "features ->",
    centroids.length,
    "usable parcel centroids"
  );

  refreshLabels();
}


/* ============================================================
   LABEL PROJECTION
   ============================================================ */

function projectToPano(
  position
) {
  if (!panorama) {
    return {
      visible: false
    };
  }

  const camera =
    panorama.getPosition();

  if (!camera) {
    return {
      visible: false
    };
  }

  const pov =
    panorama.getPov();

  const stage =
    document.getElementById(
      "stage"
    );

  const width =
    stage.clientWidth;

  const height =
    stage.clientHeight;

  const target =
    new google.maps.LatLng(
      position.lat,
      position.lng
    );

  const distance =
    google.maps.geometry.spherical
      .computeDistanceBetween(
        camera,
        target
      );

  const hardRadiusMeters =
    feetToMeters(
      CONFIG.parcelQueryRadiusFeet
    );

  if (
    distance >
    hardRadiusMeters
  ) {
    return {
      visible: false,
      dist: distance
    };
  }

  const bearing =
    google.maps.geometry.spherical
      .computeHeading(
        camera,
        target
      );

  let headingDifference =
    bearing -
    pov.heading;

  while (
    headingDifference > 180
  ) {
    headingDifference -= 360;
  }

  while (
    headingDifference < -180
  ) {
    headingDifference += 360;
  }

  const zoom =
    Number.isFinite(pov.zoom)
      ? pov.zoom
      : 1;

  const horizontalFov =
    180 /
    Math.pow(
      2,
      zoom
    );

  if (
    Math.abs(
      headingDifference
    ) >
    horizontalFov / 2
  ) {
    return {
      visible: false,
      dist: distance
    };
  }

  // Approximate label height:
  // 3 meters above street level.
  const targetPitch =
    Math.atan2(
      3,
      Math.max(
        distance,
        1
      )
    ) *
    180 /
    Math.PI;

  const pitchDifference =
    targetPitch -
    pov.pitch;

  const x =
    width / 2 +
    (
      headingDifference /
      (horizontalFov / 2)
    ) *
    (width / 2);

  const verticalFov =
    2 *
    Math.atan(
      Math.tan(
        (horizontalFov / 2) *
        Math.PI /
        180
      ) *
      (height / width)
    ) *
    180 /
    Math.PI;

  const y =
    height / 2 -
    (
      pitchDifference /
      (verticalFov / 2)
    ) *
    (height / 2);

  const visible =
    x >= 0 &&
    x <= width &&
    y > -40 &&
    y < height + 40;

  return {
    x,
    y,
    visible,
    dist: distance
  };
}


/* ============================================================
   ADAPTIVE VICINITY LABELS
   ============================================================ */

export function refreshLabels() {
  if (
    !panorama ||
    !centroids.length
  ) {
    return;
  }

  const camera =
    panorama.getPosition();

  if (!camera) {
    return;
  }

  const labelLayer =
    document.getElementById(
      "labelLayer"
    );

  const hardRadiusMeters =
    feetToMeters(
      CONFIG.parcelQueryRadiusFeet
    );

  const nearby = [];

  for (
    const item
    of centroids
  ) {
    const distance =
      google.maps.geometry.spherical
        .computeDistanceBetween(
          camera,
          new google.maps.LatLng(
            item.c.lat,
            item.c.lng
          )
        );

    if (
      distance <=
      hardRadiusMeters
    ) {
      nearby.push({
        ...item,
        d: distance
      });
    }
  }

  nearby.sort(
    (a, b) =>
      a.d - b.d
  );

  let visibleItems = [];

  if (nearby.length) {
    const nearestDistance =
      nearby[0].d;

    const adaptiveBufferMeters =
      feetToMeters(
        CONFIG.vicinityBufferFeet
      );

    const adaptiveCutoff =
      Math.min(
        hardRadiusMeters,
        nearestDistance +
        adaptiveBufferMeters
      );

    visibleItems =
      nearby
        .filter(
          item =>
            item.d <=
            adaptiveCutoff
        )
        .slice(
          0,
          CONFIG.maxLabels
        );

    console.log(
      "Parcel vicinity:",
      "nearest=",
      nearestDistance.toFixed(1) +
      "m",

      "adaptive buffer=",
      CONFIG.vicinityBufferFeet +
      "ft",

      "cutoff=",
      adaptiveCutoff.toFixed(1) +
      "m",

      "shown=",
      visibleItems.length
    );
  }

  const visibleKeys =
    new Set(
      visibleItems.map(
        item =>
          keyFor(item)
      )
    );

  for (
    const [key, element]
    of labels
  ) {
    if (
      !visibleKeys.has(key)
    ) {
      element.remove();
      labels.delete(key);
    }
  }

  for (
    const item
    of visibleItems
  ) {
    const projection =
      projectToPano(
        item.c
      );

    const key =
      keyFor(item);

    let element =
      labels.get(key);

    if (
      !projection.visible
    ) {
      if (element) {
        element.style.display =
          "none";
      }

      continue;
    }

    if (!element) {
      element =
        createLabelElement(
          item
        );

      labelLayer.appendChild(
        element
      );

      labels.set(
        key,
        element
      );
    }

    element.style.display =
      "block";

    element.style.left =
      projection.x + "px";

    element.style.top =
      projection.y + "px";

    element.style.opacity =
      String(
        Math.max(
          0.55,
          1 -
          projection.dist /
          hardRadiusMeters
        )
      );
  }
}


function createLabelElement(
  item
) {
  const element =
    document.createElement(
      "div"
    );

  element.className =
    "parcel-label";

  const main =
    document.createElement(
      "span"
    );

  main.textContent =
    item.props[
      CONFIG.fields.address
    ] || "Parcel";

  element.appendChild(
    main
  );

  addMetaLine(
    element,
    "Owner",
    item.props[
      CONFIG.fields.owner
    ]
  );

  addMetaLine(
    element,
    "Year Built",
    item.props[
      CONFIG.fields.yearBuilt
    ]
  );

  const totalValue =
    item.props[
      CONFIG.fields.totalValue
    ];

  if (
    totalValue != null &&
    String(totalValue)
      .trim() !== ""
  ) {
    addMetaLine(
      element,
      "Total Value",
      fmtCurrencyText(
        totalValue
      )
    );
  }

  element.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      showDetail(
        item.props
      );

      showPopup(
        item.props,
        projectToPano(
          item.c
        )
      );
    }
  );

  return element;
}


function addMetaLine(
  element,
  label,
  value
) {
  if (
    value == null ||
    String(value)
      .trim() === ""
  ) {
    return;
  }

  const line =
    document.createElement(
      "span"
    );

  line.className =
    "sub";

  const key =
    document.createElement(
      "span"
    );

  key.className =
    "meta-key";

  key.textContent =
    label + ":";

  const content =
    document.createElement(
      "span"
    );

  content.textContent =
    String(value);

  line.appendChild(key);
  line.appendChild(content);

  element.appendChild(line);
}


function keyFor(item) {
  return (
    (
      item.props[
        CONFIG.fields.address
      ] || ""
    ) +
    ":" +
    item.c.lat.toFixed(6) +
    "," +
    item.c.lng.toFixed(6)
  );
}


/* ============================================================
   CLEAR CURRENT PARCEL UI
   ============================================================ */

export function clearParcelSelection() {
  closePopup();

  resetDetailPanel();

  centroids = [];

  lastParcelQueryPosition =
    null;

  clearLabelElements();
}


function clearLabelElements() {
  for (
    const element
    of labels.values()
  ) {
    element.remove();
  }

  labels.clear();
}
