import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { ThreadContext } from "../components/agent/types";

function hashPrefix(context: ThreadContext): string {
  return `${context}:`;
}

function readThreadIdFromHash(context: ThreadContext): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, "").trim();
  const prefix = hashPrefix(context);
  if (hash.startsWith(prefix)) {
    const id = hash.slice(prefix.length).trim();
    return id.length > 0 ? id : null;
  }
  return null;
}

function readThreadIdFromStorage(storageKey: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(storageKey);
}

function persistThreadId(
  storageKey: string,
  context: ThreadContext,
  threadId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(storageKey, threadId);
  const expectedHash = `${hashPrefix(context)}${threadId}`;
  if (window.location.hash.replace(/^#/, "") !== expectedHash) {
    window.location.hash = expectedHash;
  }
}

type UseAgentThreadsOptions = {
  context: ThreadContext;
  storageKey: string;
};

export function useAgentThreads({ context, storageKey }: UseAgentThreadsOptions) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createThread = useMutation(api.chat.threads.createNewThread);
  const canUseConvex = isAuthenticated && !isAuthLoading;
  const [threadId, setThreadIdState] = useState<string | null>(() =>
    readThreadIdFromHash(context) ?? readThreadIdFromStorage(storageKey),
  );
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [error, setError] = useState<string>();
  const isEnsuringRef = useRef(false);

  const setThreadId = useCallback(
    (id: string) => {
      setThreadIdState(id);
      persistThreadId(storageKey, context, id);
    },
    [storageKey, context],
  );

  const recentThreads = useQuery(
    api.chat.threads.listThreads,
    canUseConvex && threadId === null
      ? { context, paginationOpts: { numItems: 1, cursor: null } }
      : "skip",
  );

  const threadAccess = useQuery(
    api.chat.threads.hasThreadAccess,
    canUseConvex && threadId ? { threadId } : "skip",
  );

  const isValidatingThreadAccess = threadId !== null && threadAccess === undefined;
  const canUseThread = threadId !== null && threadAccess === true;

  const clearThread = useCallback(() => {
    setThreadIdState(null);
    isEnsuringRef.current = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
      if (window.location.hash) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (threadAccess === false) {
      clearThread();
    }
  }, [threadAccess, clearThread]);

  useEffect(() => {
    const onHashChange = () => {
      const id = readThreadIdFromHash(context);
      if (id) {
        setThreadIdState(id);
        localStorage.setItem(storageKey, id);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }
      setThreadIdState(event.newValue);
      const expectedHash = `${hashPrefix(context)}${event.newValue}`;
      if (window.location.hash.replace(/^#/, "") !== expectedHash) {
        window.location.hash = expectedHash;
      }
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, context]);

  useEffect(() => {
    if (!canUseConvex) {
      return;
    }
    if (threadId !== null || isEnsuringRef.current) {
      return;
    }

    const existing =
      readThreadIdFromHash(context) ?? readThreadIdFromStorage(storageKey);
    if (existing) {
      setThreadId(existing);
      return;
    }
    if (recentThreads === undefined) {
      return;
    }

    isEnsuringRef.current = true;
    let cancelled = false;

    async function ensureThread() {
      setIsCreatingThread(true);
      setError(undefined);
      try {
        const latest = recentThreads.page[0]?._id as string | undefined;
        if (latest) {
          if (!cancelled) {
            setThreadId(latest);
          }
          return;
        }

        const raced =
          readThreadIdFromStorage(storageKey) ?? readThreadIdFromHash(context);
        if (raced) {
          if (!cancelled) {
            setThreadId(raced);
          }
          return;
        }

        const id = await createThread({ context });
        if (!cancelled) {
          setThreadId(id);
        }
      } catch (createError) {
        console.error(createError);
        if (!cancelled) {
          setError(
            createError instanceof Error
              ? createError.message
              : "Could not start agent chat.",
          );
        }
      } finally {
        isEnsuringRef.current = false;
        if (!cancelled) {
          setIsCreatingThread(false);
        }
      }
    }

    void ensureThread();
    return () => {
      cancelled = true;
    };
  }, [canUseConvex, threadId, recentThreads, createThread, setThreadId, context, storageKey]);

  const startNewThread = useCallback(async () => {
    setIsCreatingThread(true);
    setError(undefined);
    try {
      const id = await createThread({ context });
      setThreadId(id);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not start a new chat.",
      );
    } finally {
      setIsCreatingThread(false);
    }
  }, [createThread, setThreadId, context]);

  return {
    threadId,
    setThreadId,
    isCreatingThread,
    isValidatingThreadAccess,
    canUseThread,
    error,
    startNewThread,
    clearThread,
  };
}
