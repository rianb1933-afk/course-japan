(function () {
  const env = window.EDUMA_ENV || {};

  if (env.GSC_VERIFICATION) {
    const meta = document.querySelector('meta[name="google-site-verification"]') || document.createElement("meta");
    meta.name = "google-site-verification";
    meta.content = env.GSC_VERIFICATION;
    if (!meta.parentNode) document.head.appendChild(meta);
  }

  if (!env.GA_MEASUREMENT_ID) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(env.GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", env.GA_MEASUREMENT_ID);
})();
