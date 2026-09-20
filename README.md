# Customer Service Request Portal

A responsive single-page application for managing customer service requests,
built for the Web Developer technical challenge. Users sign in through an OIDC
provider, then browse, search, filter, sort and paginate requests, open one,
create a new one, and move a request through its status workflow with optimistic
concurrency.

**The Service Request API was not available while this was built.** The
application is implemented against the provided OpenAPI contract and currently
uses an in-memory mock behind a service boundary, so a real HTTP implementation
can replace it without touching the UI. See [API mocking approach](#api-mocking-approach).

## Features

- OIDC sign-in and sign-out (Authorization Code + PKCE) with protected routes.
- Paginated request list with case-insensitive search by title or requester name.
- Combinable status and priority filters, six sort orders, page sizes 1-100.
- Request details on their own URL, including direct navigation and not-found handling.
- Create a request, validated against the contract before and inside the service.
- Status updates limited to valid transitions, with `version` optimistic
  concurrency, 409 conflict detection and an explicit reload-and-retry flow.
- Loading, empty, filtered-empty, validation, authentication and API error states.
- Responsive layouts for desktop, tablet and mobile.
- Automated tests, ESLint, and a GitHub Actions pipeline.

## Technology and library choices

| Choice | Why |
| --- | --- |
| React 19 + TypeScript | Required by the challenge. Strict typing across the API contract, service layer and UI. |
| Vite 8 | Dev server and production build; the test runner shares its transform pipeline. |
| React Router 7 | The required client-side routing solution, including protected and parameterised routes. |
| oidc-client-ts 3 | The OIDC protocol flow is delegated to this library: discovery, PKCE, protocol state and session storage. |
| Vitest 5 + happy-dom | Test runner aligned with Vite. Components are rendered with React's own `createRoot` and `act` rather than a testing-library wrapper, keeping the dependency list small. |
| ESLint 10 + typescript-eslint | Linting, including the React Hooks rules. |
| Plain CSS per page | The UI is small and consistent; a component or utility framework would add weight without improving it. |

No Redux, Zustand, React Query, Formik, validation library or HTTP client: the
application uses local React state and custom hooks because the current scope
does not require global state management. Validation rules live in `src/domain`,
shared by the form and the service.

## Architecture

```
React pages and components
        |
hooks (useServiceRequests, useServiceRequest)
        |
service layer (src/services/serviceRequestService.ts)
        |
mock implementation (src/services/mock/*)
        |
shared in-memory store (serviceRequestStore.ts)
```

| Folder | Responsibility |
| --- | --- |
| `src/types` | The API contract as TypeScript types. |
| `src/domain` | Business rules shared by the UI and the service: status transitions, create-request limits and validation, code-point length counting. Single source of truth, so no rule is restated in a component. |
| `src/services` | The only boundary the UI talks to, the mock behind it, and the typed `ServiceRequestError`. |
| `src/hooks` | Async loading lifecycles, including ignoring superseded responses. |
| `src/pages`, `src/components` | UI and layout. |
| `src/auth` | OIDC configuration, session service, context and route guard. |

The UI never imports anything from `src/services/mock`; it only knows the
service functions and the typed error.

## Running the project

~~~sh
npm install
npm run dev
~~~

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (http://localhost:5173). |
| `npm test` | Full Vitest suite, once. |
| `npm run lint` | ESLint over the repository. |
| `npm run build` | Type-check (`tsc -b`) and production build. |
| `npm run preview` | Serve the built bundle locally. |

## Environment variables

Copy `.env.example` to `.env.local` and supply your provider's public
configuration. Restart Vite after editing it.

| Variable | Required | Meaning |
| --- | --- | --- |
| `VITE_OIDC_AUTHORITY` | Yes | Issuer URL, including the realm/tenant path if the provider uses one. |
| `VITE_OIDC_CLIENT_ID` | Yes | Public SPA client identifier. |
| `VITE_OIDC_REDIRECT_URI` | Yes | This application's origin followed by `/auth/callback`. |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Yes | This application's origin followed by `/login`. |
| `VITE_API_BASE_URL` | No | Base URL of the Service Request API. **Currently unused**: the app runs on the mock service because the real API is unavailable. It is kept so the future HTTP implementation has a documented home. |

`VITE_` variables are bundled into the browser and are therefore public
configuration, never secrets. `.env`, `.env.local` and other local environment
files are ignored by Git; only `.env.example` is committed, with placeholders.

## OIDC provider configuration

Register a **public** client (no client secret) and enable Authorization Code
with PKCE (S256). Register both redirect URLs exactly as configured above, allow
this application's origin for discovery and token requests (CORS), and enable
RP-initiated logout. The provider must publish discovery metadata.

 The configuration is validated at startup: a missing or malformed value leaves the
login page usable and shows an explanatory message instead of failing silently.

## Testing

~~~sh
npm test
npm run lint
npm run build
~~~

The suite is 200 tests across 11 files.

**Strategy.** Two layers, both exercising real code:

- *Service and domain tests* drive the real mock through the public service
  functions with fake timers, asserting the contract itself: search, filter and
  sort combinations, pagination bounds and invalid page arguments, every status
  transition and every rejected one, version conflicts, create-request validation
  at each boundary, and store persistence and isolation.
- *UI tests* render the real `<App />` with the router and drive real DOM events.
  Only the OIDC SDK adapter is replaced, so routing, the route guard, hooks, the
  service and the shared store all run for real. Assertions are behavioural:
  what the user sees, what reaches the service, and what the store holds
  afterwards.

The service is spied on only to inject failures the mock cannot produce, such as
500, 401/403 or an unexpected exception. The mock store is reset between tests so
each one is deterministic. The suite mocks the OIDC SDK adapter rather than
contacting a provider; the real sign-in and sign-out flow was verified manually
against a local Keycloak realm.

## Continuous integration

`.github/workflows/ci.yml` is in place and passing. It runs on pushes to `main`
and `dev`, on pull requests, and on manual dispatch. Each run performs:

1. Checkout.
2. Node.js 22 setup with an npm cache.
3. Dependency installation with `npm ci`.
4. ESLint (`npm run lint`).
5. Vitest tests (`npm test`).
6. Production build (`npm run build`).
7. Upload of the generated `dist` artifact.

CI needs no OIDC credentials or provider secrets. The `VITE_` values are public
configuration that Vite inlines at build time, and CI only verifies that the
project lints, tests and compiles; a deployment build supplies the values for
its target environment.

## API mocking approach

The application was implemented against the provided OpenAPI contract. The real
backend endpoint was not available, so the frontend talks to a mock
implementation instead. The mock exposes the same conceptual operations as the
API - list, get by ID, create, and update status - through the same service
boundary:

```
 UI -> service layer -> mock implementation -> shared in-memory store
```

The future production shape changes only the third box:

```
React UI -> service layer -> HTTP implementation -> Service Request API
```

- All four operations read and write **one shared in-memory store**, so a created
  request is immediately listable, openable and ready for a status change.
- Changes persist for the current application session.
- The mock reproduces the contract's validation and business rules rather than
  accepting anything: create-request field limits, the status transition table,
  and note length.
- Optimistic concurrency is simulated through `version`: the client sends the
  version it last read and the mock compares it with the stored one.
- Submitting a stale version produces a real 409 conflict, which the UI handles
  with an explicit reload rather than a retry.
- The UI depends on none of this: it imports the service functions and the typed
  `ServiceRequestError`, never anything under `src/services/mock`.
- Replacing it with HTTP touches only `serviceRequestService.ts`; hooks, pages,
  components and tests keep their interfaces. See
  [Replace the mock with HTTP later](#replace-the-mock-with-http-later).

## Security considerations

- Authorization Code with PKCE (S256), a public client, and no client secret
  anywhere in the repository or the bundle.
  The React context exposes only the basic profile.
- Redirect URIs are validated at startup against this application's own origin
  and fixed callback paths, and must be HTTPS outside localhost.
- Protected routes wait for session restoration before deciding, so no protected
  data is fetched or rendered for an unauthenticated visitor.
- Expired or missing access tokens are treated as unauthenticated, and SDK events
  update the session on expiry and logout.
- Error messages are mapped to fixed strings; raw exceptions never reach the DOM.
- Client-side route protection is a usability measure. Real authorization must
  still be enforced by the API.

- Semantic HTML first: landmarks, headings, lists, `<form>`, `<label>`, `<time>`,
  native buttons and links, with ARIA only where the native element cannot say it.
- Every input, select and textarea has an associated label; validation messages
  are linked with `aria-describedby` and marked with `aria-invalid`.
- Errors use `role="alert"`; progress and results use `role="status"`, and
  in-flight forms are `aria-busy`.
- Status and priority are conveyed by text, not colour alone; error and success
  states carry wording and icons as well as colour.
- Visible focus outlines on every interactive control, a skip link to the main
  content, and full keyboard operation.
- Disabled controls during submission prevent duplicate actions and are announced
  through the live regions rather than by appearance only.

## Known limitations

- The real Service Request API was not provided, so no HTTP implementation
  exists. Every call goes to the mock.
- The mock store is in memory. It is seeded when the module loads, so a browser
  reload restores the 28 seeded fixtures and discards created requests and status
  changes made in that session.
- Generated IDs continue the seeded sequence (`REQ-1029`, `REQ-1030`, ...) and are
  unique per session only, because there is no server to allocate them.
- Running the app requires your own OIDC provider and realm. Without
  configuration the login page explains that sign-in is unavailable.
- Silent token renewal is deliberately disabled; an expired session requires
  signing in again.
- 401 and 403 are represented and mapped to messages, but the mock never emits
  them, so those paths are covered only by tests with injected errors.

## Routes

Public: /login and /auth/callback.
Protected: /requests, /requests/new, /requests/:requestId.
/requests lists the mock data, /requests/:requestId shows one request with its
status update form, and /requests/new creates one. Authenticated visitors to
/login go to /requests.