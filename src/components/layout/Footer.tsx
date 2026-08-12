import {
  STUDY_AREA_NAME,
  STUDY_AREA_HECTARES,
  STUDY_AREA_LOCATION,
} from '../../config/studyArea';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-[var(--color-muted)] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="font-semibold text-[var(--color-fg)]">{STUDY_AREA_NAME}</strong>
            <span className="mx-2">·</span>
            <span>{STUDY_AREA_HECTARES.toLocaleString()} ha</span>
            <span className="mx-2">·</span>
            <span>{STUDY_AREA_LOCATION}</span>
          </div>
          <div>© {year} ND2 Computer Science project</div>
        </div>
      </div>
    </footer>
  );
}
