// Google sign-in for the editor (web only), with Google Identity Services: Google's own button
// gives back an ID token, which the server checks (only ADMIN_EMAIL gets in).

export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const KEY = "mc/editor-token";

type Gis = { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void; disableAutoSelect: () => void } } };

let loading: Promise<Gis> | null = null;
const loadGis = () =>
  (loading ??= new Promise<Gis>((resolve, reject) => {
    const w = window as unknown as { google?: Gis };
    if (w.google?.accounts) return resolve(w.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("Google sign-in didn't load.")));
    s.onerror = () => reject(new Error("Google sign-in didn't load."));
    document.head.appendChild(s);
  }));

/** Draws Google's "Sign in" button into `el`; `onToken` gets the ID token once signed in. */
export async function renderGoogleButton(el: HTMLElement, onToken: (token: string) => void) {
  const gis = await loadGis();
  gis.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (r: { credential?: string }) => {
      if (!r.credential) return;
      sessionStorage.setItem(KEY, r.credential);
      onToken(r.credential);
    },
  });
  gis.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "signin_with" });
}

/** The token from this tab's last sign-in (Google's tokens last an hour). */
export const savedToken = () => sessionStorage.getItem(KEY);
export function signOut() {
  sessionStorage.removeItem(KEY);
  loadGis().then((g) => g.accounts.id.disableAutoSelect()).catch(() => {});
}
