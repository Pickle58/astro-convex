import { useAuth } from "@clerk/astro/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { type FunctionComponent, type JSX } from "react";

const client = new ConvexReactClient(CONVEX_URL);

// @clerk/astro loads Clerk globally; React islands only need Convex auth wiring.
export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <Component {...props} />
      </ConvexProviderWithClerk>
    );
  };
}
