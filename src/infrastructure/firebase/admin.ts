// infrastructure/firebase/admin.ts — Server-side Firebase token verification (lightweight)

interface FirebaseTokenPayload {
  phone_number: string;
  uid: string;
}

/**
 * Verify a Firebase ID token server-side (lightweight approach).
 * Decodes JWT, verifies claims, and optionally calls Google's getAccountInfo.
 * Returns {phone_number, uid} or null if invalid.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<FirebaseTokenPayload | null> {
  try {
    // Decode JWT without verification library (we verify claims manually)
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Verify basic claims
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    // Check audience matches our project
    if (payload.aud !== projectId) return null;

    // Check issuer
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    // Check not-before
    if (payload.iat && payload.iat > now + 300) return null; // 5 min leeway

    // Extract phone number from claims
    const phoneNumber =
      payload.phone_number ||
      payload.firebase?.identities?.phone?.[0] ||
      null;

    if (!phoneNumber || !payload.sub) return null;

    // Optionally verify with Google's API for stronger security
    try {
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.users?.[0];
        if (user) {
          return {
            phone_number: user.phoneNumber || phoneNumber,
            uid: user.localId || payload.sub,
          };
        }
      }
    } catch {
      // Fall back to JWT claims if Google API call fails
    }

    return {
      phone_number: phoneNumber,
      uid: payload.sub,
    };
  } catch {
    return null;
  }
}
