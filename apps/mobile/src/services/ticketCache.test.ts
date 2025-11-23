import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setTicketCacheDeps,
  primeTicketCacheEntries,
  serializeScope,
  upsertTicketCaches,
  withTicketCache,
} from "./ticketCache";
import type { TicketCacheDeps } from "./ticketCache";

describe("ticketCache helper", () => {
  const fetcher = vi.fn<[], Promise<string[]>>();
  const read = vi.fn<
    [options: { ownerId: string; scope: string }],
    Promise<unknown | null>
  >();
  const write = vi.fn<
    [options: { ownerId: string; scope: string }, payload: unknown],
    Promise<void>
  >();
  const listScopes = vi.fn<
    [ownerId: string, scopePrefix?: string],
    Promise<string[]>
  >();
  const readImpl = read as unknown as TicketCacheDeps["read"];
  const writeImpl = write as unknown as TicketCacheDeps["write"];
  const listScopesImpl = listScopes as unknown as TicketCacheDeps["listScopes"];

  beforeEach(() => {
    fetcher.mockReset();
    read.mockReset();
    write.mockReset();
    listScopes.mockReset();
    listScopes.mockResolvedValue([]);
    __setTicketCacheDeps({
      getOwnerId: () => "user-1",
      isOffline: () => false,
      read: readImpl,
      write: writeImpl,
      listScopes: listScopesImpl,
    });
  });

  afterEach(() => {
    __setTicketCacheDeps();
  });

  it("serializes scopes deterministically", () => {
    const scope = serializeScope("tickets", { b: 2, a: 1 });
    expect(scope).toBe("tickets:a:1|b:2");
  });

  it("returns cached payload while offline", async () => {
    const cached = ["cached-ticket"];
    read.mockResolvedValueOnce(cached);
    __setTicketCacheDeps({
      getOwnerId: () => "user-1",
      isOffline: () => true,
      read: readImpl,
      write: writeImpl,
    });

    const result = await withTicketCache("scope", fetcher);

    expect(result).toEqual(cached);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throws when offline without cache", async () => {
    read.mockResolvedValueOnce(null);
    __setTicketCacheDeps({
      getOwnerId: () => "user-1",
      isOffline: () => true,
      read: readImpl,
      write: writeImpl,
    });

    await expect(withTicketCache("scope", fetcher)).rejects.toThrow(
      "OFFLINE_CACHE_MISS",
    );
  });

  it("writes fresh payloads when online", async () => {
    const data = ["fresh"];
    fetcher.mockResolvedValueOnce(data);
    read.mockResolvedValueOnce(null);

    const result = await withTicketCache("scope", fetcher);

    expect(result).toEqual(data);
    expect(write).toHaveBeenCalledWith(
      { ownerId: "user-1", scope: "scope" },
      data,
    );
  });

  it("falls back to cache when fetcher fails", async () => {
    const cached = ["stale"];
    read.mockResolvedValueOnce(cached);
    fetcher.mockRejectedValueOnce(new Error("boom"));

    const result = await withTicketCache("scope", fetcher);
    expect(result).toEqual(cached);
  });

  it("primes cache entries for current owner", async () => {
    await primeTicketCacheEntries([
      { scope: "tickets:item:one", payload: { id: "one" } },
      { scope: "tickets:item:two", payload: { id: "two" } },
    ]);

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledWith(
      { ownerId: "user-1", scope: "tickets:item:one" },
      { id: "one" },
    );
    expect(write).toHaveBeenCalledWith(
      { ownerId: "user-1", scope: "tickets:item:two" },
      { id: "two" },
    );
  });

  it("skips priming when owner unavailable", async () => {
    __setTicketCacheDeps({
      getOwnerId: () => null,
      isOffline: () => false,
      read: readImpl,
      write: writeImpl,
      listScopes: listScopesImpl,
    });

    await primeTicketCacheEntries([
      { scope: "tickets:item:one", payload: { id: "one" } },
    ]);

    expect(write).not.toHaveBeenCalled();
  });

  it("updates detail and list caches during upsert", async () => {
    listScopes.mockResolvedValueOnce(["tickets:list"]);
    read.mockResolvedValueOnce([
      { id: "abc", description: "Old" },
      { id: "xyz", description: "Other" },
    ]);

    await upsertTicketCaches({ id: "abc", description: "New" });

    const detailScope = serializeScope("tickets:item", { ticketId: "abc" });
    expect(write).toHaveBeenCalledWith(
      { ownerId: "user-1", scope: detailScope },
      { id: "abc", description: "New" },
    );
    expect(write).toHaveBeenCalledWith(
      { ownerId: "user-1", scope: "tickets:list" },
      [
        { id: "abc", description: "New" },
        { id: "xyz", description: "Other" },
      ],
    );
  });

  it("skips list updates when ticket missing", async () => {
    listScopes.mockResolvedValueOnce(["tickets:list"]);
    read.mockResolvedValueOnce([{ id: "xyz", description: "Other" }]);

    await upsertTicketCaches({ id: "abc", description: "New" });

    expect(write).toHaveBeenCalledTimes(1);
  });

  it("merges additional list scopes", async () => {
    listScopes.mockResolvedValueOnce([]);
    read.mockResolvedValueOnce([{ id: "abc", description: "Old" }]);

    await upsertTicketCaches(
      { id: "abc", description: "New" },
      { listScopes: ["tickets:list:a:1"] },
    );

    expect(read).toHaveBeenCalledWith({
      ownerId: "user-1",
      scope: "tickets:list:a:1",
    });
  });
});
