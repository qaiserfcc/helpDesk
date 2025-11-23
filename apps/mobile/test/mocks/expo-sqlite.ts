type RunArgs = [sql: string, params?: unknown[]];

type MockRow = Record<string, unknown>;

type SQLiteDatabase = {
  runAsync: (...args: RunArgs) => Promise<void>;
  getAllAsync: <TRow = MockRow>(...args: RunArgs) => Promise<TRow[]>;
};

const rows = new Map<string, MockRow>();

function buildKey(sql: string, params?: unknown[]) {
  return `${sql}::${JSON.stringify(params ?? [])}`;
}

export async function openDatabaseAsync(): Promise<SQLiteDatabase> {
  return {
    runAsync: async (sql: string, params?: unknown[]) => {
      rows.set(buildKey(sql, params), { sql, params });
    },
    getAllAsync: async () => [],
  } satisfies SQLiteDatabase;
}
