import type {
  Category,
  Item,
  SaveSlot,
  CreateSaveSlotRequest,
  UpdateProgressRequest,
  BulkUpdateProgressRequest,
  ItemsQueryParams,
  CategoryStats,
} from "@coral-tracker/shared";

const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data.data;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/categories");
}

export async function getCategory(slug: string): Promise<Category & { item_count: number }> {
  return fetchApi<Category & { item_count: number }>(`/categories/${slug}`);
}

// Items
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
  const response = await fetch(`${API_BASE}/items${query ? `?${query}` : ""}`);
  const data = await response.json();
  return { items: data.data, total: data.total };
}

export async function getItem(id: number): Promise<Item> {
  return fetchApi<Item>(`/items/${id}`);
}

// Save Slots
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

// Progress
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
