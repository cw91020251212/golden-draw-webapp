(() => {
  const targets = document.querySelectorAll(
    ".purpose, .section-head, .pathway, .api-list article, .detail-blocks > div, .service-grid li, .checklist li, .table-scroll"
  );

  targets.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));
})();
