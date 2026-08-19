/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { StoryCarousel } from "@/components/story-carousel";
import { useEffect, useState } from "react";

const BookingModal = dynamic(
  () => import("@/components/booking-modal").then((m) => ({ default: m.BookingModal })),
  { ssr: false }
);

const PriceMenu = dynamic(
  () => import("@/components/price-menu").then((m) => ({ default: m.PriceMenu })),
  {
    loading: () => (
      <div className="min-h-[min(60vh,520px)] border-y border-[#1a1a1a] bg-[#0a0a0a]/80" aria-hidden />
    ),
  }
);

const Gallery = dynamic(
  () => import("@/components/gallery").then((m) => ({ default: m.Gallery })),
  {
    loading: () => (
      <div className="min-h-[50vh] bg-[#1a1a1a]" aria-hidden />
    ),
  }
);

type Lang = "en" | "sk";

type TeamMember = {
  name: string;
  role: string;
  bio: {
    en: string;
    sk: string;
  };
  focus: {
    en: string;
    sk: string;
  };
  avatarSrc: string;
  avatarAlt: string;
};

const team: TeamMember[] = [
  // {
  //   name: "Quan K",
  //   role: "Master Barber",
  //   bio: {
  //     en: "Master of classic fades and modern beard design.",
  //     sk: "Majster klasických fade strihov a modernej úpravy brady.",
  //   },
  //   focus: {
  //     en: "Men's grooming · Skin fades · Beard design",
  //     sk: "Pánsky grooming · Skin fades · Úprava brady",
  //   },
  //   avatarSrc: "/quan.svg",
  //   avatarAlt: "Quan K – Master Barber at Be. Hair & Barber",
  // },
  {
    name: "Hao Barber",
    role: "Master Barber",
    bio: {
      en: "An expert in precision men's fades and beard designs.",
      sk: "Expert na precízne pánske fade strihy a úpravu brady.",
    },
    focus: {
      en: "Men's Styling · Precision Fades · Beard Design",
      sk: "Pánsky styling · Precízne fade strihy · Úprava brady",
    },
    avatarSrc: "/haobarber.jpg",
    avatarAlt: "Hao Barber — Master Barber at Be. Hair & Barber",
  },
  {
    name: "Sonny",
    role: "Master Barber",
    bio: {
      en: "Master of classic fades and modern beard design.",
      sk: "Majster klasických fade strihov a modernej úpravy brady.",
    },
    focus: {
      en: "Men's grooming · Skin fades · Beard design",
      sk: "Pánsky grooming · Skin fades · Úprava brady",
    },
    avatarSrc: "/IMG_0141.JPG",
    avatarAlt: "Sonny – Master Barber at Be. Hair & Barber",
  },
];

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("sk");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cursor = document.getElementById("cursor");
    const ring = document.getElementById("cursorRing");

    if (!cursor || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let frameId = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    if (reducedMotion) {
      cursor.style.display = "none";
      ring.style.display = "none";
    } else {
      document.addEventListener("mousemove", handleMouseMove, { passive: true });

      const animateRing = () => {
        cursor.style.left = `${mx}px`;
        cursor.style.top = `${my}px`;
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = `${rx}px`;
        ring.style.top = `${ry}px`;
        frameId = window.requestAnimationFrame(animateRing);
      };

      animateRing();
    }

    const reveals = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    reveals.forEach((el) => observer.observe(el));

    const nav = document.querySelector<HTMLElement>("nav");
    const handleScroll = () => {
      if (!nav) return;
      nav.style.background =
        window.scrollY > 80
          ? "rgba(10,10,10,0.97)"
          : "linear-gradient(to bottom, rgba(0,0,0,0.92), transparent)";
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const goToBooking = () => {
    setIsBookingOpen(true);
  };

  const texts = {
    en: {
      nav: {
        about: "About Us",
        services: "Services",
        team: "Our Team",
        contact: "Contact",
        book: "Book Now",
      },
      hero: {
        eyebrow: "✦ Námestie osloboditeľov 22, Košice ✦",
        title1: "YOUR SHINE,",
        title2: "Our Masterpiece.",
        sub: "PÁNSKE HOLIČSTVO / MEN'S GROOMING",
        cta: "Book Now",
        scroll: "Discover",
      },
      story: {
        label: "Our Story",
        headingLine1: "Art Beyond",
        headingLine2: "Every Cut",
        p1: "Be. Barber is a premium men's grooming destination in Košice, offering expert haircuts, beard sculpting, and coloring services.",
        p2: "Every client is in the hands of barbers who understand face structure, trends, and personal style.",
        p3: "We believe that great grooming is not imitation — it's discovering and honoring the best version of yourself.",
        stat1: "Years of Experience",
        stat2: "Happy Clients",
        stat3: "Dedication",
      },
      team: {
        label: "Expert Team",
        heading1: "The Artists",
        heading2: "Behind Your Look",
        desc: "Each expert at Be. is highly trained and constantly updated on the latest trends and techniques from fashion capitals worldwide.",
      },
      menu: {
        label: "Price List",
        title: "Cenník / Price List",
        sub: "Top-tier quality — transparent pricing",
      },
      footer: {
        tagline: "Men's Grooming",
        description:
          "Your Shine, Our Masterpiece — premium men's grooming where every detail is crafted around your confidence.",
        servicesTitle: "Services",
        hoursTitle: "Opening Hours",
        addressTitle: "Address",
        bookNow: "Book Now",
        copyright: "All rights reserved.",
      },
    },
    sk: {
      nav: {
        about: "O nás",
        services: "Služby",
        team: "Náš tím",
        contact: "Kontakt",
        book: "Objednať sa",
      },
      hero: {
        eyebrow: "✦ Námestie osloboditeľov 22, Košice ✦",
        title1: "TVOJ LESK,",
        title2: "Naše majstrovské dielo.",
        sub: "PÁNSKE HOLIČSTVO / MEN'S GROOMING",
        cta: "Objednať sa",
        scroll: "Objavuj",
      },
      story: {
        label: "Náš príbeh",
        headingLine1: "Umenie nad",
        headingLine2: "Každým strihom",
        p1: "Be. Barber je prémiové pánske holičstvo v Košiciach, ponúkame expertné strihy, úpravu brady a farbenie vlasov.",
        p2: "Každý klient je v rukách barberov, ktorí rozumejú tvaru tváre, trendom aj osobnému štýlu.",
        p3: "Veríme, že skvelý grooming nie je napodobňovanie — je to objavenie a zvýraznenie najlepšej verzie seba samého.",
        stat1: "Rokov skúseností",
        stat2: "Spokojných klientov",
        stat3: "Nasadenie",
      },
      team: {
        label: "Náš tím",
        heading1: "Umelci",
        heading2: "Za vašim vzhľadom",
        desc: "Každý člen tímu Be. je odborne vyškolený a neustále sleduje nové trendy aj techniky z módnych metropol.",
      },
      menu: {
        label: "Cenník služieb",
        title: "Cenník / Price List",
        sub: "Špičková kvalita — férové ceny",
      },
      footer: {
        tagline: "Men's Grooming",
        description:
          "Your Shine, Our Masterpiece — premium pánske holičstvo, kde každý detail je o vašej sebadôvere.",
        servicesTitle: "Služby",
        hoursTitle: "Otváracie hodiny",
        addressTitle: "Adresa",
        bookNow: "Objednať sa",
        copyright: "Všetky práva vyhradené.",
      },
    },
  } as const;

  return (
    <>
      <div className="cursor" id="cursor" />
      <div className="cursor-ring" id="cursorRing" />

      <nav>
        <a href="#" className="nav-logo">
          <span className="nav-logo-mark">
            <img src="/be-logo.svg" alt="Be. Hair &amp; Barber logo" />
          </span>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#story">{texts[lang].nav.about}</a>
          </li>
          <li>
            <a href="#menu">{texts[lang].nav.services}</a>
          </li>
          <li>
            <a href="#team">{texts[lang].nav.team}</a>
          </li>
          <li>
            <a href="#contact">{texts[lang].nav.contact}</a>
          </li>
        </ul>
        <div className="nav-actions">
          <div className="nav-lang-switch">
            <button
              type="button"
              className={lang === "en" ? "active" : ""}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <span>/</span>
            <button
              type="button"
              className={lang === "sk" ? "active" : ""}
              onClick={() => setLang("sk")}
            >
              SK
            </button>
          </div>
          <button className="nav-book" type="button" onClick={goToBooking}>
            {texts[lang].nav.book}
          </button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-lines" />
          <div className="hero-content">
            <p className="hero-eyebrow">{texts[lang].hero.eyebrow}</p>
            <h1 className="hero-title">YOUR SHINE,</h1>
            <h1 className="hero-title-italic">Our Masterpiece.</h1>
            <div className="hero-divider">
              <div className="hero-divider-line" />
              <div className="hero-divider-diamond" />
              <div className="hero-divider-line right" />
            </div>
            <p className="hero-sub">{texts[lang].hero.sub}</p>
            <button type="button" className="hero-cta" onClick={goToBooking}>
              <span>{texts[lang].hero.cta}</span>
              <span className="hero-cta-arrow">→</span>
            </button>
          </div>
          <div className="hero-scroll">
            <span>{texts[lang].hero.scroll}</span>
            <div className="scroll-line" />
          </div>
        </section>

        <div className="gold-divider" />

        <section className="story" id="story">
          <div className="story-text reveal">
            <div style={{ position: "relative" }}>
              <div className="story-number">Be</div>
              <div className="section-label">{texts[lang].story.label}</div>
              <h2>
                {texts[lang].story.headingLine1}
                <br />
                <em>{texts[lang].story.headingLine2}</em>
              </h2>
              <p>{texts[lang].story.p1}</p>
              <p>{texts[lang].story.p2}</p>
              <p>{texts[lang].story.p3}</p>
            </div>
            <div className="story-stats">
              <div>
                <span className="stat-num">5+</span>
                <span className="stat-label">{texts[lang].story.stat1}</span>
              </div>
              <div>
                <span className="stat-num">2K+</span>
                <span className="stat-label">{texts[lang].story.stat2}</span>
              </div>
              <div>
                <span className="stat-num">100%</span>
                <span className="stat-label">{texts[lang].story.stat3}</span>
              </div>
            </div>
          </div>
          <div className="story-visual reveal reveal-delay-2">
            <StoryCarousel
              images={[
                "/salon-1.jpg",
                "/salon-2.jpg",
                "/salon-3.jpg",
                "/salon-4.jpg",
                "/salon-5.jpg",
              ]}
              alt="Be. Salon"
            />
          </div>
        </section>

        <div className="gold-divider" />

        <PriceMenu
          lang={lang}
          label={texts[lang].menu.label}
          title={texts[lang].menu.title}
          sub={texts[lang].menu.sub}
        />

        <div className="gold-divider" />

        {/* TODO: Re-enable gallery once storage issues are fixed */}
        {/* <Gallery lang={lang} /> */}

        <div className="gold-divider" />

        <section className="team-section" id="team">
          <div className="team-header reveal">
            <div>
              <div className="section-label">{texts[lang].team.label}</div>
              <h2>
                {texts[lang].team.heading1}
                <br />
                <em>{texts[lang].team.heading2}</em>
              </h2>
            </div>
            <p>{texts[lang].team.desc}</p>
          </div>
          <div className="team-grid">
            {team.map((member, index) => (
              <div
                key={member.name}
                className={`team-card reveal${
                  index === 1 ? " reveal-delay-1" : index === 2 ? " reveal-delay-2" : ""
                }`}
              >
                <div className="team-card-visual">
                  <Image
                    src={member.avatarSrc}
                    alt={member.avatarAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <div className="team-card-overlay">
                    <div className="team-name">{member.name}</div>
                    <div className="team-role">{member.role}</div>
                    <div className="team-desc">{member.bio[lang]}</div>
                    <div className="team-skills">
                      <span className="team-skill">{member.focus[lang]}</span>
                    </div>
                  </div>
                </div>
                <div className="team-card-info">
                  <div className="team-name" style={{ fontSize: 15 }}>
                    {member.name}
                  </div>
                  <div className="team-role">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>


        <footer id="contact">
          <div className="footer-top">
            <div className="footer-brand">
              <h3>Be.</h3>
              <p className="tagline">{texts[lang].footer.tagline}</p>
              <p>{texts[lang].footer.description}</p>
              <button
                type="button"
                className="footer-book-btn"
                onClick={goToBooking}
              >
                {texts[lang].footer.bookNow}
              </button>
              <div className="footer-social">
                <a
                  href="https://instagram.com/be.barber.ke"
                  className="social-btn"
                  title="Instagram"
                >
                  ig
                </a>
                <a
                  href="https://www.facebook.com/Be.Barber2026"
                  className="social-btn"
                  title="Facebook"
                >
                  fb
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>{texts[lang].footer.servicesTitle}</h4>
              <ul>
                <li>
                  <a href="#menu">Men&apos;s Grooming</a>
                </li>
                <li>
                  <a href="#menu">Pánske strihy</a>
                </li>
                <li>
                  <a href="#menu">Úprava brady</a>
                </li>
                <li>
                  <a href="#menu">Farbenie vlasov</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{texts[lang].footer.hoursTitle}</h4>
              <div className="hours-row">
                <span>Po – So</span>
                <span className="hours-time">9:00 – 19:00</span>
              </div>
              <div className="hours-row">
                <span>Nedeľa</span>
                <span className="hours-time">10:00 – 19:00</span>
              </div>
            </div>
            <div className="footer-col">
              <h4>{texts[lang].footer.addressTitle}</h4>
              <p>
                Námestie osloboditeľov 22
                <br />
                Košice, Slovakia
              </p>
              <p className="footer-phone">
                <a href="tel:0944056077" className="footer-phone-link">
                  0944 056 077
                </a>
              </p>
              <p className="footer-handle">
                <a
                  href="https://instagram.com/be.barber.ke"
                  target="_blank"
                  rel="noreferrer"
                >
                  @be.barber.ke
                </a>
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              © 2026 <span className="gold-text">Be. Hair &amp; Barber</span>.
              {` ${texts[lang].footer.copyright}`}
            </p>
            <p className="footer-credit">
              Designed by{" "}
              <a
                href="https://www.instagram.com/vt.phh"
                target="_blank"
                rel="noreferrer"
                className="gold-text"
              >
                Aiden Pham
              </a>{" "}
              <span className="gold-text">♦</span> for excellence
            </p>
          </div>
        </footer>

        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          lang={lang}
        />
      </main>
    </>
  );
}

