import React, { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    const upsertMeta = (selector, attrs) => {
      let element = document.head.querySelector(selector);

      if (!element) {
        element = document.createElement("meta");
        Object.entries(attrs).forEach(([key, value]) => {
          if (key !== "content") element.setAttribute(key, value);
        });
        document.head.appendChild(element);
      }

      Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    };

    let canonical = document.head.querySelector('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }

    document.documentElement.setAttribute("lang", "nl");
    document.title = "CSI HIT | Interactief detectiveweekend";
    canonical.setAttribute("href", "https://www.csi-hit.nl/");

    upsertMeta('meta[name="description"]', {
      name: "description",
      content:
        "CSI HIT is een interactief detectiveweekend voor Scouting: onderzoek verdachten, koop aanwijzingen en los samen de zaak op.",
    });

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: "index,follow",
    });

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: "CSI HIT",
    });

    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content:
        "Een interactief detectiveweekend vol aanwijzingen, verdachten, pegels en onderzoek.",
    });

    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });

    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: "https://www.csi-hit.nl/",
    });

    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: "https://www.csi-hit.nl/csi-hit-logo.jpg",
    });
  }, []);

  const landingFont = '"CoreDodam", Arial, sans-serif';
  const instagramUrl =
    "https://www.instagram.com/csi.hit.alphen?igsh=azU3OThvcjI4YXF3";

  return (
    <>
      <style>{`
        @font-face {
          font-family: "CoreDodam";
          src: url("/fonts/CoreDodam.woff2") format("woff2");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #2a1b1b 0%, #0f0f10 44%, #050505 100%)",
          color: "#f4f4f5",
          padding: 18,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "34px 0 22px",
          }}
        >
          <section
            style={{
              background:
                "linear-gradient(180deg, rgba(24,24,27,0.94), rgba(18,18,20,0.92))",
              border: "1px solid #3f3f46",
              borderRadius: 32,
              padding: "38px 22px",
              textAlign: "center",
              boxShadow: "0 30px 100px rgba(0,0,0,0.48)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 500,
                margin: "0 auto 22px",
                overflow: "hidden",
              }}
            >
              <img
                src="/csi-hit-logo.jpg"
                alt="CSI HIT Alphen logo"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                  filter: "drop-shadow(0 20px 34px rgba(0,0,0,0.52))",
                }}
              />
            </div>

            <div
              style={{
                fontFamily: landingFont,
                letterSpacing: 1.8,
                color: "#fca5a5",
                fontSize: "clamp(16px, 3vw, 22px)",
                marginBottom: 20,
              }}
            >
              Camping Meijenzorgh editie
            </div>

            <p
              style={{
                fontFamily: landingFont,
                fontSize: "clamp(30px, 6vw, 58px)",
                lineHeight: 1.06,
                margin: "0 auto 26px",
                maxWidth: 900,
                letterSpacing: 1.5,
                color: "#ffffff",
                textShadow: "0 10px 30px rgba(0,0,0,0.55)",
              }}
            >
              Los de zaak op voordat de tijd om is.
            </p>

            <p
              style={{
                maxWidth: 820,
                margin: "0 auto 28px",
                color: "#e4e4e7",
                fontSize: 19,
                lineHeight: 1.72,
              }}
            >
              Een weekend vol sporen, verklaringen, verdachte details en slimme
              misleiding. Teams verzamelen aanwijzingen, verdienen pegels en
              bouwen stap voor stap hun theorie op.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://app.csi-hit.nl"
                style={{
                  display: "inline-block",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: "#991b1b",
                  border: "1px solid #ef4444",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: landingFont,
                  fontSize: 23,
                  letterSpacing: 1,
                  boxShadow: "0 12px 28px rgba(153,27,27,0.28)",
                }}
              >
                Naar de app
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: "#27272a",
                  border: "1px solid #52525b",
                  color: "#fff",
                  textDecoration: "none",
                  fontFamily: landingFont,
                  fontSize: 23,
                  letterSpacing: 1,
                }}
              >
                Instagram
              </a>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 18,
            }}
          >
            <div
              style={{
                background: "rgba(24,24,27,0.96)",
                border: "1px solid #3f3f46",
                borderRadius: 24,
                padding: 22,
              }}
            >
              <h2
                style={{
                  fontFamily: landingFont,
                  fontSize: 34,
                  margin: "0 0 12px",
                  letterSpacing: 1,
                }}
              >
                Wat is CSI HIT?
              </h2>
              <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
                CSI HIT is een real-life detectivegame waarin groepjes een
                weekend lang een moordzaak onderzoeken. Door te speuren, vragen
                te stellen en aanwijzingen slim te combineren, komen ze steeds
                dichter bij de waarheid.
              </p>
            </div>

            <div
              style={{
                background: "rgba(24,24,27,0.96)",
                border: "1px solid #3f3f46",
                borderRadius: 24,
                padding: 22,
              }}
            >
              <h2
                style={{
                  fontFamily: landingFont,
                  fontSize: 34,
                  margin: "0 0 12px",
                  letterSpacing: 1,
                }}
              >
                Deelnemersinformatie
              </h2>
              <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
                Deelnemers gebruiken de app om agenda-items te bekijken, pegels
                te verdienen, aanwijzingen te kopen, verdachten te beoordelen en
                hun theorie stap voor stap vast te leggen.
              </p>
            </div>

            <div
              style={{
                background: "rgba(24,24,27,0.96)",
                border: "1px solid #3f3f46",
                borderRadius: 24,
                padding: 22,
              }}
            >
              <h2
                style={{
                  fontFamily: landingFont,
                  fontSize: 34,
                  margin: "0 0 12px",
                  letterSpacing: 1,
                }}
              >
                Volg CSI HIT
              </h2>
              <p style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                Bekijk updates, sfeerbeelden en kleine hints via Instagram.
              </p>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#fca5a5",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                @csi.hit.alphen
              </a>
            </div>
          </section>

          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              color: "#a1a1aa",
              fontSize: 14,
              marginTop: 20,
              padding: "0 6px",
            }}
          >
            <span>CSI HIT Alphen</span>
            <a
              href="https://app.csi-hit.nl"
              style={{ color: "#a1a1aa", textDecoration: "none" }}
            >
              Organisatie login
            </a>
          </footer>
        </main>
      </div>
    </>
  );
}
