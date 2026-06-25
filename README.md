# AI-Built Ticket Manager
Built entirely with Claude Code


## Sample admin login
admin@example.com
password123

```bash
bun run dev:server
bun run dev:client
```


```json
  "scripts": {
    "dev:client": "bun run --filter client dev",
    "dev:server": "bun run --filter server dev",
    "test:client": "bun run --filter client test",
    "test:e2e": "bun run db:test:up && bun run --filter e2e test",
    "test:e2e:ui": "bun run db:test:up && bun run --filter e2e test:ui",
    "db:test:up": "docker compose --profile test up -d db-test",
    "db:test:down": "docker compose --profile test down -v db-test"
  }
```