/*
 * Public client-side application configuration.
 *
 * IMPORTANT:
 * A Google Maps JavaScript API key used by a browser cannot be made secret.
 * Keep it restricted by:
 *   1. HTTP referrer/domain
 *   2. Only the Google APIs this application needs
 */
export const CONFIG = {
  GOOGLE_MAPS_API_KEY:
    "AIzaSyA8vvicZvFlziIaZp2rybPIY0eQM3IwlxU",

  PARCEL_LAYER_URL:
    "https://pro.paynecountyassessor.org/arcgis/rest/services/PayneParcels_2025/MapServer/0",

  PROPERTY_URL_BASE:
    "https://property.spatialest.com/ok/payne/#/property/",

  PAYNE_BOUNDARY_URL:
    "Payne.geojson",

  fields: {
    address: "STFULLNAME",
    owner: "Owner1",
    yearBuilt: "YearBuilt",
    totalValue: "TotalValue",
    propertyId: "PropertyID"
  },

  popupFields: [
    "STFULLNAME",
    "Owner1",
    "YearBuilt",
    "TotalValue",
    "PC_URL"
  ],

  linkFields: [
    "PC_URL"
  ],

  currencyFields: [
    "TotalValue"
  ],

  // Live ArcGIS parcel query window around the Street View camera.
  parcelQueryRadiusFeet: 500,

  // Changed live by the UI slider.
  vicinityBufferFeet: 80,

  // Maximum floating parcel labels shown simultaneously.
  maxLabels: 8,

  // Google Street View lookup radius, in meters.
  streetViewSearchRadius: 100
};
