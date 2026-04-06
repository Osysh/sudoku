export const en = {
  common: {
    appName: "Sudoku",
    home: "Home",
    leaderboard: "Leaderboard",
    signIn: "Sign in",
    logOut: "Log out",
    connect: "Connect",
    loading: "Loading...",
    redirecting: "Redirecting...",
    resume: "Resume",
    pause: "Pause",
    clear: "Clear"
  },
  difficulty: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
  },
  theme: {
    settings: "Settings",
    openThemeSettings: "Open theme settings",
    settingsMenu: "Theme settings",
    title: "Theme",
    pink: "Pink",
    swiss_alp: "Swiss Alp",
    paris: "Paris",
    leopard: "Leopard",
    yquem: "Yquem",
    grimpe: "Grimpe",
    chocolat: "Chocolat"
  },
  language: {
    label: "Language",
    english: "English",
    french: "French",
    german: "German"
  },
  home: {
    resumeGame: "Resume game",
    connectedAs: 'Connected as "{name}"',
    newGame: "New game",
    dailyChallenge: "Daily challenge",
    loadingToday: "Loading today's challenge...",
    dailyCompleted: "Daily challenge completed",
    playDaily: "Play daily ({difficulty})",
    signInForDaily: "Sign in for daily challenge",
    multiplayer: "Multiplayer",
    multiplayerComingSoon: "Multiplayer - coming soon"
  },
  login: {
    subtitleLogin: "Sign in with username (or email) and password.",
    subtitleSignup: "Create account with email, username, and password.",
    email: "Email",
    username: "Username (letters, numbers, underscore)",
    usernameOrEmail: "Username or email",
    password: "Password",
    pleaseWait: "Please wait...",
    logIn: "Log in",
    createAccount: "Create account",
    noAccount: "No account yet? Sign up",
    alreadyHave: "Already have an account? Sign in",
    accountCreated: "Account created. Please sign in.",
    errors: {
      usernameOrEmailRequired: "Username or email is required.",
      usernameSigninUnavailable: "Username sign-in is unavailable. Sign in with email, or run `npx supabase start`.",
      unknownUsername: "Unknown username.",
      usernameMin: "Username must be at least 3 chars (letters, numbers, underscores).",
      usernameTaken: "Username already taken."
    }
  },
  daily: {
    unavailable: "Daily challenge is unavailable right now.",
    signInRequired: "Sign in to play today's daily challenge.",
    notGenerated: "No daily challenge has been generated yet."
  },
  leaderboard: {
    title: "Leaderboard",
    loadingRankings: "Loading rankings...",
    subtitle: "One row per player, ranked by cumulative points across all games.",
    rank: "#",
    player: "Player",
    games: "Games",
    totalPoints: "Total Points",
    empty: "No completed games yet."
  },
  game: {
    invalidDailyDate: "Invalid daily challenge date.",
    dailyNotConfigured: "Daily challenge is not configured.",
    noDailyForDate: "No daily challenge is available for this date.",
    dailyAlreadyCompleted: "Today's daily challenge is already completed.",
    couldNotLoadDaily: "Could not load daily challenge.",
    scoreNotConfigured: "Score saving is not configured.",
    offlineCannotSave: "You are offline. Connect to save your score.",
    scoreSaveError: "Could not save score. It may already be submitted for today.",
    goHome: "Go to home",
    paused: "Paused",
    dailyLabel: "Daily {date}",
    victoryTitle: "Victory! Score: {score}",
    saveScore: "Save score",
    logInToSave: "Log in to save score",
    saving: "Saving...",
    defeatTitle: "Defeat. This grid has mistakes.",
    retryGrid: "Retry grid",
    sudokuGrid: "sudoku grid",
    clearSelectedCell: "Clear selected cell",
    highlightDigit: "Highlight digit {digit}",
    rowCol: "row {row} col {col}"
  }
} as const;

export type Messages = typeof en;
