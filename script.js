window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");

  setTimeout(() => {
    if (loader) {
      loader.classList.add("hidden");
    }

    document.body.classList.add("loaded");
  }, 3000);
});
