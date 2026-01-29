import type {
  Category,
  Item,
  SaveSlot,
  CreateSaveSlotRequest,
  UpdateProgressRequest,
  BulkUpdateProgressRequest,
  ItemsQueryParams,
  CategoryStats,
  TempleOverview,
  AltarWithOfferings,
  ItemTempleStatus,
  UpdateNPCProgressRequest,
} from "@coral-tracker/shared";
import { getSessionId } from "./session";
import { PENDING_WHATS_NEW_KEY } from "./constants";

const API_BASE = "/api";

/**
 * Stores the BUILD_ID from the first API response.
 * Used as baseline to detect new deployments.
 */
let initialBuildId: string | null = null;

/**
 * Check if server returned a different build ID (new deployment)
 * If so, dispatch an event to trigger the "new version" banner
 */
function checkBuildVersion(response: Response): void {
  const serverBuildId = response.headers.get("X-Build-ID");
  // Skip if server returns "dev" (local development) or if no header
  if (!serverBuildId || serverBuildId === "dev") return;

  // First response - store as baseline
  if (initialBuildId === null) {
    initialBuildId = serverBuildId;
    return;
  }

  // Subsequent responses - check for mismatch
  if (serverBuildId !== initialBuildId) {
    // Set flag so "What's New" banner shows after user refreshes
    localStorage.setItem(PENDING_WHATS_NEW_KEY, "true");
    window.dispatchEvent(new CustomEvent("version-mismatch"));
  }
}

/**
 * Get headers with session ID included
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const sessionId = getSessionId();
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  return headers;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  // Check for new deployment on every response
  checkBuildVersion(response);

  const data = await response.json();

  if (!response.ok) {
    // Handle rate limiting
    if (response.status === 429) {
      throw new Error(data.message || "Too many requests. Please wait a moment.");
    }
    // Handle auth errors
    if (response.status === 401) {
      throw new Error(data.message || "Session expired. Please refresh the page.");
    }
    throw new Error(data.message || "API request failed");
  }

  return data.data;
}

// Categories (public - no session required but we send it anyway)
export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/categories");
}

export async function getCategory(slug: string): Promise<Category & { item_count: number }> {
  return fetchApi<Category & { item_count: number }>(`/categories/${slug}`);
}

// Items (public - no session required but we send it anyway)
export async function getItems(params?: ItemsQueryParams): Promise<{
  items: Item[];
  total: number;
}> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  const response = await fetch(`${API_BASE}/items${query ? `?${query}` : ""}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  return { items: data.data, total: data.total };
}

export async function getItem(id: number): Promise<Item> {
  return fetchApi<Item>(`/items/${id}`);
}

// Save Slots (protected - requires session)
export async function getSaveSlots(): Promise<SaveSlot[]> {
  return fetchApi<SaveSlot[]>("/saves");
}

export async function getSaveSlot(id: number): Promise<SaveSlot & { stats: { by_category: CategoryStats[]; total_items: number; completed_items: number; completion_percentage: number } }> {
  return fetchApi(`/saves/${id}`);
}

export async function createSaveSlot(data: CreateSaveSlotRequest): Promise<SaveSlot> {
  return fetchApi<SaveSlot>("/saves", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSaveSlot(id: number): Promise<void> {
  await fetchApi(`/saves/${id}`, { method: "DELETE" });
}

export async function updateSaveSlot(id: number, name: string): Promise<SaveSlot> {
  return fetchApi<SaveSlot>(`/saves/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

// Progress (protected - requires session)
export async function getProgressItems(
  saveId: number,
  category?: string,
  completed?: boolean
): Promise<Array<Item & { completed: boolean; completed_at: string | null; notes: string | null }>> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (completed !== undefined) params.set("completed", String(completed));
  const query = params.toString();
  return fetchApi(`/progress/${saveId}/items${query ? `?${query}` : ""}`);
}

export async function updateProgress(
  saveId: number,
  itemId: number,
  data: UpdateProgressRequest
): Promise<void> {
  await fetchApi(`/progress/${saveId}/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function bulkUpdateProgress(
  saveId: number,
  data: BulkUpdateProgressRequest
): Promise<void> {
  await fetchApi(`/progress/${saveId}/bulk`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Temple (protected - requires session)
export async function getTempleOverview(saveId: number): Promise<TempleOverview> {
  return fetchApi<TempleOverview>(`/temple/altars?saveId=${saveId}`);
}

export async function getAltarDetail(saveId: number, altarSlug: string): Promise<AltarWithOfferings> {
  return fetchApi<AltarWithOfferings>(`/temple/altars/${altarSlug}?saveId=${saveId}`);
}

export async function updateTempleProgress(
  saveId: number,
  requirementId: number,
  offered: boolean
): Promise<void> {
  await fetchApi(`/temple/progress/${requirementId}?saveId=${saveId}`, {
    method: "PUT",
    body: JSON.stringify({ offered }),
  });
}

export async function getItemTempleStatus(
  saveId: number,
  itemId: number
): Promise<ItemTempleStatus> {
  return fetchApi<ItemTempleStatus>(`/temple/item/${itemId}?saveId=${saveId}`);
}

export async function getItemsTempleStatus(
  saveId: number,
  itemIds: number[]
): Promise<Record<number, ItemTempleStatus>> {
  if (itemIds.length === 0) return {};
  return fetchApi<Record<number, ItemTempleStatus>>(
    `/temple/items-status?saveId=${saveId}&itemIds=${itemIds.join(",")}`
  );
}

// NPC Progress (protected - requires session)
export async function getNPCs<T = Record<string, unknown>>(saveId: number): Promise<T[]> {
  return fetchApi(`/npcs/${saveId}`);
}

export async function getNPCStats(saveId: number): Promise<unknown> {
  return fetchApi(`/npcs/${saveId}/stats`);
}

export async function updateNPCProgress(
  saveId: number,
  npcId: number,
  data: UpdateNPCProgressRequest
): Promise<void> {
  await fetchApi(`/npcs/${saveId}/${npcId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function incrementNPCHearts(saveId: number, npcId: number): Promise<void> {
  await fetchApi(`/npcs/${saveId}/${npcId}/increment`, {
    method: "POST",
  });
}

export async function decrementNPCHearts(saveId: number, npcId: number): Promise<void> {
  await fetchApi(`/npcs/${saveId}/${npcId}/decrement`, {
    method: "POST",
  });
}
