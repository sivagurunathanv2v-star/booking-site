// Runtime validation coverage for admin access restrictions.
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let apiBaseUrl = "";
let serverProcess: ChildProcess | undefined;

const getAvailablePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Could not determine a local port for the test server."));
        return;
      }

      probe.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });

const postJson = (path: string, body: unknown) =>
  fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("admin access restrictions", () => {
  beforeAll(async () => {
    const port = await getAvailablePort();
    apiBaseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ["index.cjs"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore",
    });

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (serverProcess.exitCode !== null) {
        throw new Error(`Test server exited with code ${serverProcess.exitCode}.`);
      }
      try {
        const response = await fetch(`${apiBaseUrl}/api`);
        if (response.ok) return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    throw new Error("Test server did not become ready within 30 seconds.");
  }, 45_000);

  afterAll(async () => {
    const processToStop = serverProcess;
    if (!processToStop || processToStop.exitCode !== null) return;

    const exited = once(processToStop, "exit").then(() => true);
    processToStop.kill("SIGKILL");
    const stopped = await Promise.race([
      exited,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
    ]);
    if (!stopped) throw new Error("Test server process did not stop after the tests.");
  });

  it("rejects public registration", async () => {
    const response = await postJson("/api/register", {
      email: "unauthorized@example.com",
      password: "not-a-real-password",
    });

    expect(response.status).toBe(403);
  });

  it("rejects public SolarHarvest admin claims", async () => {
    const response = await postJson("/api/solarharvest/admin/claim", {
      username: "unauthorized@example.com",
      password: "not-a-real-password",
    });

    expect(response.status).toBe(403);
  });

  it("rejects login attempts for any other admin identity", async () => {
    const response = await postJson("/api/login", {
      email: "unauthorized@example.com",
      password: "not-a-real-password",
    });

    expect(response.status).toBe(401);
  });

  it("denies unauthenticated access to admin APIs", async () => {
    const legacyResponse = await fetch(`${apiBaseUrl}/api/messages`);
    const bookingResponse = await fetch(`${apiBaseUrl}/api/solarharvest/admin/slots`);

    expect(legacyResponse.status).toBe(403);
    expect(bookingResponse.status).toBe(401);
  });
});
