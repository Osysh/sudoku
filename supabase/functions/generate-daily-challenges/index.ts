import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../lib/database.types.ts";
import { DAILY_CHALLENGE } from "../../../lib/constants.ts";
import { SudokuDifficulty, SudokuGenerator } from "../../../lib/sudoku-core.ts";
import { FUNCTION_CORS_HEADERS } from "../_shared/constants.ts";

type Difficulty = SudokuDifficulty;
type GenerationRunStatus = "success" | "failed";

type GenerationRequest = {
  month?: string;
  maxRetries?: number;
  dryRun?: boolean;
};

type AdminClient = ReturnType<typeof createClient<Database>>;

type ChallengeInsertRow = {
  challenge_date: string;
  difficulty: Difficulty;
  puzzle_canonical: string;
  puzzle_hash: string;
};

type PuzzleHashRow = {
  puzzle_hash: string | null;
};

class DailyChallengeService {
  private readonly admin: AdminClient;
  private readonly sudoku: SudokuGenerator;

  public constructor(admin: AdminClient) {
    this.admin = admin;
    this.sudoku = new SudokuGenerator();
  }

  public static json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...FUNCTION_CORS_HEADERS.WITH_CRON_SECRET }
    });
  }

  public static toDateKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  public static parseTargetMonth(rawMonth: string | undefined): Date {
    if (!rawMonth) {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    }

    if (!DAILY_CHALLENGE.ISO_DATE_REGEX.test(rawMonth)) {
      throw new Error("month must be in YYYY-MM-DD format");
    }

    const parsed = new Date(`${rawMonth}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("month is invalid");
    }

    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
  }

  public static sampleDifficulty(mu = DAILY_CHALLENGE.GAUSSIAN_MU, sigma = DAILY_CHALLENGE.GAUSSIAN_SIGMA): Difficulty {
    const u1 = Math.max(Math.random(), 0.0000001);
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sampled = Math.max(1, Math.min(3, Math.round(mu + sigma * gaussian)));

    if (sampled === 1) return "easy";
    if (sampled === 2) return "medium";
    return "hard";
  }

  public static getMonthBounds(targetMonth: Date): { monthStart: Date; monthEnd: Date } {
    const year = targetMonth.getUTCFullYear();
    const month = targetMonth.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    return { monthStart, monthEnd };
  }

  public static async sha256Hex(value: string): Promise<string> {
    const buffer = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  public async insertRunLog(
    runMonth: string,
    attempt: number,
    status: GenerationRunStatus,
    insertedCount: number | null,
    errorMessage: string | null
  ): Promise<void> {
    const { error } = await this.admin.from("daily_challenge_generation_runs").insert({
      run_month: runMonth,
      attempt,
      inserted_count: insertedCount,
      status,
      error_message: errorMessage
    });

    if (error) {
      console.error("Could not write generation run log:", error.message);
    }
  }

  public async generateMonth(targetMonth: Date, dryRun: boolean): Promise<number> {
    const { monthStart, monthEnd } = DailyChallengeService.getMonthBounds(targetMonth);
    const monthStartKey = DailyChallengeService.toDateKey(monthStart);
    const monthEndKey = DailyChallengeService.toDateKey(monthEnd);

    const { count, error: monthCheckError } = await this.admin
      .from("daily_challenges")
      .select("id", { count: "exact", head: true })
      .gte("challenge_date", monthStartKey)
      .lte("challenge_date", monthEndKey);

    if (monthCheckError) {
      throw new Error(monthCheckError.message);
    }

    if ((count ?? 0) > 0) {
      throw new Error(`Month ${monthStartKey.slice(0, 7)} is already generated and immutable`);
    }

    const existingHashes = await this.loadExistingHashes();
    const rows: ChallengeInsertRow[] = [];

    for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const challengeDate = DailyChallengeService.toDateKey(cursor);
      const difficulty = DailyChallengeService.sampleDifficulty();

      let selectedCanonical = "";
      let selectedHash = "";

      for (let attempt = 1; attempt <= DAILY_CHALLENGE.GENERATION_MAX_ATTEMPTS_PER_DAY; attempt += 1) {
        const { puzzle } = this.sudoku.createSudoku(difficulty);
        const canonical = puzzle.flat().join("");
        const hash = await DailyChallengeService.sha256Hex(canonical);

        if (existingHashes.has(hash)) {
          continue;
        }

        selectedCanonical = canonical;
        selectedHash = hash;
        existingHashes.add(hash);
        break;
      }

      if (!selectedCanonical || !selectedHash) {
        throw new Error(`Unable to generate unique puzzle for ${challengeDate}`);
      }

      rows.push({
        challenge_date: challengeDate,
        difficulty,
        puzzle_canonical: selectedCanonical,
        puzzle_hash: selectedHash
      });
    }

    if (!dryRun) {
      const { error: insertError } = await this.admin.from("daily_challenges").insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return rows.length;
  }

  private async loadExistingHashes(): Promise<Set<string>> {
    const hashes = new Set<string>();
    const pageSize = DAILY_CHALLENGE.HASH_PAGE_SIZE;
    let from = 0;

    while (true) {
      const { data, error } = await this.admin
        .from("daily_challenges")
        .select("puzzle_hash")
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.length) {
        break;
      }

      for (const row of data as PuzzleHashRow[]) {
        if (row.puzzle_hash) {
          hashes.add(row.puzzle_hash);
        }
      }

      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return hashes;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: FUNCTION_CORS_HEADERS.WITH_CRON_SECRET });
  }

  if (req.method !== "POST") {
    return DailyChallengeService.json({ error: "Method not allowed" }, 405);
  }

  const configuredCronSecret = Deno.env.get("DAILY_CHALLENGE_CRON_SECRET");
  if (!configuredCronSecret) {
    return DailyChallengeService.json({ error: "Missing DAILY_CHALLENGE_CRON_SECRET" }, 500);
  }

  const providedCronSecret = req.headers.get("x-cron-secret");
  if (providedCronSecret !== configuredCronSecret) {
    return DailyChallengeService.json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return DailyChallengeService.json({ error: "Missing Supabase service configuration" }, 500);
  }

  const body = (await req.json().catch(() => ({}))) as GenerationRequest;

  try {
    const targetMonth = DailyChallengeService.parseTargetMonth(body.month);
    const runMonth = DailyChallengeService.toDateKey(targetMonth);
    const maxRetries = Math.max(
      1,
      Math.min(
        DAILY_CHALLENGE.GENERATION_MAX_RETRIES_CAP,
        Math.floor(Number(body.maxRetries ?? DAILY_CHALLENGE.GENERATION_DEFAULT_MAX_RETRIES))
      )
    );
    const dryRun = Boolean(body.dryRun);

    const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const service = new DailyChallengeService(admin);
    let lastError = "Unknown error";

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const inserted = await service.generateMonth(targetMonth, dryRun);
        await service.insertRunLog(runMonth, attempt, "success", inserted, null);

        return DailyChallengeService.json({
          ok: true,
          runMonth,
          attempt,
          inserted,
          dryRun
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await service.insertRunLog(runMonth, attempt, "failed", null, lastError);
      }
    }

    return DailyChallengeService.json({ ok: false, runMonth, error: lastError }, 500);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return DailyChallengeService.json({ error: message }, 400);
  }
});
