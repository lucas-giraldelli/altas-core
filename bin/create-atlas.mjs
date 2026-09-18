#!/usr/bin/env node
// Cria uma instância do Atlas a partir do template embutido no pacote.
// Uso: pnpm dlx --allow-build=@lucasgiraldelli/atlas-core github:lucas-giraldelli/atlas-core my-atlas
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dest = resolve(process.argv[2] || 'my-atlas');
const src = join(dirname(dirname(fileURLToPath(import.meta.url))), 'template');
if (existsSync(dest) && readdirSync(dest).length) { console.error(`${dest} não está vazio.`); process.exit(1); }
cpSync(src, dest, { recursive: true });
console.log(`Atlas criado em ${dest}

Próximos passos:
  cd ${process.argv[2] || 'my-atlas'}
  cp secrets.env.example secrets.env        # LLM_KEY, LLM_MODEL, PB_EMAIL, PB_PASS
  pnpm install
  docker compose up -d                      # nginx (4173) + PocketBase (8090)
  set -a; . ./secrets.env; set +a; node scripts/pb-setup.mjs   # coleções e usuário (PIN = PB_PASS)
  pnpm build                                # site em build/, PDFs em build/pdf/
  open http://localhost:4173                # PIN: o valor de PB_PIN

Guia completo: node_modules/@lucasgiraldelli/atlas-core/docs/INSTALL.md
`);
