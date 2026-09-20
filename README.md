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
/requests provides the local mock list; /requests/:requestId shows read-only details. Creation remains a placeholder;
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
Dates display in UTC. Cards link to the protected request details page.

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
pagination will then be performed by the real API. No backend or real API URL is used; every call still goes to the mock.

## Read-only request details

/requests/:requestId reads its ID from the router and works on direct navigation.
RequestDetailsPage → useServiceRequest → getServiceRequestById → existing mock data.

Both mock methods share mockDelay (250 ms). Details return a copy of the record.
Unknown or invalid IDs reject with ServiceRequestNotFoundError (status 404);
the hook distinguishes this from a general failure. The UI provides skeletons,
not-found feedback, retry for general errors, and a Back to requests link.

All model fields are displayed, including the full description and read-only
version. Status/priority badges and UTC date formatting are shared with the list.
Details display date and time with an explicit UTC suffix. Long descriptions
preserve line breaks and wrap; the requester email is a mailto link.
Only the status can be edited here (see Status updates below).

The original list uses local component state. Returning to /requests resets its
filters/page as before; no global state or persistence layer has been introduced.
Authentication and Keycloak configuration are unchanged.

For real integration, replace getServiceRequestById's mock delegation with
GET /requests/{requestId} using VITE_API_BASE_URL and the existing
authService.getAccessToken(). Encode the ID as a URL path segment and map an
HTTP 404 to ServiceRequestNotFoundError. Preserve the Promise<ServiceRequest>
contract; the hook/page need no changes. The real API is not integrated because
its base URL is unavailable.

Details tests cover lookup, 404, latency, record isolation, date formatting,
direct routes, loading, complete rendering, safe errors/retry, list navigation,
logout delegation, route protection, and stale responses. Authentication tests
use a test session adapter; live Keycloak sign-in is not executed by the suite.

## Status updates (PATCH /requests/{requestId}/status)

The details page is the only place a request changes, and only its status changes:

RequestDetailsPage → useServiceRequest.updateStatus → serviceRequestService
→ updateMockServiceRequestStatus → in-memory store

src/domain/serviceRequestStatus.ts is the single source of truth for the allowed
transitions: OPEN → IN_PROGRESS/CLOSED, IN_PROGRESS → RESOLVED/OPEN,
RESOLVED → CLOSED/IN_PROGRESS, and CLOSED → nothing. The selector offers exactly
that table, so the current status is never an update target and a closed request
shows an explanation instead of a form. The service validates the same table
again, so the mock rejects an invalid transition even if the UI is bypassed.

Concurrency is optimistic. The client sends the version it last read; the mock
compares it with the stored version and rejects a mismatch with 409 before
checking anything else. A successful update increments the version by exactly
one, refreshes updatedAt to a new ISO 8601 UTC timestamp, leaves createdAt
alone, and writes the record back to the in-memory store, so the list and later
reads show the change for the rest of the session. resetMockServiceRequests()
restores the fixtures for tests; no conflict is random.

ServiceRequestError carries status 404/409/422 (plus a transition/note
discriminator) so the hook can map failures to messages: a 409 explains that
another user changed the request and offers Reload request, which refetches
through getServiceRequestById and clears the stale attempt without resubmitting
it; a 422 reports the rejected transition or the note limit; a 404 falls back to
the existing not-found view; anything else shows a retryable generic message.
Updates are never optimistic and never retried automatically.

The optional note accepts 1–500 characters, counted in Unicode code points by
statusNoteLength so the counter matches the service validation. An empty note is not
sent. While a submission is in flight the selector, textarea, and buttons are
disabled, the form is aria-busy, a live region announces progress, and the
loaded record stays on screen. Closing a request asks for one inline
confirmation because CLOSED is terminal.

Replace updateMockServiceRequestStatus with PATCH
${VITE_API_BASE_URL}/requests/{requestId}/status, sending the
UpdateServiceRequestStatus body with Authorization: Bearer from
authService.getAccessToken(), and map HTTP 404/409/422 onto the same
ServiceRequestError. The hook, component, and tests need no changes. The real
API is not integrated because its base URL is unavailable.

Status tests cover the transition table, every valid and representative invalid
transition, stale/future versions, two concurrent updates, 404, note lengths
including exactly 500 and astral characters, store persistence and isolation,
and on the UI side the offered options, the closed state, the counter, submit
and disabled states, success with the new version, duplicate-click protection,
the close confirmation, 409 with reload, 422, generic errors, and the list after
an update.

## Create a request (POST /requests)

/requests/new is a protected route reached from Create request on the list. It
replaces the earlier placeholder page:

CreateRequestPage → createServiceRequest → createMockServiceRequest → shared store

src/domain/createServiceRequest.ts holds the contract in one place: the length
limits (title 3–120, description 10–2000, category 2–50, requester name 2–100,
email max 254), the four priorities, and validateCreateServiceRequest, which
returns one message per invalid field. The form runs it before sending anything
and the mock runs it again, so an invalid payload cannot reach the store even if
the form is bypassed. Lengths are counted in Unicode code points, values are
trimmed before validation, and nothing the user typed is silently truncated.

The mock assigns the server-owned fields the API would assign: the next unused
REQ-XXXX id from the shared store, status OPEN, version 1, and createdAt and
updatedAt as the same ISO 8601 UTC timestamp. It writes through the same store
the list, details, and status updates already use, so a new request is
immediately searchable, openable, and ready for a status change in that session.
resetMockServiceRequests() drops created records again for tests.

A 422 carries field errors on ServiceRequestError.fields, which the page maps
back onto the matching inputs; 400, 401, 403, and 500 each map to one readable
sentence and anything else to a generic retryable message, so no raw exception,
undefined, or [object Object] is ever rendered. While a submission is in flight
the controls are disabled, the form is aria-busy, a live region announces
progress, and the entered data stays on screen; a ref guard stops a double click
from sending twice. On success the page navigates to the created request's own
details URL. Cancel returns to the list and submits nothing.

Every input has a label, required fields use the native required attribute with
a visible asterisk and a legend, errors are linked with aria-describedby and
announced with role="alert", and the character counters for title and
description update as the user types. The layout is a two-column grid that
collapses to one column on small screens.

Creation keeps no hook of its own: the existing hooks exist to manage async
loading lifecycles, and a one-shot command needs only a submitting flag, so the
page calls the service directly through the same service boundary.

For the real API, replace the createMockServiceRequest delegation with
POST ${VITE_API_BASE_URL}/requests sending the CreateServiceRequest body with
Authorization: Bearer from authService.getAccessToken(), map 201 to
ServiceRequest and 400/401/403/422/500 to ServiceRequestError. The page needs no
changes. The real API is not integrated because its base URL is unavailable.

Creation tests cover the assigned fields and ID format, mock latency, unique IDs,
every priority, the shortest and longest accepted values, store persistence
through reads/list/filters and a following status update, each documented
validation failure with its field, and on the UI side rendering, counters,
route protection, the list entry point, client-side validation, trimmed
submission, the submitting state, duplicate-submission protection, the created
request appearing in the list, 400/401/403/422/500 and unexpected failures,
retry, and cancel.
