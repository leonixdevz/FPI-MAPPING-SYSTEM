# Study-area boundary file

This folder is where the app looks for the real survey boundary.

## How to wire in the boundary

1. Export / convert your survey boundary to **WGS84 GeoJSON** and save it
   here as **`study-area-boundary.geojson`**.
2. Refresh the app — no code changes or rebuild needed.

The map then:

- draws the polygon over the study area (teal outline + fill),
- auto-frames the map to the boundary,
- shows a banner with the area **computed from the polygon** (kept
  separate from the documented 898.116 ha value),
- replaces the amber "temporary map centre" banner once the file loads.

## Accepted formats

Any of: `Polygon`, `MultiPolygon`, `Feature` (with a polygon geometry),
or `FeatureCollection` (one or more polygon features). Positions must be
`[lng, lat]` in WGS84 (EPSG:4326), per the GeoJSON spec.

If your source data uses another projection (e.g. UTM), convert it first:

```bash
# KML → WGS84 GeoJSON
ogr2ogr -f GeoJSON study-area-boundary.geojson input.kml

# Shapefile (EPSG:32631 example) → WGS84 GeoJSON
ogr2ogr -f GeoJSON -t_srs EPSG:4326 study-area-boundary.geojson input.shp
```

QGIS also works: open the layer → right-click → *Export → Save Features
As…* → format GeoJSON, CRS WGS 84 (EPSG:4326).

## Anti-fabrication note

No placeholder polygon is shipped here, and none should be added. Per
the project spec (Sections 20, 35) the 898.116-hectare value is a
documented figure from the brief, not something to be drawn by hand.
Only add a polygon you actually obtained from the survey data.
