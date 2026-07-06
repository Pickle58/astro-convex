import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

/** Comment document returned by paginated list queries. */
export type Comment = FunctionReturnType<
  typeof api.comments.list
>["page"][number];

/** Signed-in viewer profile, or null when unauthenticated. */
export type Viewer = FunctionReturnType<typeof api.users.viewer>;

/** Blog post in list results (also matches getBySlug/getById non-null shape). */
export type Post = FunctionReturnType<
  typeof api.posts.listPublished
>["page"][number];
