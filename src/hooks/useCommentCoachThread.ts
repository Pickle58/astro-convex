import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

const STORAGE_KEY = "commentCoachThreadId";

function readThreadIdFromHash(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, "").trim();
  return hash.length > 0 ? hash : null;
}

function readThreadIdFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(STORAGE_KEY);
}

function persistThreadId(threadId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, threadId);
  if (readThreadIdFromHash() !== threadId) {
    window.location.hash = threadId;
  }
}

function readInitialThreadId(): string | null {
  return readThreadIdFromHash() ?? readThreadIdFromStorage();
}

export function useCommentCoachThread(isAuthenticated: boolean) {
  const createThread = useMutation(api.chat.threads.createNewThread);
  const [threadId, setThreadIdState] = useState<string | null>(() =>
    isAuthenticated ? readInitialThreadId() : null,
  );
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [error, setError] = useState<string>();
  const isEnsuringRef = useRef(false);

  const setThreadId = useCallback((id: string) => {
    setThreadIdState(id);
    persistThreadId(id);
  }, []);

  const recentThreads = useQuery(
    api.chat.threads.listThreads,
    isAuthenticated && threadId === null
      ? { paginationOpts: { numItems: 1, cursor: null } }
      : "skip",
  );

  useEffect(() => {
    const onHashChange = () => {
      const id = readThreadIdFromHash();
      if (id) {
        setThreadIdState(id);
        localStorage.setItem(STORAGE_KEY, id);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }
      setThreadIdState(event.newValue);
      if (readThreadIdFromHash() !== event.newValue) {
        window.location.hash = event.newValue;
      }
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (threadId !== null || isEnsuringRef.current) {
      return;
    }

    const fromUrl = readThreadIdFromHash();
    const fromStorage = readThreadIdFromStorage();
    const existing = fromUrl ?? fromStorage;
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

        const racedThreadId = readThreadIdFromStorage() ?? readThreadIdFromHash();
        if (racedThreadId) {
          if (!cancelled) {
            setThreadId(racedThreadId);
          }
          return;
        }

        const id = await createThread({ title: "Comment coach" });
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
  }, [isAuthenticated, threadId, recentThreads, createThread, setThreadId]);

  const startNewThread = useCallback(async () => {
    setIsCreatingThread(true);
    setError(undefined);
    try {
      const id = await createThread({ title: "Comment coach" });
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
  }, [createThread, setThreadId]);

  const clearThread = useCallback(() => {
    setThreadIdState(null);
    isEnsuringRef.current = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, []);

  return {
    threadId,
    isCreatingThread,
    error,
    startNewThread,
    clearThread,
  };
}
