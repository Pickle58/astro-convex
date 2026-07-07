import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "../../lib/convex.tsx";
import type { Post } from "../../lib/convex-types";
import { coverImageClass, linkClass } from "../../lib/ui";
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
    return <p className="py-12 text-center text-text-muted">Loading post…</p>;
  }

  if (post === null) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-text">Post not found</h1>
        <p className="mb-4 text-text-muted">
          This post may have been removed or is still a draft.
        </p>
        <a href="/" className={linkClass}>
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
        <h1 className="text-4xl font-bold text-text">{post.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-text-muted">
          <span>By {post.authorName}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(post)}</span>
          {post.isAuthor && (
            <a href={`/blog/edit/${post._id}`} className={linkClass}>
              Edit
            </a>
          )}
        </div>
      </header>

      <MarkdownContent markdown={post.body} />

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="mb-6 text-2xl font-bold text-text">Comments</h2>
        <CommentsBody postId={post._id} />
      </section>
    </article>
  );
});
