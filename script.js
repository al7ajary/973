const animatedElements = document.querySelectorAll(
  ".hero-text, .hero-visual, .section, .service-card"
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add("show");
        }, index * 120);
      }
    });
  },
  {
    threshold: 0.18,
  }
);

animatedElements.forEach((element) => {
  element.classList.add("hidden");
  observer.observe(element);
});

let ticking = false;

document.addEventListener("mousemove", (e) => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      document.documentElement.style.setProperty("--mouse-x", `${x * 100}%`);
      document.documentElement.style.setProperty("--mouse-y", `${y * 100}%`);

      const logo = document.querySelector(".logo-frame");

      if (logo) {
        logo.style.transform = `
          rotateX(${(y - 0.5) * -12}deg)
          rotateY(${(x - 0.5) * 12}deg)
          scale(1.02)
        `;
      }

      const cursorGlow = document.querySelector(".cursor-glow");

      if (cursorGlow) {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
      }

      ticking = false;
    });

    ticking = true;
  }
});

window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");

  setTimeout(() => {
    if (loader) {
      loader.classList.add("hidden");
    }

    document.body.classList.add("loaded");
  }, 650);

  const offerPopup = document.getElementById("offerPopup");

  if (offerPopup) {
    setTimeout(() => {
      offerPopup.classList.add("active");
      document.body.classList.add("popup-open");
    }, 1200);
  }
});

const scrollProgress = document.querySelector(".scroll-progress");

window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) {
    scrollProgress.style.width = progress + "%";
  }
});

const revealItems = document.querySelectorAll(
  ".section h2, .section > p, .service-card, .portfolio-card, .contact-form, .contact-info"
);

revealItems.forEach((item, index) => {
  item.classList.add("scroll-reveal");

  if (index % 3 === 1) item.classList.add("delay-1");
  if (index % 3 === 2) item.classList.add("delay-2");
});

const scrollObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealItems.forEach((item) => {
  scrollObserver.observe(item);
});

function showFormSuccess() {
  const message = document.getElementById("formSuccess");
  const form = document.querySelector(".contact-form");

  if (!message || !form) return;

  message.classList.add("show");

  setTimeout(() => {
    message.classList.remove("show");
  }, 3500);

  setTimeout(() => {
    form.reset();
  }, 800);
}

const closeOfferPopup = document.getElementById("closeOfferPopup");
const offerPopup = document.getElementById("offerPopup");

if (closeOfferPopup && offerPopup) {
  closeOfferPopup.addEventListener("click", () => {
    offerPopup.classList.remove("active");
    document.body.classList.remove("popup-open");
  });
}

if (offerPopup) {
  offerPopup.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("offer-popup") ||
      e.target.classList.contains("offer-popup-backdrop")
    ) {
      offerPopup.classList.remove("active");
      document.body.classList.remove("popup-open");
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && offerPopup) {
    offerPopup.classList.remove("active");
    document.body.classList.remove("popup-open");
  }
});

function showPopupSuccess() {
  const message = document.getElementById("popupSuccess");
  const popupForm = document.querySelector(".popup-form");

  if (!message || !popupForm) return;

  message.classList.add("show");

  setTimeout(() => {
    message.classList.remove("show");
  }, 3500);

  setTimeout(() => {
    popupForm.reset();
  }, 800);
}
