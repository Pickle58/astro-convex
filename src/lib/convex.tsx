import { useAuth } from "@clerk/astro/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type FunctionComponent, type JSX, useCallback, useMemo } from "react";

const client = new ConvexReactClient(CONVEX_URL);

function useConvexAuthFromClerk() {
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

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: !!isSignedIn,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken],
  );
}

// @clerk/astro loads Clerk globally; React islands only need Convex auth wiring.
export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexProviderWithAuth client={client} useAuth={useConvexAuthFromClerk}>
        <Component {...props} />
      </ConvexProviderWithAuth>
    );
  };
}
