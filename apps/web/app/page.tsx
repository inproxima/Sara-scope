export default function HomePage() {
  return (
    <div className="hero">
      <div className="hero-brand">
        <span className="hero-title">sara</span>
        <span className="hero-dot">-</span>
        <span className="hero-title">scope</span>
      </div>
      <div className="hero-rule" />
      <p className="hero-sub">Systematic Analysis &amp; Research Annotation</p>
      <p className="hero-desc">
        Upload research PDFs, review extracted metadata, code papers with
        structured diagnostic codebooks, and export analysis-ready datasets.
      </p>
      <div className="hero-actions">
        <a className="btn btn-primary" href="/login">
          Sign in
        </a>
        <a className="btn btn-ghost" href="/papers">
          Browse papers
        </a>
      </div>
    </div>
  );
}
