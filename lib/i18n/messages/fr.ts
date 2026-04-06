export const fr = {
  common: {
    appName: "Sudoku",
    home: "Accueil",
    leaderboard: "Classement",
    signIn: "Se connecter",
    logOut: "Se déconnecter",
    connect: "Connexion",
    loading: "Chargement...",
    redirecting: "Redirection...",
    resume: "Reprendre",
    pause: "Pause",
    clear: "Effacer"
  },
  difficulty: {
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile"
  },
  theme: {
    settings: "Réglages",
    openThemeSettings: "Ouvrir les réglages du thème",
    settingsMenu: "Réglages du thème",
    title: "Thème",
    pink: "Rose",
    swiss_alp: "Alpes suisses",
    paris: "Paris",
    leopard: "Léopard",
    yquem: "Yquem",
    grimpe: "Grimpe",
    chocolat: "Chocolat"
  },
  language: {
    label: "Langue",
    english: "Anglais",
    french: "Français",
    german: "Allemand"
  },
  home: {
    resumeGame: "Reprendre la partie",
    connectedAs: 'Connecté en tant que "{name}"',
    newGame: "Nouvelle partie",
    dailyChallenge: "Défi du jour",
    loadingToday: "Chargement du défi du jour...",
    dailyCompleted: "Défi du jour terminé",
    playDaily: "Jouer le défi ({difficulty})",
    signInForDaily: "Connecte-toi pour le défi du jour",
    multiplayer: "Multijoueur",
    multiplayerComingSoon: "Multijoueur - bientôt disponible"
  },
  login: {
    subtitleLogin: "Connecte-toi avec ton pseudo (ou email) et ton mot de passe.",
    subtitleSignup: "Crée un compte avec email, pseudo et mot de passe.",
    email: "Email",
    username: "Pseudo (lettres, chiffres, underscore)",
    usernameOrEmail: "Pseudo ou email",
    password: "Mot de passe",
    pleaseWait: "Patiente...",
    logIn: "Se connecter",
    createAccount: "Créer un compte",
    noAccount: "Pas encore de compte ? Inscris-toi",
    alreadyHave: "Déjà un compte ? Connecte-toi",
    accountCreated: "Compte créé. Connecte-toi.",
    errors: {
      usernameOrEmailRequired: "Le pseudo ou l'email est requis.",
      usernameSigninUnavailable: "La connexion par pseudo est indisponible. Connecte-toi avec email, ou lance `npx supabase start`.",
      unknownUsername: "Pseudo inconnu.",
      usernameMin: "Le pseudo doit contenir au moins 3 caractères (lettres, chiffres, underscores).",
      usernameTaken: "Pseudo déjà pris."
    }
  },
  daily: {
    unavailable: "Le défi du jour est indisponible pour le moment.",
    signInRequired: "Connecte-toi pour jouer au défi du jour.",
    notGenerated: "Aucun défi du jour n'a encore été généré."
  },
  leaderboard: {
    title: "Classement",
    loadingRankings: "Chargement du classement...",
    subtitle: "Une ligne par joueur, classée par points cumulés sur toutes les parties.",
    rank: "#",
    player: "Joueur",
    games: "Parties",
    totalPoints: "Points totaux",
    empty: "Aucune partie terminée pour le moment."
  },
  game: {
    invalidDailyDate: "Date du défi du jour invalide.",
    dailyNotConfigured: "Le défi du jour n'est pas configuré.",
    noDailyForDate: "Aucun défi du jour n'est disponible pour cette date.",
    dailyAlreadyCompleted: "Le défi du jour est déjà terminé.",
    couldNotLoadDaily: "Impossible de charger le défi du jour.",
    scoreNotConfigured: "La sauvegarde du score n'est pas configurée.",
    offlineCannotSave: "Tu es hors ligne. Connecte-toi pour enregistrer ton score.",
    scoreSaveError: "Impossible d'enregistrer le score. Il est peut-être déjà soumis pour aujourd'hui.",
    goHome: "Aller à l'accueil",
    paused: "En pause",
    dailyLabel: "Défi {date}",
    victoryTitle: "Victoire ! Score : {score}",
    saveScore: "Enregistrer le score",
    logInToSave: "Connecte-toi pour enregistrer",
    saving: "Enregistrement...",
    defeatTitle: "Défaite. Cette grille contient des erreurs.",
    retryGrid: "Rejouer la grille",
    sudokuGrid: "grille sudoku",
    clearSelectedCell: "Effacer la case sélectionnée",
    highlightDigit: "Surligner le chiffre {digit}",
    rowCol: "ligne {row} colonne {col}"
  }
} as const;
