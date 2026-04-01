# High level steps for project

Part 1: Plan

Enrich this document to plan out each of these parts in detail, with substeps listed out as a checklist to be checked off by the agent, and with tests and success critieria for each. Also create an AGENTS.md file inside the frontend directory that describes the existing code there. Ensure the user checks and approves the plan.

Decisions (locked):
- Frontend test stack: Vitest for unit/integration, Playwright for E2E.
- AI Structured Outputs format: operation list (response text plus list of card operations: create/update/move/delete).

Part 2: Scaffolding (Complete)

Set up the Docker infrastructure, the backend in backend/ with FastAPI, and write the start and stop scripts in the scripts/ directory. This should serve example static HTML to confirm that a 'hello world' example works running locally and also make an API call.
Status: Completed on 2026-04-01.

Part 3: Add in Frontend (Complete)

Now update so that the frontend is statically built and served, so that the app has the demo Kanban board displayed at /. Comprehensive unit and integration tests (Vitest) plus E2E coverage (Playwright).
Status: Completed on 2026-04-01.

Part 4: Add in a fake user sign in experience (Complete)

Now update so that on first hitting /, you need to log in with dummy credentials ("user", "password") in order to see the Kanban, and you can log out. Comprehensive tests (Vitest unit/integration + Playwright E2E).
Status: Completed on 2026-04-01.

Part 5: Database modeling

Now propose a database schema for the Kanban, saving it as JSON. Document the database approach in docs/ and get user sign off.

Part 6: Backend

Now add API routes to allow the backend to read and change the Kanban for a given user; test this thoroughly with backend unit tests. The database should be created if it doesn't exist.

Part 7: Frontend + Backend

Now have the frontend actually use the backend API, so that the app is a proper persistent Kanban board. Test very throughly (Vitest unit/integration + Playwright E2E).

Part 8: AI connectivity

Now allow the backend to make an AI call via OpenRouter. Test connectivity with a simple "2+2" test and ensure the AI call is working.

Part 9: Now extend the backend call so that it always calls the AI with the JSON of the Kanban board, plus the user's question (and conversation history). The AI should respond with Structured Outputs that includes the response to the user and optionaly an update to the Kanban. Test thoroughly.

Structured Outputs format: operation list model (response text plus list of card operations: create/update/move/delete) applied to the current board state.

Part 10: Now add a beautiful sidebar widget to the UI supporting full AI chat, and allowing the LLM (as it determines) to update the Kanban based on its Structured Outputs. If the AI updates the Kanban, then the UI should refresh automatically. Use the same operation list Structured Outputs format.
