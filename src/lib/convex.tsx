import { useAuth } from "@clerk/astro/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import {
  createContext,
  type FunctionComponent,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

const client = new ConvexReactClient(CONVEX_URL);

type ConvexAuthShape = {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
};

const defaultConvexAuth: ConvexAuthShape = {
  isLoading: true,
  isAuthenticated: false,
  fetchAccessToken: async () => null,
};

const ConvexAuthBridgeContext = createContext<ConvexAuthShape>(defaultConvexAuth);

function useConvexAuthBridge() {
  return useContext(ConvexAuthBridgeContext);
}

function ConvexProviderBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isSignedIn) {
        return null;
      }

      try {
        return (
          (await getToken({
            skipCache: forceRefreshToken,
          })) ?? null
        );
      } catch (error) {
        console.error("Failed to fetch Clerk token for Convex:", error);
        return null;
      }
    },
    [getToken, isSignedIn],
  );

  const auth = useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: !!isSignedIn,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken],
  );

  return (
    <ConvexAuthBridgeContext.Provider value={auth}>
      <ConvexProviderWithAuth client={client} useAuth={useConvexAuthBridge}>
        {children}
      </ConvexProviderWithAuth>
    </ConvexAuthBridgeContext.Provider>
  );
}

// @clerk/astro loads Clerk globally; React islands only need Convex auth wiring.
export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexProviderBridge>
        <Component {...props} />
      </ConvexProviderBridge>
    );
  };
}
