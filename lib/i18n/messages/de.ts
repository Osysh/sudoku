export const de = {
  common: {
    appName: "Sudoku",
    home: "Startseite",
    leaderboard: "Bestenliste",
    signIn: "Anmelden",
    logOut: "Abmelden",
    connect: "Verbinden",
    loading: "Lädt...",
    redirecting: "Weiterleitung...",
    resume: "Fortsetzen",
    pause: "Pausieren",
    clear: "Löschen"
  },
  difficulty: {
    easy: "Einfach",
    medium: "Mittel",
    hard: "Schwer"
  },
  theme: {
    settings: "Einstellungen",
    openThemeSettings: "Theme-Einstellungen öffnen",
    settingsMenu: "Theme-Einstellungen",
    title: "Theme",
    pink: "Rosa",
    swiss_alp: "Schweizer Alpen",
    paris: "Paris",
    leopard: "Leopard",
    yquem: "Yquem",
    grimpe: "Grimpe",
    chocolat: "Chocolat"
  },
  language: {
    label: "Sprache",
    english: "Englisch",
    french: "Französisch",
    german: "Deutsch"
  },
  home: {
    resumeGame: "Spiel fortsetzen",
    connectedAs: 'Verbunden als "{name}"',
    newGame: "Neues Spiel",
    dailyChallenge: "Tägliche Herausforderung",
    loadingToday: "Heutige Herausforderung wird geladen...",
    dailyCompleted: "Tagesherausforderung abgeschlossen",
    playDaily: "Täglich spielen ({difficulty})",
    signInForDaily: "Für die Tagesherausforderung anmelden",
    multiplayer: "Mehrspieler",
    multiplayerComingSoon: "Mehrspieler - bald verfügbar"
  },
  login: {
    subtitleLogin: "Melde dich mit Benutzername (oder E-Mail) und Passwort an.",
    subtitleSignup: "Erstelle ein Konto mit E-Mail, Benutzername und Passwort.",
    email: "E-Mail",
    username: "Benutzername (Buchstaben, Zahlen, Unterstrich)",
    usernameOrEmail: "Benutzername oder E-Mail",
    password: "Passwort",
    pleaseWait: "Bitte warten...",
    logIn: "Anmelden",
    createAccount: "Konto erstellen",
    noAccount: "Noch kein Konto? Registrieren",
    alreadyHave: "Schon ein Konto? Anmelden",
    accountCreated: "Konto erstellt. Bitte anmelden.",
    errors: {
      usernameOrEmailRequired: "Benutzername oder E-Mail ist erforderlich.",
      usernameSigninUnavailable: "Anmeldung per Benutzername ist nicht verfügbar. Melde dich per E-Mail an oder führe `npx supabase start` aus.",
      unknownUsername: "Unbekannter Benutzername.",
      usernameMin: "Der Benutzername muss mindestens 3 Zeichen haben (Buchstaben, Zahlen, Unterstriche).",
      usernameTaken: "Benutzername ist bereits vergeben."
    }
  },
  daily: {
    unavailable: "Die tägliche Herausforderung ist derzeit nicht verfügbar.",
    signInRequired: "Melde dich an, um die tägliche Herausforderung zu spielen.",
    notGenerated: "Für heute wurde noch keine tägliche Herausforderung erstellt."
  },
  leaderboard: {
    title: "Bestenliste",
    loadingRankings: "Bestenliste wird geladen...",
    subtitle: "Eine Zeile pro Spieler, sortiert nach Gesamtpunkten aus allen Spielen.",
    rank: "#",
    player: "Spieler",
    games: "Spiele",
    totalPoints: "Gesamtpunkte",
    empty: "Noch keine abgeschlossenen Spiele."
  },
  game: {
    invalidDailyDate: "Ungültiges Datum für die tägliche Herausforderung.",
    dailyNotConfigured: "Die tägliche Herausforderung ist nicht konfiguriert.",
    noDailyForDate: "Für dieses Datum ist keine tägliche Herausforderung verfügbar.",
    dailyAlreadyCompleted: "Die heutige tägliche Herausforderung ist bereits abgeschlossen.",
    couldNotLoadDaily: "Die tägliche Herausforderung konnte nicht geladen werden.",
    scoreNotConfigured: "Speichern der Punkte ist nicht konfiguriert.",
    offlineCannotSave: "Du bist offline. Verbinde dich, um deinen Punktestand zu speichern.",
    scoreSaveError: "Punktestand konnte nicht gespeichert werden. Er wurde möglicherweise heute bereits eingereicht.",
    goHome: "Zur Startseite",
    paused: "Pausiert",
    dailyLabel: "Täglich {date}",
    victoryTitle: "Sieg! Punktzahl: {score}",
    saveScore: "Punktestand speichern",
    logInToSave: "Zum Speichern anmelden",
    saving: "Speichert...",
    defeatTitle: "Niederlage. Dieses Raster enthält Fehler.",
    retryGrid: "Raster erneut spielen",
    sudokuGrid: "Sudoku-Raster",
    clearSelectedCell: "Ausgewählte Zelle löschen",
    highlightDigit: "Zahl {digit} hervorheben",
    rowCol: "Zeile {row} Spalte {col}"
  }
} as const;
