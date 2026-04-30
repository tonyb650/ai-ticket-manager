import path from "path";

export const ADMIN_AUTH_FILE = path.join(__dirname, "..", ".auth", "admin.json");
export const AGENT_AUTH_FILE = path.join(__dirname, "..", ".auth", "agent.json");

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";
export const AGENT_EMAIL = process.env.AGENT_EMAIL ?? "agent@test.local";
export const AGENT_PASSWORD = process.env.AGENT_PASSWORD ?? "test-agent-password";

export const TEST_SERVER_URL = "http://localhost:3031";
