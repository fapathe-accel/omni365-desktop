const fr = {
  menu: {
    changeInstance: "Changer d'instance…",
    edit: "Édition",
    file: "Fichier",
    launchAtLogin: "Lancer au démarrage",
    open: "Ouvrir Omni365",
    quit: "Quitter Omni365",
    view: "Affichage",
    window: "Fenêtre",
  },
  setup: {
    title: "Connexion à votre espace Omni365",
    lead: "Indiquez l'adresse de l'instance Omni365 de votre organisation.",
    label: "Adresse de l'instance",
    placeholder: "omni365.exemple.com",
    submit: "Continuer",
    checking: "Vérification…",
    retry: "Réessayer",
    errors: {
      invalid: "Cette adresse n'est pas valide. Utilisez une adresse en https://.",
      unreachable: "Impossible de joindre cette adresse. Vérifiez votre connexion.",
      "not-omni365": "Cette adresse ne mène pas à une instance Omni365.",
      "load-failed":
        "Omni365 ne répond pas. Vérifiez votre connexion, puis réessayez.",
    },
  },
  picker: {
    title: "Choisissez ce que vous partagez",
    screens: "Écrans",
    windows: "Fenêtres",
    cancel: "Annuler",
    share: "Partager",
  },
};

const en: typeof fr = {
  menu: {
    changeInstance: "Change instance…",
    edit: "Edit",
    file: "File",
    launchAtLogin: "Open at login",
    open: "Open Omni365",
    quit: "Quit Omni365",
    view: "View",
    window: "Window",
  },
  setup: {
    title: "Sign in to your Omni365 workspace",
    lead: "Enter the address of your organisation's Omni365 instance.",
    label: "Instance address",
    placeholder: "omni365.example.com",
    submit: "Continue",
    checking: "Checking…",
    retry: "Try again",
    errors: {
      invalid: "This address is not valid. Use an https:// address.",
      unreachable: "This address cannot be reached. Check your connection.",
      "not-omni365": "This address does not lead to an Omni365 instance.",
      "load-failed":
        "Omni365 is not responding. Check your connection, then try again.",
    },
  },
  picker: {
    title: "Choose what to share",
    screens: "Screens",
    windows: "Windows",
    cancel: "Cancel",
    share: "Share",
  },
};

export type Messages = typeof fr;
export type Language = "fr" | "en";

export function messagesFor(language: Language): Messages {
  return language === "fr" ? fr : en;
}
