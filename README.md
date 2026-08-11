# Parcel Viewer

## Repository structure

```text
parcel-viewer/
├── index.html
├── Payne.geojson
├── css/
│   └── styles.css
└── js/
    ├── config.js
    ├── app.js
    ├── map.js
    ├── parcels.js
    ├── streetview.js
    └── ui.js
```

`Payne.geojson` is your existing Payne County boundary file and should remain
at the repository root beside `index.html`.

## File responsibilities

- `index.html`: page structure only
- `css/styles.css`: all visual styling
- `js/config.js`: public browser configuration, URLs, field names, and defaults
- `js/app.js`: application startup and Google Maps API loader
- `js/map.js`: left Google Map, address search, county overlay, map marker
- `js/parcels.js`: Payne County ArcGIS REST queries and Street View parcel labels
- `js/streetview.js`: Google Street View initialization and navigation
- `js/ui.js`: parcel details, popup, status messages, formatting, vicinity slider

## Google Maps API key

The Maps JavaScript API key is client-side and therefore visible to the browser.
Its security comes from HTTP-referrer/domain restrictions and API restrictions.
