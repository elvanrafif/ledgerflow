import { setupServer } from "msw/node";

/**
 * Shared MSW server for component tests. Individual tests register handlers with
 * `server.use(...)`. Unhandled requests are an error, so a test that forgets to
 * mock an endpoint fails loudly instead of silently hitting the network.
 */
export const server = setupServer();