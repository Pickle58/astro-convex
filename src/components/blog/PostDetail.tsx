import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "../../lib/convex.tsx";
import type { Post } from "../../lib/convex-types";
import { coverImageClass } from "../../lib/ui";
import { CommentsBody } from "../Comments";
import { MarkdownContent } from "../MarkdownContent";

function formatDate(post: Post): string {
  return new Date(post.publishedAt ?? post._creationTime).toLocaleDateString();
}

export default withConvexProvider(function PostDetail({
  slug,
}: {
  slug: string;
}) {
  const post = useQuery(api.posts.getBySlug, { slug });

  if (post === undefined) {
    return <p className="py-12 text-center text-gray-500">Loading post…</p>;
  }

  if (post === null) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Post not found</h1>
        <p className="mb-4 text-gray-600">
          This post may have been removed or is still a draft.
        </p>
        <a href="/" className="font-medium text-indigo-600 hover:text-indigo-800">
          Back to the blog
        </a>
      </div>
    );
  }

  return (
    <article>
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt=""
          className={coverImageClass}
        />
      )}

      <header className="mb-6">
        {post.status === "draft" && (
          <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Draft
          </span>
        )}
        <h1 className="text-4xl font-bold text-gray-900">{post.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
          <span>By {post.authorName}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(post)}</span>
          {post.isAuthor && (
            <a
              href={`/blog/edit/${post._id}`}
              className="font-medium text-indigo-600 hover:text-indigo-800"
            >
              Edit
            </a>
          )}
        </div>
      </header>

      <MarkdownContent markdown={post.body} />

      <section className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Comments</h2>
        <CommentsBody postId={post._id} />
      </section>
    </article>
  );
});
