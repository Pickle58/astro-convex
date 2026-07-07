import { Authenticated, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "../../lib/convex.tsx";
import type { Post } from "../../lib/convex-types";
import { coverImageCardClass } from "../../lib/ui";
import { useEnsureUser } from "../CommentForm";

const PAGE_SIZE = 10;

function formatDate(post: Post): string {
  return new Date(post.publishedAt ?? post._creationTime).toLocaleDateString();
}

function PostCard({ post }: { post: Post }) {
  return (
    <a
      href={`/blog/${post.slug}`}
      className="block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt=""
          className={coverImageCardClass}
          loading="lazy"
        />
      )}
      <div className="p-5">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          {post.title}
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          By {post.authorName} · {formatDate(post)}
        </p>
        {post.excerpt && (
          <p className="line-clamp-3 text-gray-700">{post.excerpt}</p>
        )}
      </div>
    </a>
  );
}

function DraftsSection() {
  const drafts = useQuery(api.posts.listMyDrafts);

  if (!drafts || drafts.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-3 text-lg font-semibold text-amber-900">Your drafts</h2>
      <ul className="space-y-2">
        {drafts.map((draft) => (
          <li
            key={draft._id}
            className="flex items-center justify-between gap-4"
          >
            <span className="truncate text-gray-800">
              {draft.title || "Untitled draft"}
            </span>
            <a
              href={`/blog/edit/${draft._id}`}
              className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Continue editing
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default withConvexProvider(function BlogIndex() {
  useEnsureUser();
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listPublished,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
          <p className="mt-1 text-gray-600">
            Posts from the community. Sign in to write your own.
          </p>
        </div>
        <Authenticated>
          <a
            href="/blog/new"
            className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            New post
          </a>
        </Authenticated>
      </div>

      <Authenticated>
        <DraftsSection />
      </Authenticated>

      {status === "LoadingFirstPage" ? (
        <p className="py-8 text-center text-gray-500">Loading posts…</p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No posts yet. Be the first to publish one.
        </p>
      ) : (
        <div className="space-y-6">
          {results.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
          {status === "CanLoadMore" && (
            <button
              type="button"
              onClick={() => loadMore(PAGE_SIZE)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Load more posts
            </button>
          )}
          {status === "LoadingMore" && (
            <p className="py-4 text-center text-gray-500">Loading more…</p>
          )}
        </div>
      )}
    </div>
  );
});
