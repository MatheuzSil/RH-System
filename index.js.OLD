import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse";
import dotenv from "dotenv";
import { getDb, loadPatients, insertDocument } from "./lib/db.js";
import { extractCandidates } from "./lib/nameExtract.js";
import { bestMatch } from "./lib/similarity.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cfg = {
  dialect: process.env.DB_DIALECT || "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || (process.env.DB_DIALECT === "mssql" ? "1433" : "3306"), 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "prontuario_db",
  encrypt: (process.env.DB_ENCRYPT || "false").toLowerCase() === "true",

  prontuariosTable: process.env.PRONTUARIOS_TABLE || "prontuarios",
  prontuarioIdCol: process.env.PRONTUARIOS_ID_COLUMN || "id",
  prontuarioNomeCol: process.env.PRONTUARIOS_NOME_COLUMN || "nome",

  docsTable: process.env.DOCUMENTOS_TABLE || "documentos",
  docsIdCol: process.env.DOCUMENTOS_ID_COLUMN || "id",
  docsProntuarioIdCol: process.env.DOCUMENTOS_PRONTUARIO_ID_COLUMN || "prontuario_id",
  docsNomeArquivoCol: process.env.DOCUMENTOS_NOME_ARQUIVO_COLUMN || "nome_arquivo",
  docsMimeTypeCol: process.env.DOCUMENTOS_MIME_TYPE_COLUMN || "mime_type",
  docsArquivoCol: process.env.DOCUMENTOS_ARQUIVO_COLUMN || "arquivo",
  docsCreatedAtCol: process.env.DOCUMENTOS_CREATED_AT_COLUMN || "created_at",

  inputDir: path.resolve(process.env.PDF_INPUT_DIR || path.join(__dirname, "..", "pdfs")),
  minSimilarity: parseFloat(process.env.MIN_SIMILARITY || "0.72"),
  verbose: (process.env.VERBOSE || "true").toLowerCase() === "true",
};

function log(...args) { if (cfg.verbose) console.log(...args); }

async function main() {
  const db = await getDb(cfg);
  try {
    const pacientes = await loadPatients(db, cfg);
    if (!pacientes.length) {
      console.error("Nenhum prontuário encontrado na base. Verifique PRONTUARIOS_TABLE/colunas.");
      return;
    }
    log(`Pacientes carregados: ${pacientes.length}`);

    const files = fs.readdirSync(cfg.inputDir)
      .filter(f => f.toLowerCase().endsWith(".pdf"))
      .map(f => path.join(cfg.inputDir, f));

    if (!files.length) {
      console.warn("Nenhum PDF encontrado em", cfg.inputDir);
      return;
    }

    for (const filePath of files) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const parsed = await pdf(dataBuffer);
        const text = (parsed.text || "").toString();
        const fileName = path.basename(filePath);

        const candidates = extractCandidates(text, fileName);
        log(`\n📄 ${fileName} → candidatos extraídos:`, candidates.map(c => `"${c}"`).join(" | "));

        const match = bestMatch(candidates, pacientes.map(p => p.nome));
        if (!match || match.score < cfg.minSimilarity) {
          console.warn(`⚠️  Sem correspondência confiável para "${fileName}". Melhor tentativa: ${match?.name} (${(match?.score||0).toFixed(2)})`);
          continue;
        }

        const paciente = pacientes.find(p => p.nome === match.name);
        if (!paciente) {
          console.warn(`⚠️  Paciente correspondente não localizado na lista (inconsistência): ${match.name}`);
          continue;
        }

        await insertDocument(db, cfg, {
          prontuarioId: paciente.id,
          fileName,
          mimeType: "application/pdf",
          buffer: dataBuffer,
        });

        console.log(`✅ Inserido em ${cfg.docsTable}: ${fileName} → prontuário #${paciente.id} (${paciente.nome}) [score ${(match.score).toFixed(2)}]`);
      } catch (err) {
        console.error(`❌ Erro processando ${filePath}:`, err.message);
      }
    }
  } finally {
    if (db?.close) await db.close();
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
