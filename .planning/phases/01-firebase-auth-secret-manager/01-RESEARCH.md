# Phase 1: Firebase Auth + Secret Manager - Research

**Researched:** 2026-02-15
**Domain:** Firebase Authentication, GCP Secret Manager, Next.js 16 security
**Confidence:** HIGH

## Summary

Phase 1 requires migrating from a shared bearer token authentication system to Firebase Authentication with email/password signup, implementing server-side session verification on all API routes, and moving all secrets from environment variables and hardcoded fallbacks into GCP Secret Manager. The project uses Next.js 16.1.2 with App Router, React 19, and already has Firebase SDK 12.8.0 and firebase-admin 13.6.0 installed for the Match Pulse feature.

**Key challenge:** Next.js 16 App Router with React Server Components requires a different authentication pattern than traditional Next.js apps. The Data Access Layer (DAL) pattern has emerged as the canonical approach for 2026, requiring authentication verification at every data access point rather than relying solely on middleware.

**Critical compatibility issue:** Firebase Admin SDK depends on Node.js crypto APIs that don't work in Next.js Edge Runtime. The standard solution is `next-firebase-auth-edge` library, which uses Web Crypto API for edge-compatible JWT verification.

**Primary recommendation:** Use `next-firebase-auth-edge` for middleware and server-side token verification, implement a Data Access Layer for centralized auth checks, migrate secrets to GCP Secret Manager with Application Default Credentials for local development, and remove all hardcoded 'dev-token-change-in-production' fallbacks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.8.0 | Client-side Firebase Auth | Official Google Firebase client SDK - already installed |
| firebase-admin | 13.6.0 | Server-side token verification | Official Google Firebase admin SDK - already installed |
| next-firebase-auth-edge | latest | Edge-compatible auth middleware | Solves Firebase Admin + Edge Runtime incompatibility, supports Next.js 16 App Router |
| @google-cloud/secret-manager | latest | GCP Secret Manager client | Official Google Cloud client library for secret management |
| jose | 6.1.3 | JWT signing/verification | Industry standard, already installed, used by next-firebase-auth-edge |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-firebase-hooks | latest | React hooks for Firebase Auth | Optional - simplifies onAuthStateChanged handling in components |
| @google-cloud/storage | 7.18.0 | GCP Storage client | Already installed - may need credentials from Secret Manager |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-firebase-auth-edge | Custom JWT verification | Would need to manually implement Web Crypto JWT verification, handle Firebase public key rotation, manage session cookies - significantly more complex |
| Firebase Auth | Auth.js (NextAuth.js) | Would require migration of existing Firebase Realtime Database Match Pulse feature, not GCP-native |
| GCP Secret Manager | HashiCorp Vault | Additional infrastructure, not GCP-native per prior decision |

**Installation:**
```bash
npm install next-firebase-auth-edge
npm install @google-cloud/secret-manager
npm install react-firebase-hooks  # Optional but recommended
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── firebase-client.ts      # Firebase client config (browser)
│   ├── firebase-admin.ts       # Firebase Admin config (server)
│   ├── auth-dal.ts             # Data Access Layer for auth checks
│   └── secret-manager.ts       # Secret Manager client wrapper
├── middleware.ts               # Auth middleware (root level, not in src/)
├── app/
│   ├── api/
│   │   ├── login/route.ts      # Managed by next-firebase-auth-edge
│   │   ├── logout/route.ts     # Managed by next-firebase-auth-edge
│   │   └── v1/
│   │       └── */route.ts      # API routes use DAL for auth
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── (protected)/
│       └── dashboard/page.tsx  # Protected routes
├── hooks/
│   └── useAuth.ts              # Client-side auth state hook
└── components/
    └── auth/
        ├── SignupForm.tsx
        ├── LoginForm.tsx
        └── AuthProvider.tsx    # Context provider for auth state
```

### Pattern 1: Firebase Client Initialization
**What:** Initialize Firebase client SDK with NEXT_PUBLIC_ prefixed config vars
**When to use:** Client-side components that need auth state
**Example:**
```typescript
// Source: https://firebase.google.com/docs/auth/web/auth-state-persistence
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to LOCAL (default, survives tab close)
setPersistence(auth, browserLocalPersistence);

export { app, auth };
```

### Pattern 2: Data Access Layer (DAL) for Auth
**What:** Centralized auth verification at every data access point
**When to use:** All server-side data fetching, API routes, server actions
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// src/lib/auth-dal.ts
import { getTokens } from 'next-firebase-auth-edge';
import { cookies } from 'next/headers';

export async function verifyAuth() {
  const tokens = await getTokens(cookies(), {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    cookieName: 'AuthToken',
    cookieSignatureKeys: [process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT],
    serviceAccount: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
  });

  if (!tokens) {
    throw new Error('Unauthorized');
  }

  return tokens.decodedToken;
}

// Usage in API route:
export async function GET() {
  const user = await verifyAuth(); // Throws if not authenticated
  // ... fetch user-specific data
}
```

### Pattern 3: Middleware Auth Guard
**What:** Edge runtime middleware for route protection
**When to use:** First line of defense, redirect unauthenticated users
**Example:**
```typescript
// Source: https://next-firebase-auth-edge-docs.vercel.app/docs/usage/middleware
// middleware.ts (root level, not in src/)
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from 'next-firebase-auth-edge/lib/next/middleware';

const PUBLIC_PATHS = ['/', '/login', '/signup'];

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: '/api/login',
    logoutPath: '/api/logout',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: 'AuthToken',
    cookieSignatureKeys: [process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT!],
    cookieSerializeOptions: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    handleValidToken: async ({ token, decodedToken }, headers) => {
      // User is authenticated, allow request
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async (reason) => {
      console.info('Invalid token:', reason);
      return NextResponse.redirect(new URL('/login', request.url));
    },
    handleError: async (error) => {
      console.error('Auth middleware error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    },
  });
}

export const config = {
  matcher: ['/api/v1/:path*', '/dashboard/:path*', '/generate/:path*'],
};
```

### Pattern 4: Secret Manager Client
**What:** Centralized secret fetching with caching
**When to use:** Server-side only, at startup or API initialization
**Example:**
```javascript
// Source: https://cloud.google.com/secret-manager/docs/create-secret-quickstart
// src/lib/secret-manager.ts
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();
const cache = new Map();

export async function getSecret(secretName: string): Promise<string> {
  if (cache.has(secretName)) {
    return cache.get(secretName);
  }

  const projectId = process.env.GCP_PROJECT_ID;
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');

  cache.set(secretName, payload);
  return payload;
}

// Usage:
const replicateToken = await getSecret('REPLICATE_API_TOKEN');
```

### Pattern 5: Client-Side Auth State Hook
**What:** React hook for accessing current user and auth state
**When to use:** Client components that need to display user info or conditionally render
**Example:**
```typescript
// Source: https://github.com/CSFrequency/react-firebase-hooks/blob/master/auth/README.md
// src/hooks/useAuth.ts
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase-client';

export function useAuth() {
  const [user, loading, error] = useAuthState(auth);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
  };
}

// Usage in component:
function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <div>Welcome {user.email}</div>;
}
```

### Anti-Patterns to Avoid
- **Middleware-only auth:** Middleware can be bypassed by server actions called from unprotected routes. Always verify auth in the DAL.
- **Prop drilling auth state:** Don't pass user object through component props. Use Context or direct hook calls.
- **Client-side secrets:** Never prefix secret keys with NEXT_PUBLIC_. Only Firebase config (apiKey, projectId, etc.) should be public.
- **Hardcoded fallbacks:** Remove all `|| 'dev-token-change-in-production'` fallbacks. If secret is missing, fail fast with clear error.
- **Using Firebase Admin in Edge Runtime:** Direct firebase-admin calls won't work in middleware. Use next-firebase-auth-edge instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification in Edge Runtime | Custom Web Crypto JWT parser | next-firebase-auth-edge | Handles Firebase public key rotation, token refresh, cookie management, signature validation - complex edge cases |
| Session cookie management | Custom cookie signing/encryption | next-firebase-auth-edge authMiddleware | Handles httpOnly cookies, CSRF protection, key rotation, secure defaults |
| Auth state persistence | Custom localStorage wrapper | Firebase SDK's built-in persistence | Handles synchronization, cross-tab communication, secure storage selection |
| Password validation | Custom regex validators | Firebase Identity Platform password policy | Enforces complexity, length, breach detection, common password prevention |
| Rate limiting for auth endpoints | Custom in-memory rate limiter | Firebase's built-in rate limits + App Check | Firebase automatically rate limits suspicious patterns, App Check prevents abuse |
| Secret rotation | Custom rotation scripts | GCP Secret Manager versioning | Automatic versioning, rotation history, rollback capability, audit logging |

**Key insight:** Authentication is security-critical infrastructure. Libraries like next-firebase-auth-edge have battle-tested edge cases (token refresh race conditions, public key caching, cookie signing key rotation) that would take months to implement correctly. Secret Manager handles versioning, audit trails, and IAM integration that custom solutions miss.

## Common Pitfalls

### Pitfall 1: Forgetting to Verify Auth in Server Actions
**What goes wrong:** Middleware protects routes, but server actions can be called from any route. Unprotected server actions become backdoors.
**Why it happens:** Misunderstanding of Next.js 16 execution model - middleware runs on route navigation, not function calls.
**How to avoid:** Every server action must call `verifyAuth()` from DAL at the top of the function, before any data access.
**Warning signs:** API routes protected by middleware, but server actions in same file don't call verifyAuth.

### Pitfall 2: Edge Runtime + Node.js-only Libraries
**What goes wrong:** Firebase Admin SDK, neo4j-driver, @google-cloud/* packages fail with "crypto module not available" in Edge Runtime.
**Why it happens:** Edge Runtime is V8 isolate-based, doesn't have Node.js built-ins like crypto, fs, net.
**How to avoid:** Use next-firebase-auth-edge for auth in middleware/edge routes. For other services, use Node.js runtime with `export const runtime = 'nodejs'` in route.ts.
**Warning signs:** Build errors about missing crypto, fs, or net modules when using Edge Runtime.

### Pitfall 3: NEXT_PUBLIC_ Prefix on Secrets
**What goes wrong:** Environment variables with NEXT_PUBLIC_ prefix are bundled into client JavaScript and exposed to browsers.
**Why it happens:** Confusion between Firebase client config (which is safe to expose) and API tokens (which must stay server-side).
**How to avoid:** Only use NEXT_PUBLIC_ for Firebase config (apiKey, authDomain, projectId). Never prefix REPLICATE_API_TOKEN, NEO4J_PASSWORD, etc.
**Warning signs:** Searching production client bundle for secret values and finding them in plain text.

### Pitfall 4: Application Default Credentials Not Set Up for Local Dev
**What goes wrong:** Secret Manager and GCP services work in production but fail locally with "auth error" or "missing credentials".
**Why it happens:** Production uses service account credentials from environment, but local dev needs gcloud CLI authenticated.
**How to avoid:** Run `gcloud auth application-default login` for local development. For service account testing, use `gcloud auth application-default login --impersonate-service-account=SA_EMAIL`.
**Warning signs:** "Could not load default credentials" errors when running app locally.

### Pitfall 5: Removing Bearer Token Before Firebase Auth is Working
**What goes wrong:** Breaking all API calls during migration, making incremental testing impossible.
**Why it happens:** Trying to do entire migration in one step instead of gradual rollout.
**How to avoid:** Phase the migration - (1) Add Firebase auth alongside existing bearer token, (2) Test new auth on subset of routes, (3) Remove old auth only after confirming new auth works everywhere.
**Warning signs:** All API tests failing simultaneously after starting migration.

### Pitfall 6: Not Handling Auth State Loading in UI
**What goes wrong:** Flash of unauthenticated content (FOUC) - user sees login screen briefly before app realizes they're logged in.
**Why it happens:** onAuthStateChanged is asynchronous, takes 100-500ms to resolve initial state.
**How to avoid:** Show loading spinner until `loading` is false in useAuthState hook. Don't render protected content or login redirect until auth state is determined.
**Warning signs:** Flickering UI on page load, users reporting brief "not logged in" screens.

### Pitfall 7: Firebase Persistence Set to SESSION Instead of LOCAL
**What goes wrong:** Users must re-login every time they close the browser tab.
**Why it happens:** Explicitly setting `setPersistence(auth, browserSessionPersistence)` when LOCAL is the better default.
**How to avoid:** Use `browserLocalPersistence` (default) for typical web apps. Only use SESSION for kiosk/shared computer scenarios.
**Warning signs:** User complaints about getting logged out when closing browser.

### Pitfall 8: Not Removing Hardcoded Fallbacks from Entire Codebase
**What goes wrong:** Grep returns zero results in src/, but 'dev-token-change-in-production' still exists in .env.example, docs, or scripts.
**Why it happens:** Success criteria only checks src/ directory, missing other locations.
**How to avoid:** Grep entire repository root, not just src/. Check .env.example, CLAUDE.md, docs/, scripts/, server.js.
**Warning signs:** Verification passes but production still accepts hardcoded dev token.

## Code Examples

Verified patterns from official sources:

### Email/Password Signup
```typescript
// Source: https://firebase.google.com/docs/auth/web/auth-state-persistence
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

async function signup(email: string, password: string) {
  const auth = getAuth();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User created:', user.uid);
    return user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters');
    }
    throw error;
  }
}
```

### Email/Password Login with Persistence
```typescript
// Source: https://firebase.google.com/docs/auth/web/auth-state-persistence
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';

async function login(email: string, password: string) {
  const auth = getAuth();

  await setPersistence(auth, browserLocalPersistence); // Persists across tab close

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
}
```

### Server-Side Token Verification
```typescript
// Source: https://firebase.google.com/docs/auth/admin/verify-id-tokens
import { getAuth } from 'firebase-admin/auth';

async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    return { uid, email, decodedToken };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid authentication token');
  }
}
```

### Auth State Listener
```typescript
// Source: https://firebase.google.com/docs/auth/web/auth-state-persistence
import { getAuth, onAuthStateChanged } from 'firebase/auth';

useEffect(() => {
  const auth = getAuth();

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      setUser(user);
      setLoading(false);
    } else {
      // User is signed out
      setUser(null);
      setLoading(false);
    }
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

### Secret Manager Access Pattern
```javascript
// Source: https://cloud.google.com/secret-manager/docs/create-secret-quickstart
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function accessSecret(projectId, secretName) {
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');

  return payload;
}

// Example: Load Replicate token at server startup
const REPLICATE_TOKEN = await accessSecret(process.env.GCP_PROJECT_ID, 'REPLICATE_API_TOKEN');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-firebase-auth | next-firebase-auth-edge | 2023-2024 | Old library doesn't support Next.js 13+ App Router, lacks Edge Runtime compatibility |
| Middleware-only auth | Data Access Layer (DAL) pattern | 2024-2025 | Server actions can bypass middleware, must verify at data access point |
| .env files for secrets | GCP Secret Manager | 2023+ (enterprise) | Audit logs, versioning, rotation, IAM integration not possible with env files |
| firebase-admin directly in middleware | next-firebase-auth-edge wrapper | 2024+ | firebase-admin uses Node crypto (not available in Edge), needs Web Crypto wrapper |
| Custom JWT verification | jose library + Firebase key fetching | 2022+ | Manual verification error-prone, jose is industry standard with active maintenance |
| middleware.ts in src/ | middleware.ts at root | Next.js 13+ | Framework requirement - middleware must be at project root |

**Deprecated/outdated:**
- **next-firebase-auth:** Archived library, doesn't support Next.js App Router or React Server Components. Use next-firebase-auth-edge instead.
- **Firebase Auth REST API direct calls:** Use official SDKs instead - they handle token refresh, key rotation, rate limiting automatically.
- **FIREBASE_CONFIG environment variable:** Firebase SDK 9+ uses individual config vars (apiKey, projectId, etc.) instead of single JSON string.
- **Session cookies via firebase-admin in Edge Runtime:** Use next-firebase-auth-edge's cookie management - firebase-admin depends on Node.js crypto.

## Open Questions

1. **How to handle existing Express server.js during migration?**
   - What we know: Current API calls go through Express proxy server (port 3002), new Next.js API routes exist at /api/v1/*
   - What's unclear: Should we migrate Express routes to Next.js API routes in Phase 1, or keep running both servers?
   - Recommendation: Keep Express server.js running in Phase 1, add Firebase Auth middleware to it alongside Next.js. Plan Phase 2 for full migration to Next.js-only. This allows gradual migration without breaking existing functionality.

2. **Should we enable Firebase Identity Platform's password policy enforcement?**
   - What we know: Default Firebase Auth minimum password is 6 characters, Identity Platform offers configurable policies (10+ chars, complexity requirements)
   - What's unclear: Is Identity Platform included in free tier or does it require billing upgrade?
   - Recommendation: Verify Firebase Identity Platform pricing. If free/included, enable password policy with 10+ character minimum. If paid upgrade, defer to Phase 2 and document minimum 6 characters for MVP.

3. **How to handle rate limiting after removing shared bearer token?**
   - What we know: Current server.js has endpoint-specific rate limiters (100 req/hr semantic match, 20 req/hr council) based on IP address
   - What's unclear: Should rate limiting switch to per-user (Firebase UID) instead of per-IP?
   - Recommendation: Phase 1 keeps IP-based rate limiting for simplicity. Phase 2+ can add per-user rate limiting using Firebase UID from decoded token.

4. **Local development workflow with Secret Manager?**
   - What we know: Production will use Secret Manager, local dev currently uses .env.local
   - What's unclear: Should developers run `gcloud auth application-default login` and fetch real secrets locally, or keep .env.local pattern for local-only overrides?
   - Recommendation: Hybrid approach - create `.env.local.example` with placeholder values, developers either (1) copy to .env.local and manually fill secrets, or (2) run gcloud auth and app automatically fetches from Secret Manager. Document both paths.

5. **Should Firebase config (apiKey, authDomain) go in Secret Manager?**
   - What we know: Firebase client config must be NEXT_PUBLIC_ prefixed (exposed to client), so it's not truly "secret"
   - What's unclear: Is there value in storing non-secret Firebase config in Secret Manager for consistency?
   - Recommendation: No. Keep Firebase client config as NEXT_PUBLIC_ environment variables. Only move server-side secrets (private keys, API tokens) to Secret Manager. This aligns with Firebase's security model - client config is meant to be public.

## Sources

### Primary (HIGH confidence)
- Context7: /websites/firebase_google - Firebase Authentication client SDK
- Context7: /websites/firebase_google_auth_admin - Firebase Admin SDK server-side verification
- [Firebase Auth State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence) - Official persistence documentation
- [Firebase Admin Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) - Official server-side verification
- [GCP Secret Manager Quickstart](https://cloud.google.com/secret-manager/docs/create-secret-quickstart) - Official Node.js usage
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Official Next.js 16 auth patterns

### Secondary (MEDIUM confidence)
- [next-firebase-auth-edge GitHub](https://github.com/awinogrodzki/next-firebase-auth-edge) - Edge Runtime Firebase Auth compatibility library
- [next-firebase-auth-edge Documentation](https://next-firebase-auth-edge-docs.vercel.app/docs/usage/middleware) - Middleware setup patterns
- [Firebase Authentication Limits](https://firebase.google.com/docs/auth/limits) - Rate limits and quotas
- [Firebase Password Best Practices](https://firebase.blog/posts/2020/10/password-sign-in-best-practices/) - Official security recommendations
- [GCP Secret Manager Authentication](https://cloud.google.com/secret-manager/docs/authentication) - Application Default Credentials setup
- [Robust Security & Authentication Best Practices in Next.js 16](https://medium.com/@sureshdotariya/robust-security-authentication-best-practices-in-next-js-16-6265d2d41b13) - Data Access Layer pattern
- [Complete Authentication Guide for Next.js App Router in 2025](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - Modern authentication patterns
- [Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e) - Environment variable security
- [react-firebase-hooks GitHub](https://github.com/CSFrequency/react-firebase-hooks) - React hooks for Firebase Auth state

### Tertiary (LOW confidence)
- [Authenticated Server-Side Rendering with Next.js and Firebase](https://colinhacks.com/essays/nextjs-firebase-authentication) - Colin McDonnell's auth patterns (older, verify with official docs)
- [Firebase Security Rules Best Practices](https://medium.com/@DEVEN99/securing-firebase-authentication-mitigating-vulnerabilities-and-best-practices-593981e61b98) - Community best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries officially supported, versions verified in package.json or official docs
- Architecture: HIGH - Patterns verified in Next.js official docs and next-firebase-auth-edge documentation
- Pitfalls: HIGH - Based on verified Next.js 16 execution model and Firebase Auth documentation
- Secret Manager integration: MEDIUM-HIGH - Official GCP docs verified, but Next.js 16 integration pattern based on general Node.js guidance

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable ecosystem, but Next.js and Firebase Auth libraries update frequently)

**Areas needing validation during implementation:**
- next-firebase-auth-edge compatibility with Next.js 16.1.2 and React 19 (library docs show Next.js 15 support, likely compatible but test in dev)
- GCP Secret Manager pricing for number of secret accesses during development (likely free tier sufficient, verify quota limits)
- Firebase Identity Platform password policy pricing (determine if included in free tier or requires upgrade)
