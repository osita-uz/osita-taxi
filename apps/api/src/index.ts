import { buildApp } from "./app.js";

const PORT = Number(process.env.API_PORT) || 3000;

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API running on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
