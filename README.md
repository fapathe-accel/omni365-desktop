# Omni365 Desktop

Client de bureau Omni365 pour Windows, macOS et Linux.

L'application ouvre l'instance Omni365 de l'utilisateur dans une fenêtre native (Electron). Elle n'embarque ni le serveur ni les identifiants Nextcloud : le serveur Omni365 reste celui qui est déployé. En plus de ce que fait le navigateur, elle apporte :

- **Choix de l'instance au premier lancement.** L'adresse saisie est vérifiée : l'instance doit publier un `manifest.webmanifest` qui déclare le protocole `web+omni`. On peut en changer depuis le menu ou l'icône de la barre des tâches.
- **Une fenêtre limitée à l'instance.** Tout lien vers un autre site s'ouvre dans le navigateur. Seules les pages de l'instance ont accès à la caméra, au micro, aux notifications et au partage d'écran.
- **Partage d'écran pour Talk.** Un sélecteur d'écrans et de fenêtres s'affiche. Sur macOS 15 et plus, c'est celui du système.
- **Notifications natives.** L'app web les envoie avec l'API `Notification` du navigateur, que Windows, macOS et Linux affichent comme des notifications du système. Elles arrivent aussi quand la fenêtre est masquée : la page n'est pas ralentie en arrière-plan. Un clic sur une notification ramène la fenêtre, même depuis la barre des tâches. Sous Windows, elles s'affichent pour l'app installée, dont le raccourci du menu Démarrer porte l'identifiant `net.Accel.omni365`, et non en `bun run dev`.
- **Icône dans la barre des tâches**, avec l'option « Lancer au démarrage » sur Windows et macOS. Fermer la fenêtre la masque sans quitter l'app, sauf sous Linux.
- **Liens `omni365://`** : `omni365://mail`, `omni365://files`, `omni365://chat`, `omni365://calendar`, `omni365://contacts`. Ils passent par la route `/protocol-handler` de l'app web.
- **Mises à jour automatiques** depuis les GitHub Releases (`electron-updater`).
- **Mémorisation** de la taille et de la position de la fenêtre.

## Développement

Prérequis : [Bun](https://bun.sh) 1.3 ou plus.

```sh
bun install
bun run dev        # compile dans dist/ puis lance Electron
bun run typecheck
```

> Depuis le terminal de VS Code, la variable `ELECTRON_RUN_AS_NODE=1` est héritée et fait tourner Electron comme un simple Node.js (`app` est `undefined`). Lancez plutôt `env -u ELECTRON_RUN_AS_NODE bun run dev` (bash), ou `Remove-Item Env:ELECTRON_RUN_AS_NODE` avant `bun run dev` (PowerShell).

Les réglages (instance, taille de la fenêtre) sont dans `settings.json`, dans le dossier de données de l'app :

- Windows : `%APPDATA%\Omni365`
- macOS : `~/Library/Application Support/Omni365`
- Linux : `~/.config/Omni365`

## Structure

```
src/
  main.ts            processus principal : fenêtre, sécurité, permissions, IPC, mises à jour
  settings.ts        instance et état de la fenêtre, vérification d'une instance
  deep-link.ts       omni365:// → /protocol-handler
  menu.ts            menu de l'application et icône de la barre des tâches
  screen-picker.ts   sélecteur d'écran pour getDisplayMedia()
  messages.ts        textes FR (référence) et EN
  preload.ts         pont exposé à l'app web : window.omni365Desktop,
                     et aux pages locales : window.omni365Local
  pages/             page de premier lancement et sélecteur d'écran
scripts/build.ts     bundle Bun vers dist/ (electron-updater compris : aucun node_modules n'est embarqué)
electron-builder.yml packaging
```

### Pont vers l'app web

Les pages de l'instance voient `window.omni365Desktop` :

```ts
window.omni365Desktop?.platform;          // "win32" | "darwin" | "linux"
window.omni365Desktop?.focus();           // affiche et met au premier plan la fenêtre
window.omni365Desktop?.setBadgeCount(3);  // badge de l'icône (macOS, Linux Unity)
```

Le preload enveloppe aussi `window.Notification` pour qu'un clic appelle `focus()`, sans que l'app web ait à le faire. L'app web n'appelle pas encore `setBadgeCount` : le badge des non-lus est la prochaine étape côté `omni365-client`.

## Construire les installateurs

```sh
bun run dist
```

Les fichiers arrivent dans `release/` :

| OS | Format |
|---|---|
| Windows | `Omni365-Setup-x.y.z.exe` (NSIS, installation par utilisateur) |
| macOS | `.dmg` et `.zip` universels (Intel + Apple Silicon) |
| Linux | `.AppImage` et `.deb` |

Chaque OS se construit sur son propre système : le `.dmg` sur un Mac, et ainsi de suite. La CI s'en charge.

## Publier une version

1. Changer `version` dans `package.json`, puis faire un commit.
2. Créer le tag et le pousser : `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. Le workflow **Release** construit les trois OS et publie les installateurs, avec les fichiers `latest*.yml` que lit `electron-updater`, dans la release GitHub du tag.

Le dépôt de publication est défini dans `publish` de `electron-builder.yml`. Pour les mises à jour automatiques, les releases doivent être lisibles par les postes clients : un dépôt public, ou un serveur de mise à jour générique.

### Signature du code

Sans signature, les installateurs fonctionnent, mais Windows (SmartScreen) et macOS (Gatekeeper) affichent un avertissement. Les secrets GitHub à définir :

| Secret | Usage |
|---|---|
| `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD` | Certificat « Developer ID Application » (.p12 en base64) |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Notarisation Apple |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | Certificat de signature Windows (.pfx en base64) |

Pour Windows, [Azure Trusted Signing](https://www.electron.build/code-signing-win#using-azure-trusted-signing-beta) coûte moins cher qu'un certificat EV. Il se configure dans `win.azureSignOptions`.
