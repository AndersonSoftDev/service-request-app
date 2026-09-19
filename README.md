# Customer Service Request Portal

React, TypeScript, and Vite SPA. The interface is in English.

## Development

~~~sh
npm install
npm run dev
~~~

- npm run build: type-check and build for production.
- npm run lint: run ESLint.
- npm run preview: serve the production build locally.

## Routes

- /login: responsive login page.
- /requests: protected workspace placeholder for the future service request page.
- Other paths redirect to /requests, then /login when unauthenticated.

Configure production hosting to serve index.html for SPA routes.

## Authentication integration

src/auth/authService.ts defines the AuthService contract: getUser, login, and logout.
The default adapter has no configured identity provider, returns no session, and
rejects login/logout. The login page displays a friendly unavailable message.
It never creates fake users, stores tokens, or accepts passwords.

Implement this contract with an OIDC provider SDK and inject the adapter through
AuthProvider's service prop in App.tsx. The SDK must handle authorization redirects,
callback processing, token validation, session renewal, and logout. getUser must
resolve only after session initialization/callback processing completes. Map the
provider subject to AuthUser.id and optionally supply name and email. Configure
the provider's registered callback/logout URLs when integrating it.

After a successful login or restored session, /login redirects to /requests.
AuthProvider exposes session, loading, errors, login, and logout. ProtectedRoute
waits for session initialization before redirecting. Concurrent login/logout
attempts are blocked. Errors shown in the UI never expose provider details.

The route guard controls client navigation only. Future API integrations must
enforce authentication on the server; no backend or API endpoints are added here.

Routing uses React Router's declarative API:
https://reactrouter.com/start/declarative/routing
