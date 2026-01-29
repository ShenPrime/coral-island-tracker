import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateProgress,
  createSaveSlot,
  deleteSaveSlot,
  updateSaveSlot,
  updateTempleProgress,
  updateNPCProgress,
  incrementNPCHearts,
  decrementNPCHearts,
} from "@/lib/api";
import { queryKeys, type ItemWithProgress, type NPCData, type SaveSlotWithStats } from "./useQueries";
import type {
  UpdateProgressRequest,
  CreateSaveSlotRequest,
  SaveSlot,
  ItemTempleStatus,
  RelationshipStatus,
  AltarWithOfferings,
  TempleOverview,
} from "@coral-tracker/shared";

// ============================================================
// Progress Mutations
// ============================================================

interface UpdateProgressVariables {
  saveId: number;
  itemId: number;
  category: string;
  data: UpdateProgressRequest;
}

/**
 * Update item progress with optimistic update
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saveId, itemId, data }: UpdateProgressVariables) =>
      updateProgress(saveId, itemId, data),

    onMutate: async ({ saveId, itemId, category, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.progress(saveId, category),
      });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<ItemWithProgress[]>(
        queryKeys.progress(saveId, category)
      );

      // Optimistically update the cache
      queryClient.setQueryData<ItemWithProgress[]>(
        queryKeys.progress(saveId, category),
        (old) =>
          old?.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completed: data.completed ?? item.completed,
                  notes: data.notes !== undefined ? data.notes : item.notes,
                  completed_at: data.completed
                    ? new Date().toISOString()
                    : item.completed_at,
                }
              : item
          )
      );

      // Optimistically update dashboard stats
      const previousSaveSlot = queryClient.getQueryData<SaveSlotWithStats>(
        queryKeys.saveSlot(saveId)
      );

      if (data.completed !== undefined) {
        const delta = data.completed ? 1 : -1;
        queryClient.setQueryData<SaveSlotWithStats>(
          queryKeys.saveSlot(saveId),
          (old) => {
            if (!old) return old;
            const newCompleted = old.stats.completed_items + delta;
            return {
              ...old,
              stats: {
                ...old.stats,
                completed_items: newCompleted,
                completion_percentage: Math.round((newCompleted / old.stats.total_items) * 100),
                by_category: old.stats.by_category.map((cat) =>
                  cat.category_slug === category
                    ? { ...cat, completed: cat.completed + delta }
                    : cat
                ),
              },
            };
          }
        );
      }

      return { previousItems, previousSaveSlot };
    },

    onError: (_err, { saveId, category }, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.progress(saveId, category),
          context.previousItems
        );
      }
      if (context?.previousSaveSlot) {
        queryClient.setQueryData(
          queryKeys.saveSlot(saveId),
          context.previousSaveSlot
        );
      }
    },
  });
}

// ============================================================
// Save Slot Mutations
// ============================================================

/**
 * Create a new save slot
 */
export function useCreateSaveSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaveSlotRequest) => createSaveSlot(data),

    onSuccess: (newSave) => {
      // Add the new save to the cache
      queryClient.setQueryData<SaveSlot[]>(queryKeys.saves, (old) =>
        old ? [...old, newSave] : [newSave]
      );
    },
  });
}

/**
 * Delete a save slot with optimistic update
 */
export function useDeleteSaveSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSaveSlot(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.saves });

      const previousSaves = queryClient.getQueryData<SaveSlot[]>(queryKeys.saves);

      // Optimistically remove from cache
      queryClient.setQueryData<SaveSlot[]>(queryKeys.saves, (old) =>
        old?.filter((save) => save.id !== id)
      );

      return { previousSaves };
    },

    onError: (_err, _id, context) => {
      if (context?.previousSaves) {
        queryClient.setQueryData(queryKeys.saves, context.previousSaves);
      }
    },
  });
}

/**
 * Update a save slot name
 */
export function useUpdateSaveSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateSaveSlot(id, name),

    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.saves });

      const previousSaves = queryClient.getQueryData<SaveSlot[]>(queryKeys.saves);

      // Optimistically update name
      queryClient.setQueryData<SaveSlot[]>(queryKeys.saves, (old) =>
        old?.map((save) => (save.id === id ? { ...save, name } : save))
      );

      return { previousSaves };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousSaves) {
        queryClient.setQueryData(queryKeys.saves, context.previousSaves);
      }
    },
  });
}

// ============================================================
// Temple Mutations
// ============================================================

interface UpdateTempleProgressVariables {
  saveId: number;
  requirementId: number;
  itemId: number;
  category: string;
  offered: boolean;
  altarSlug?: string;
}

/**
 * Update temple offering progress with optimistic update
 */
export function useUpdateTempleProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saveId, requirementId, offered }: UpdateTempleProgressVariables) =>
      updateTempleProgress(saveId, requirementId, offered),

    onMutate: async ({ saveId, category, itemId, requirementId, offered, altarSlug }) => {
      const delta = offered ? 1 : -1;

      // Cancel relevant queries
      if (category) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.templeStatus(saveId, category),
        });
      }

      // Snapshot temple status (category path)
      const previousStatus = category
        ? queryClient.getQueryData<Record<number, ItemTempleStatus>>(
            queryKeys.templeStatus(saveId, category)
          )
        : undefined;

      if (category) {
        queryClient.setQueryData<Record<number, ItemTempleStatus>>(
          queryKeys.templeStatus(saveId, category),
          (old) => {
            if (!old || !old[itemId]) return old;
            const itemStatus = old[itemId];
            return {
              ...old,
              [itemId]: {
                ...itemStatus,
                requirements: itemStatus.requirements.map((req) =>
                  req.requirement_id === requirementId
                    ? { ...req, offered }
                    : req
                ),
              },
            };
          }
        );
      }

      // Snapshot temple overview
      const previousTempleOverview = queryClient.getQueryData<TempleOverview>(
        queryKeys.templeOverview(saveId)
      );

      queryClient.setQueryData<TempleOverview>(queryKeys.templeOverview(saveId), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          offered_items: prev.offered_items + delta,
          altars: altarSlug
            ? prev.altars.map((a) =>
                a.slug === altarSlug
                  ? { ...a, offered_items: a.offered_items + delta }
                  : a
              )
            : prev.altars,
        };
      });

      // Snapshot all altar detail caches
      const previousAltarData = queryClient.getQueriesData<AltarWithOfferings>({
        queryKey: ["altar", saveId],
      });

      // Optimistically update all cached altar details matching this requirement
      queryClient.setQueriesData<AltarWithOfferings>(
        { queryKey: ["altar", saveId] },
        (old) => {
          if (!old) return old;
          const updatedOfferings = old.offerings.map((offering) => {
            const updatedItems = offering.items.map((item) =>
              item.id === requirementId
                ? { ...item, offered, offered_at: offered ? new Date() : null }
                : item
            );
            const offeredCount = updatedItems.filter((i) => i.offered).length;
            return {
              ...offering,
              items: updatedItems,
              offered_items: offeredCount,
              is_complete: offeredCount === offering.total_items,
            };
          });
          return {
            ...old,
            offerings: updatedOfferings,
            offered_items: updatedOfferings.reduce((sum, o) => sum + o.offered_items, 0),
            completed_offerings: updatedOfferings.filter((o) => o.is_complete).length,
          };
        }
      );

      // Snapshot and update temple-status caches (AltarDetail path)
      const previousTempleStatuses = altarSlug
        ? queryClient.getQueriesData<Record<number, ItemTempleStatus>>({
            queryKey: ["temple-status", saveId],
          })
        : undefined;

      if (altarSlug) {
        queryClient.setQueriesData<Record<number, ItemTempleStatus>>(
          { queryKey: ["temple-status", saveId] },
          (old) => {
            if (!old) return old;
            const updated = { ...old };
            for (const [id, status] of Object.entries(updated)) {
              const matchingReq = status.requirements.find((r) => r.requirement_id === requirementId);
              if (matchingReq) {
                updated[Number(id)] = {
                  ...status,
                  requirements: status.requirements.map((r) =>
                    r.requirement_id === requirementId ? { ...r, offered } : r
                  ),
                };
              }
            }
            return updated;
          }
        );
      }

      return { previousStatus, previousTempleOverview, previousAltarData, previousTempleStatuses };
    },

    onError: (_err, { saveId, category }, context) => {
      if (context?.previousStatus && category) {
        queryClient.setQueryData(
          queryKeys.templeStatus(saveId, category),
          context.previousStatus
        );
      }
      if (context?.previousTempleOverview) {
        queryClient.setQueryData(
          queryKeys.templeOverview(saveId),
          context.previousTempleOverview
        );
      }
      if (context?.previousAltarData) {
        context.previousAltarData.forEach(([key, data]) => {
          if (data) queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousTempleStatuses) {
        context.previousTempleStatuses.forEach(([key, data]) => {
          if (data) queryClient.setQueryData(key, data);
        });
      }
    },
  });
}

// ============================================================
// NPC Mutations
// ============================================================

interface UpdateNPCProgressVariables {
  saveId: number;
  npcId: number;
  hearts?: number;
  relationship_status?: RelationshipStatus;
  notes?: string | null;
}

/**
 * Update NPC progress (hearts, status, notes) with optimistic update
 */
export function useUpdateNPCProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saveId, npcId, hearts, relationship_status, notes }: UpdateNPCProgressVariables) =>
      updateNPCProgress(saveId, npcId, { hearts, relationship_status, notes }),

    onMutate: async ({ saveId, npcId, hearts, relationship_status, notes }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.npcs(saveId),
      });

      const previousNPCs = queryClient.getQueryData<NPCData[]>(
        queryKeys.npcs(saveId)
      );

      // Optimistically update
      queryClient.setQueryData<NPCData[]>(
        queryKeys.npcs(saveId),
        (old) =>
          old?.map((npc) => {
            if (npc.id !== npcId) return npc;

            const newHearts = hearts ?? npc.hearts;
            const newStatus = relationship_status ?? npc.relationship_status;
            const isMarriageCandidate = npc.metadata?.is_marriage_candidate || false;
            const newMaxHearts = isMarriageCandidate && newStatus === "married" ? 14 : 10;

            return {
              ...npc,
              hearts: newHearts,
              relationship_status: newStatus,
              notes: notes !== undefined ? notes : npc.notes,
              max_hearts: newMaxHearts,
              is_max_hearts: newHearts >= newMaxHearts,
            };
          })
      );

      return { previousNPCs };
    },

    onError: (_err, { saveId }, context) => {
      if (context?.previousNPCs) {
        queryClient.setQueryData(queryKeys.npcs(saveId), context.previousNPCs);
      }
    },
  });
}

interface IncrementDecrementVariables {
  saveId: number;
  npcId: number;
}

/**
 * Increment NPC hearts with optimistic update
 */
export function useIncrementNPCHearts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saveId, npcId }: IncrementDecrementVariables) =>
      incrementNPCHearts(saveId, npcId),

    onMutate: async ({ saveId, npcId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.npcs(saveId),
      });

      const previousNPCs = queryClient.getQueryData<NPCData[]>(
        queryKeys.npcs(saveId)
      );

      queryClient.setQueryData<NPCData[]>(
        queryKeys.npcs(saveId),
        (old) =>
          old?.map((npc) => {
            if (npc.id !== npcId) return npc;

            const newHearts = Math.min(npc.hearts + 1, npc.max_hearts);
            return {
              ...npc,
              hearts: newHearts,
              is_max_hearts: newHearts >= npc.max_hearts,
            };
          })
      );

      return { previousNPCs };
    },

    onError: (_err, { saveId }, context) => {
      if (context?.previousNPCs) {
        queryClient.setQueryData(queryKeys.npcs(saveId), context.previousNPCs);
      }
    },
  });
}

/**
 * Decrement NPC hearts with optimistic update
 */
export function useDecrementNPCHearts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saveId, npcId }: IncrementDecrementVariables) =>
      decrementNPCHearts(saveId, npcId),

    onMutate: async ({ saveId, npcId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.npcs(saveId),
      });

      const previousNPCs = queryClient.getQueryData<NPCData[]>(
        queryKeys.npcs(saveId)
      );

      queryClient.setQueryData<NPCData[]>(
        queryKeys.npcs(saveId),
        (old) =>
          old?.map((npc) => {
            if (npc.id !== npcId) return npc;

            const newHearts = Math.max(npc.hearts - 1, 0);
            return {
              ...npc,
              hearts: newHearts,
              is_max_hearts: newHearts >= npc.max_hearts,
            };
          })
      );

      return { previousNPCs };
    },

    onError: (_err, { saveId }, context) => {
      if (context?.previousNPCs) {
        queryClient.setQueryData(queryKeys.npcs(saveId), context.previousNPCs);
      }
    },
  });
}
