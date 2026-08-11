// Vite + Leaflet default marker images are referenced from Leaflet's CSS
// (`url(images/marker-icon.png)`) and don't resolve through the bundler.
// We re-export the asset URLs from the installed `leaflet` package and
// overwrite `L.Icon.Default` options so it uses the bundled copies.
//
// Side-effect-only — import once before rendering any <Marker>.

import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// `L.Icon.Default._getIconUrl` is a legacy auto-injected prototype getter
// that short-circuits our `mergeOptions` call. Strip it off the instance
// constructor (cast to `any` because the field is undocumented).
const IconDefault = L.Icon.Default as unknown as {
  _getIconUrl?: () => string;
  mergeOptions: (opts: Record<string, unknown>) => void;
};

if (IconDefault._getIconUrl) {
  delete IconDefault._getIconUrl;
}

IconDefault.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export {};
