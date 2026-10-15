# LedgerFlow — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** MVP implemented and refactored (moderate SOLID pass, behavior-preserving). Milestones 1–4 done (backend, auth/transactions, business rules, frontend), verified against a live stack. Milestone 5 (release) in progress: security review, API docs, deploy assets, and CI are ready; deployment, screenshots, and the manual visual pass remain.  
**Product Type:** Full-stack Web Application  
**Primary Goal:** Demonstrate practical full-stack engineering skills through a working transaction management application.

## 1. Product Overview

LedgerFlow is a web application for managing simulated financial transactions. Users can create transactions, monitor their statuses, search and filter transaction records, and review transaction status history.

The application demonstrates frontend development, backend API design, database modeling, authentication, authorization, business logic, data consistency, automated testing, and deployment. It does not process real payments, transfer money, or integrate with banking networks.

## 2. Problem Statement

Basic CRUD applications do not adequately demonstrate authentication and resource ownership, business rules and state transitions, duplicate requests and idempotency, database consistency across related records, validation and error handling, automated API testing, or frontend/backend integration. LedgerFlow addresses these through a small but complete transaction-management workflow.

## 3. Goals and Non-Goals

### Goals
1. Deliver a usable responsive full-stack application.
2. Implement a versioned REST API using Express and TypeScript.
3. Persist data in PostgreSQL.
4. Enforce authentication and resource-level authorization.
5. Implement transaction status workflows and audit history.
6. Prevent duplicate transaction creation using idempotency keys.
7. Provide automated tests for important business rules and API behavior.
8. Deploy the application and document its architecture and setup.

### Non-Goals
No real payments/bank integrations, money movement/settlement, real financial ledger accounting or balance management, multi-tenant organizations/team management, third-party payment gateways, background job queues/microservices, real-time notifications, advanced analytics, or machine learning.

## 4. Target Users

**Primary:** Registered users managing their own simulated transactions: create, view details, filter records, and initiate permitted status transitions.  
**Secondary:** Recruiters and engineering interviewers reviewing the repository, running it locally, inspecting API behavior and decisions, and trying the deployed demo.

## 5. Scope and Priority

### P0 — Required for MVP
Registration and login; session-based authentication and logout; transaction creation/list/detail/permitted editing; status transitions and audit history; dashboard summary; pagination, search, filtering and sorting; input validation and consistent API errors; ownership enforcement; idempotent creation; unit and integration tests; local development instructions and deployment.

### P1 — Only if time permits
End-to-end browser tests, CI for lint/typecheck/tests, CSV export, and improved empty states/accessibility polish. P1 must not delay P0.

## 6. Functional Requirements

### FR-01: User Registration
Register with name, email, password. All required; normalize and uniquely constrain email; securely hash passwords; structured validation errors; duplicate email rejected; never expose hashes. Valid registration creates a user; duplicate returns conflict; invalid payload is rejected; plaintext passwords are never stored or returned.

### FR-02: Authentication and Session Management
Users log in, retrieve their profile, and log out using server-managed sessions. Set appropriate cookie security attributes; protected endpoints require a valid session; logout invalidates it. Unauthenticated access is denied; valid login establishes a session; profile returns public user data; old session fails after logout.

### FR-03: Create Transaction
Authenticated users create transactions with description, amount, currency, and an idempotency key in the request header. Amount > 0; currencies IDR/USD/SGD; initial status PENDING; ownership is current user; reference is unique. Valid input returns 201 and is listed. Same key and same payload returns the existing transaction; same key with different payload returns 409.

### FR-04: Transaction List
Users see only their own paginated transactions. Filter by status, search reference, sort creation date ascending/descending; max page size 100. Pagination metadata is accurate; filters/sorting combine; invalid query parameters return validation errors.

### FR-05: Transaction Details
Return details, status, timestamps, and status history. Owners can view; other users cannot; nonexistent and inaccessible records return appropriate not-found responses.

### FR-06: Update Transaction
Only description is editable, and only while PENDING. Amount, currency, reference, and ownership cannot change. Validate ownership and status. Protected-field attempts are rejected or ignored per documented contract; other-user edits are forbidden.

### FR-07: Transaction Status Workflow
Permitted: PENDING→PROCESSING, PENDING→FAILED, PROCESSING→COMPLETED, PROCESSING→FAILED. COMPLETED and FAILED are terminal. Validate on backend. Update status and append history atomically; record initiating user. Invalid transitions return 409. These are simulated actions, not real payment processing.

### FR-08: Transaction Status History
Each record includes previous status (if any), new status, initiating user, optional note, timestamp. Initial PENDING is recorded; application API is append-only; visible only to owner. Creation adds initial history; each valid transition adds one; public endpoints cannot edit/delete it.

### FR-09: Dashboard Summary
Show total transaction count, count by status, and nominal transaction value. Scope to current user. Group totals by currency; never mix currencies or imply conversion. Counts match records.

### FR-10: API Error Handling
Consistent response shape; distinguish validation, authentication, authorization; expected business conflicts use 409; unexpected production errors expose no stack/database internals; stable error code and readable message.

## 7. Core User Journeys

**Create:** login → dashboard → create form → enter description/amount/currency → frontend basic validation → backend validation/business rules → transaction and initial history → display result.  
**Track:** open list → filter/search → detail/history → initiate permitted transition → see updated status/history.  
**Retry safely:** send create request with idempotency key → transaction created → retry after lost response → existing transaction returned without duplicate.

## 8. Frontend Requirements

Pages: `/login`, `/register`, `/dashboard`, `/transactions`, `/transactions/new`, `/transactions/[id]`. Responsive desktop/mobile; clear navigation; status badges; loading indicators; empty states; validation/API errors; confirmation for consequential transitions; accessible labels and keyboard navigation. Use Next.js with TypeScript, reusable UI components, centralized API client, shared types where useful, explicit loading/success/empty/error states, and session-cookie authentication compatible with API configuration. Frontend is not source of truth for authorization/business rules.

## 9. Backend and API Requirements

Express with TypeScript; REST under `/api/v1`; feature-based modules; separate routes/controllers/services/repositories; Zod validation for bodies/params/queries; PostgreSQL primarily through Prisma; parameterized raw SQL; centralized error middleware; authentication/authorization middleware; useful structured logs without sensitive data; health endpoint; environment configuration.

## 10. Database Requirements

Entities: Users, Transactions, Transaction status history. Constraints: unique normalized email; unique transaction reference; unique `(user ID, idempotency key)`; foreign keys; positive amount; valid status/currency; indexes for user-scoped lists and status filters. Use PostgreSQL NUMERIC for money; avoid JavaScript floating-point arithmetic for money.

## 11. Security Requirements

Hash passwords using Argon2id or appropriately configured bcrypt; secure server-managed sessions; HttpOnly, Secure, appropriate SameSite cookies; restrict CORS to configured frontend origin; protect cookie-authenticated state changes against CSRF; validate untrusted input server-side; enforce ownership in protected queries; parameterized DB operations; rate limit login and sensitive endpoints; keep secrets out of source; generic production unexpected errors; never log passwords, session IDs, or credentials.

## 12. Testing Requirements

**Unit:** status transitions, amount validation, idempotency payload comparison, editing rules, business-service behavior.  
**Integration:** registration/login, protected endpoints, creation/list, two-user authorization, status/history atomicity, idempotency/duplicate prevention, pagination/filtering.  
**Frontend:** form validation, loading/empty/error states, list interactions, critical login/transaction workflows. Tools may include Vitest, Supertest, React Testing Library, Playwright.

## 13. Non-Functional Requirements

Documented local run; migrations manage schema; typecheck/lint pass before release; consistent API errors; responsive desktop/mobile; production secrets separate from code; automated coverage for core rules; deployed demo uses synthetic data only. No formal high-scale throughput or availability target.

## 14. Deployment and Deliverables

Git repository with frontend/backend; PostgreSQL schema/migrations; synthetic seed script; documented `.env.example` without real secrets; automated tests; Docker Compose local development; deployment instructions; README architecture/features/setup/limitations; live demo URL; API examples or docs; screenshots and short demo walkthrough.

## 15. Implementation Milestones

1. **Foundation:** initialize repository/apps; configure TypeScript/lint; PostgreSQL/Prisma; schema/migrations/seed; health check/error handling. — **Done.**
2. **Authentication and Transactions:** registration/sessions; create/list; authorization/validation; initial unit/integration tests. — **Done.**
3. **Business Rules:** transitions; idempotency; history/atomic updates; filtering/pagination/dashboard. — **Done.**
4. **Frontend:** auth pages; dashboard/table; form/detail; API integration/UI states. — **Done.** All six PRD §8 pages built, wired, and verified against a live stack. Found two backend bugs fixed (session cookie path; non-numeric amount returning 500).
5. **Release:** security checks; tests; deployment; setup/API docs; publish demo/portfolio materials. — **In progress.** Security review (`docs/security-review.md`), API reference (`docs/api.md`), README, deploy assets (`apps/api/Dockerfile`, `vercel.json`, `docs/deployment.md`) and CI (`.github/workflows/ci.yml`) are done and verified; dependency advisories reduced to one dev-only. Remaining: deployment + live demo URL (synthetic data only), screenshots/demo walkthrough, and a manual visual pass at mobile + desktop widths.

## 16. Definition of Done

Users register/login/logout and manage only their own simulated transactions; list search/filter/pagination work; invalid transitions rejected; history/status changes persist atomically; idempotent retries do not duplicate; ownership is enforced; core unit/integration tests pass; frontend/backend deployable; README enables local run and documents limitations.

## 17. Future Considerations

CSV export, cursor pagination, enhanced observability, broader E2E coverage, role-based permissions, organization multi-tenancy. Not required for MVP.
