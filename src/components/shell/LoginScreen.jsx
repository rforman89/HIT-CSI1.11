import React from "react";

export default function LoginScreen({ ctx }) {
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
