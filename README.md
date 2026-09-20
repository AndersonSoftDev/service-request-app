# Customer Service Request Portal

React + TypeScript + Vite. The interface is in English.

## Development

~~~sh
npm install
npm run dev
~~~

Commands: npm run build, npm run lint, npm test, npm run preview.

## Configure OIDC

Copy .env.example to .env.local and supply your provider's public configuration:

- VITE_OIDC_AUTHORITY: issuer URL, including the realm/tenant path if required.
- VITE_OIDC_CLIENT_ID: public SPA client identifier.
- VITE_OIDC_REDIRECT_URI: this application's origin followed by /auth/callback.
- VITE_OIDC_POST_LOGOUT_REDIRECT_URI: this application's origin followed by /login.

Restart Vite after editing environment variables. Register both redirect URLs
exactly in your provider, enable Authorization Code with PKCE (S256), and allow
the application origin for discovery/token requests (CORS). Use a public client,
with no client secret. Production URLs require HTTPS; HTTP is allowed for localhost.
The provider must publish discovery metadata and support RP-initiated logout.

VITE variables are public browser configuration, never secrets. Local environment
files are ignored by Git. No real configuration or credentials are included.

## Authentication flow

1. Sign in calls UserManager.signinRedirect.
2. The SDK discovers provider endpoints and initiates Authorization Code + PKCE.
3. The provider returns to the public /auth/callback route.
4. AuthProvider calls completeLogin; the SDK checks protocol state and exchanges
   the authorization code. A shared promise prevents double redemption in StrictMode.
5. The context receives the profile and the callback redirects to /requests.
6. Logout delegates to signoutRedirect, clears the SDK's local session, and
   returns from the provider to /login.

The SDK manages user/session and transient protocol storage in sessionStorage.
No application code writes credentials or tokens manually. Session restoration
runs before protected-route decisions. Expired or missing access tokens are
treated as unauthenticated. SDK events update the context on expiry and logout.

Automatic silent renewal is deliberately disabled to keep this challenge simple:
an expired session requires another sign-in. There is no hidden iframe callback
or refresh-token integration. Provider SSO can still simplify the next sign-in.

AuthService exposes login, logout, getUser, isAuthenticated, getAccessToken,
completeLogin, and subscribe. The React context exposes the basic profile only;
future HTTP code can obtain a valid access token through getAccessToken.
API authorization must still be enforced by the backend.

Missing configuration leaves the login UI usable and shows a friendly message
on sign-in. Callback failures show a generic error and a Return to login link;
provider details and tokens are never rendered.

## Routes

Public: /login and /auth/callback.
Protected: /requests, /requests/new, /requests/:requestId.
/requests provides the local mock list. Creation and detail routes remain placeholders;
no real Service Requests API endpoints have been integrated. Authenticated visitors to /login go to /requests.

Production hosting must serve index.html for SPA routes, including /auth/callback.

## Verification

npm test covers OIDC configuration/session behavior, the list service contract,
and page interactions, including debounce, filters, pagination, retry, and stale responses.
Tests use SDK mocks only; production authentication never uses fake sessions.
Real provider sign-in/logout must be checked with your registered OIDC client.

SDK reference: https://authts.github.io/oidc-client-ts/classes/UserManager.html

## Service requests list (local mock)

The list uses this boundary:

RequestsPage → useServiceRequests → serviceRequestService → getMockServiceRequests

Centralized types in src/types/serviceRequest.ts match the supplied API contract.
The dedicated mock dataset has 28 fixed records, all statuses/priorities, example.com
addresses, and UTC timestamps. The mock applies case-insensitive substring search
to title/requester name, combines status and priority, sorts, then paginates.
It simulates 250 ms latency and never sends a token or makes a network request.

Pagination is one-based (default page 1, pageSize 10; allowed size 1–100).
Invalid numeric pagination rejects with a RangeError. Pages beyond the result
range return an empty items array without changing total/totalPages.
Priority sorting uses LOW < MEDIUM < HIGH < CRITICAL. Ties use request ID for
deterministic ordering. No matches return total 0, totalPages 0, and items [].

The UI debounces search by 350 ms. Filters, sort, and page-size changes reset page
to 1; page navigation preserves filters. Clear filters also restores newest-first
sorting while retaining the selected page size. The page-size selector remains
available when there is only one page, even though Previous/Next are hidden.
Dates display in UTC. Cards link to the existing protected detail placeholder.

The hook ignores superseded responses and exposes data, loading, error, and
refetch. Skeletons, retry, and distinct empty states are included. Error behavior
is tested with service mocks; there are no random production mock failures.
Authentication and Keycloak configuration are unchanged.

## Replace the mock with HTTP later

VITE_API_BASE_URL is intentionally empty and unused by the mock. Once the API
contract/environment is confirmed, change the delegation in
src/services/serviceRequestService.ts to a real GET /requests implementation:

1. Read and validate VITE_API_BASE_URL.
2. Serialize defined ServiceRequestFilters as query parameters.
3. Reuse authService.getAccessToken() for Authorization: Bearer when integrating
   authenticated HTTP. Never introduce separate token storage, scopes, or audiences.
4. Handle non-success responses and return ServiceRequestPage.

The components and hook retain their interfaces. Filtering, sorting, and
pagination will then be performed by the real API. No backend, API URL, creation,
status-update, or request-detail implementation is included in this task.
