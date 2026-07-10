// Google Sign-In helper (Google Identity Services)
// Loads Google's script on demand and opens the account-picker popup.
// Resolves with an access token that the backend verifies via /api/auth/google.

const GSI_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise = null;

const loadGsiScript = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load Google sign-in. Check your internet connection."));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

/**
 * Opens the Google sign-in popup and resolves with an access token.
 * Requires VITE_GOOGLE_CLIENT_ID in the .env file.
 */
export const signInWithGoogle = async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Google sign-in isn't configured yet (VITE_GOOGLE_CLIENT_ID missing in .env)."
    );
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || "Google sign-in failed."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (err) => {
        // Fired when the popup is closed or blocked
        reject(new Error(err?.message || "Google sign-in was cancelled."));
      },
    });

    tokenClient.requestAccessToken();
  });
};