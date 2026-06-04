import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => {
      resolve(false);
    });

    socket.setTimeout(600, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startFacebookBackendIfNeeded() {
  const backendPort = Number(process.env.FB_EXTRACTOR_PORT || 8000);
  const backendDir = path.resolve(process.cwd(), "../fb_downloader");
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || "python";

  return {
    name: "fb-backend-starter",
    async configureServer(server) {
      const alreadyRunning = await portOpen("127.0.0.1", backendPort);
      if (alreadyRunning) {
        console.log(`[@fb-backend-starter] Backend already running at http://127.0.0.1:${backendPort}`);
      } else {
        console.log(`[@fb-backend-starter] Starting backend on http://127.0.0.1:${backendPort}`);
        const backendProcess = spawn(
          pythonExecutable,
          ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", String(backendPort)],
          {
            cwd: backendDir,
            stdio: ["ignore", "inherit", "inherit"],
            env: process.env,
          },
        );

        backendProcess.on("exit", (code, signal) => {
          if (code !== null) {
            console.log(`[@fb-backend-starter] Backend exited with code ${code}`);
          } else if (signal) {
            console.log(`[@fb-backend-starter] Backend killed by signal ${signal}`);
          }
        });

        server.httpServer?.once("close", () => {
          backendProcess.kill("SIGTERM");
        });
      }
    },
  };
}

function articlesContentApi() {
  const filePath = path.resolve(process.cwd(), "src/data/articles.generated.json");

  return {
    name: "articles-content-api",
    configureServer(server) {
      server.middlewares.use("/__content/articles", async (req, res, next) => {
        try {
          const method = String(req.method || "GET").toUpperCase();

          if (method === "GET") {
            const data = readJsonFile(filePath);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(Array.isArray(data) ? data : []));
            return;
          }

          if (method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", () => {
              let incoming = null;
              try {
                incoming = JSON.parse(body || "{}");
              } catch {
                incoming = null;
              }

              const article = incoming?.article;
              if (!article || typeof article !== "object" || typeof article.id !== "string") {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ ok: false, reason: "invalid_article" }));
                return;
              }

              const current = readJsonFile(filePath);
              const list = Array.isArray(current) ? current : [];
              const map = new Map(
                list
                  .filter((v) => v && typeof v === "object" && typeof v.id === "string")
                  .map((v) => [v.id, v]),
              );
              map.set(article.id, article);
              const nextList = Array.from(map.values());

              writeJsonFile(filePath, nextList);

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ ok: true, count: nextList.length }));
            });
            return;
          }

          if (method === "DELETE") {
            const url = new URL(req.url || "", "http://localhost");
            const id = url.searchParams.get("id");
            if (!id) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ ok: false, reason: "missing_id" }));
              return;
            }

            const current = readJsonFile(filePath);
            const list = Array.isArray(current) ? current : [];
            const nextList = list.filter((a) => a && typeof a === "object" && a.id !== id);
            writeJsonFile(filePath, nextList);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, count: nextList.length }));
            return;
          }

          next();
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, reason: "server_error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), articlesContentApi(), startFacebookBackendIfNeeded()],
});
