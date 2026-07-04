import React, { useEffect } from "react";

export default function LoginScreen({ ctx }) {
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

    const isAppDomain = window.location.hostname === "app.csi-hit.nl";

    document.title = "CSI HIT Login";

    upsertMeta('meta[name="description"]', {
      name: "description",
      content:
        "Loginomgeving voor deelnemers, verdachten en organisatie van CSI HIT.",
    });

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: isAppDomain ? "noindex,nofollow" : "noindex,follow",
    });
  }, []);

  const {
    styles,
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    handleLogin,
    handleRegister,
    MessageBlock,
  } = ctx;

  return (
    <div style={styles.app}>
      <div style={{ ...styles.card, maxWidth: 520, margin: "40px auto" }}>
        <h1>CSI HIT Login</h1>
        <p style={styles.subtle}>
          Log in met het account dat je van de organisatie hebt gekregen.
          Registreren is alleen nodig als de organisatie daarom vraagt.
        </p>
        <input
          style={styles.input}
          placeholder="Naam, alleen nodig bij registreren"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} onClick={handleLogin}>
          Inloggen
        </button>
        <button style={styles.buttonSecondary} onClick={handleRegister}>
          Registreren
        </button>
        {MessageBlock()}
      </div>
    </div>
  );
}
