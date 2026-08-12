import { Link } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import { useMedia } from '../hooks/useMedia';
import { useSiteFeatures } from '../hooks/useSiteFeatures';
import {
  STUDY_AREA_HECTARES,
  STUDY_AREA_LOCATION,
  STUDY_AREA_NAME,
} from '../config/studyArea';
import { formatHectares } from '../lib/utils';
import { buttonClasses } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { MediaCard } from '../components/media/MediaCard';
import { Spinner } from '../components/ui/Spinner';

export function Home() {
  const { schools, loading: schoolsLoading } = useSchools({ publicOnly: true });
  const { media, loading: mediaLoading } = useMedia({ publicOnly: true });
  const { features, loading: featuresLoading } = useSiteFeatures();

  const stats = [
    { label: 'Schools mapped', value: schools.length, loading: schoolsLoading },
    { label: 'Media records', value: media.length, loading: mediaLoading },
    { label: 'Site features', value: features.length, loading: featuresLoading },
    { label: 'Study area', value: `${formatHectares(STUDY_AREA_HECTARES)} ha`, loading: false },
  ];

  const recentMedia = media.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--color-brand)]/10 to-transparent">
        <Section className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
          <p className="rounded-full bg-[var(--color-brand)]/10 px-4 py-1.5 text-xs font-medium text-[var(--color-brand)] ring-1 ring-inset ring-[var(--color-brand)]/20">
            {STUDY_AREA_NAME} · {STUDY_AREA_LOCATION}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[var(--color-fg)] sm:text-5xl">
            Interactive School Mapping System
          </h1>
          <p className="max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">
            Explore school locations, site features and media for the{' '}
            <strong className="text-[var(--color-fg)]">{formatHectares(STUDY_AREA_HECTARES)}-hectare</strong>{' '}
            study area along Ilaro/Oja-Odan Road, Ogun State — all on an interactive map.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/map" className={buttonClasses('primary', 'lg')}>
              Explore the map
            </Link>
            <Link to="/schools" className={buttonClasses('secondary', 'lg')}>
              Browse schools
            </Link>
          </div>
        </Section>
      </section>

      {/* Live stats */}
      <Section className="pt-0">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} bare className="p-5 text-center">
              {stat.loading ? (
                <div className="flex justify-center py-1">
                  <Spinner />
                </div>
              ) : (
                <p className="text-3xl font-bold text-[var(--color-brand)]">{stat.value}</p>
              )}
              <p className="mt-1 text-sm text-[var(--color-muted)]">{stat.label}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Feature cards */}
      <Section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <h2 className="font-semibold text-[var(--color-fg)]">Interactive map</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              OpenStreetMap base with an optional satellite view, school markers, a study-area
              layer (ready for the real boundary), and a layer control — no API keys required.
            </p>
          </Card>
          <Card>
            <h2 className="font-semibold text-[var(--color-fg)]">School records</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Search schools by name, type, education level and facilities. Click a marker for
              details, or browse the full list.
            </p>
          </Card>
          <Card>
            <h2 className="font-semibold text-[var(--color-fg)]">Site media</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Satellite and drone captures, site photos and videos — managed by the administrator
              through the admin dashboard.
            </p>
          </Card>
        </div>
      </Section>

      {/* Media strip */}
      {media.length > 0 ? (
        <Section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-fg)]">Latest site media</h2>
            <Link to="/map" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
              View on map →
            </Link>
          </div>
          {mediaLoading ? (
            <p className="py-6 text-sm text-[var(--color-muted)]">Loading media…</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentMedia.map((m) => (
                <li key={m.id}>
                  <MediaCard media={m} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {/* Data status */}
      <Section>
        <Card className="border-amber-200 bg-amber-50/50">
          <h2 className="font-semibold text-[var(--color-fg)]">About the geographic data</h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted)]">
            The {formatHectares(STUDY_AREA_HECTARES)}-hectare figure is the documented study-area
            value from the project specification. The map centre is a clearly-labelled temporary
            reference point; no coordinates, boundary polygon or school positions are fabricated.
            Real survey data (GeoJSON/KML boundary, georeferenced imagery) plugs in at{' '}
            <code className="rounded bg-[var(--color-border)]/60 px-1">src/config/studyArea.ts</code>{' '}
            when it is supplied.
          </p>
        </Card>
      </Section>
    </>
  );
}
