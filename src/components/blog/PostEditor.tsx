import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { withConvexProvider } from "../../lib/convex.tsx";
import { coverImagePreviewClass } from "../../lib/ui";
import { useEnsureUser } from "../CommentForm";
import { useImageUpload } from "./useImageUpload";

type SaveStatus = "draft" | "published";

function ToolbarButton({
  label,
  onClick,
  active,
  title,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function EditorToolbar({
  editor,
  onInsertImage,
}: {
  editor: Editor;
  onInsertImage: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
      <ToolbarButton
        label="B"
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="I"
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="H2"
        title="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        title="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarButton
        label="• List"
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="1. List"
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="Quote"
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        label="Code"
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolbarButton
        label="Link"
        title="Add or edit link"
        active={editor.isActive("link")}
        onClick={() => {
          const previous = editor.getAttributes("link").href as
            | string
            | undefined;
          const url = window.prompt("Link URL", previous ?? "https://");
          if (url === null) {
            return;
          }
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
      />
      <ToolbarButton label="Image" title="Insert image" onClick={onInsertImage} />
    </div>
  );
}

function PostEditorForm({ postId }: { postId?: Id<"posts"> }) {
  const createPost = useMutation(api.posts.create);
  const updatePost = useMutation(api.posts.update);
  const viewer = useQuery(api.users.viewer);
  const existing = useQuery(
    api.posts.getById,
    postId ? { postId } : "skip",
  );
  const uploadImage = useImageUpload();

  const [title, setTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageId, setCoverImageId] = useState<Id<"_storage"> | undefined>();
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const prefilledRef = useRef(false);
  const nameTouchedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
      Placeholder.configure({ placeholder: "Write your post…" }),
      Markdown,
    ],
    editorProps: {
      attributes: {
        class: "tiptap min-h-[320px] px-4 py-3",
      },
    },
  });

  // Prefill fields once the post to edit loads.
  useEffect(() => {
    if (!editor || prefilledRef.current || !existing) {
      return;
    }
    prefilledRef.current = true;
    setTitle(existing.title);
    setDisplayName(existing.authorName);
    setExcerpt(existing.excerpt ?? "");
    setCoverImageId(existing.coverImageId);
    setCoverImageUrl(existing.coverImageUrl);
    editor.commands.setContent(existing.body);
  }, [editor, existing]);

  // Prefill the display name from the viewer profile for new posts.
  useEffect(() => {
    if (postId || nameTouchedRef.current) {
      return;
    }
    if (viewer?.name && !displayName) {
      setDisplayName(viewer.name);
    }
  }, [viewer, postId, displayName]);

  const insertImage = () => imageInputRef.current?.click();

  const handleInlineImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) {
      return;
    }
    setError(undefined);
    try {
      const { url } = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload image",
      );
    }
  };

  const handleCoverSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setError(undefined);
    setIsUploadingCover(true);
    try {
      const { storageId, url } = await uploadImage(file);
      setCoverImageId(storageId);
      setCoverImageUrl(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload cover image",
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (status: SaveStatus) => {
    if (!editor) {
      return;
    }
    const markdownStorage = (
      editor.storage as { markdown?: { getMarkdown: () => string } }
    ).markdown;
    const body = markdownStorage?.getMarkdown() ?? "";

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!body.trim()) {
      setError("Post content is required");
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      if (postId && existing) {
        await updatePost({
          postId,
          title: title.trim(),
          body,
          displayName: displayName.trim(),
          excerpt: excerpt.trim() || undefined,
          coverImageId: coverImageId ?? null,
          status,
        });
        window.location.href = `/blog/${existing.slug}`;
      } else {
        const { slug } = await createPost({
          title: title.trim(),
          body,
          displayName: displayName.trim(),
          excerpt: excerpt.trim() || undefined,
          coverImageId,
          status,
        });
        window.location.href = `/blog/${slug}`;
      }
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Could not save post",
      );
      setIsSaving(false);
    }
  };

  if (postId && existing === undefined) {
    return <p className="py-12 text-center text-gray-500">Loading editor…</p>;
  }

  if (postId && existing === null) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Post unavailable
        </h1>
        <p className="mb-4 text-gray-600">
          This post does not exist or you are not its author.
        </p>
        <a href="/" className="font-medium text-indigo-600 hover:text-indigo-800">
          Back to the blog
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">
        {postId ? "Edit post" : "New post"}
      </h1>

      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg font-semibold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />

      <input
        type="text"
        placeholder="Your name"
        value={displayName}
        onChange={(e) => {
          nameTouchedRef.current = true;
          setDisplayName(e.target.value);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />

      <textarea
        placeholder="Short excerpt (optional, shown on the blog index)"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        className="min-h-[60px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploadingCover}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {isUploadingCover ? "Uploading…" : "Upload cover image"}
        </button>
        {coverImageUrl && (
          <div className="flex items-center gap-2">
            <img
              src={coverImageUrl}
              alt="Cover preview"
              className={coverImagePreviewClass}
            />
            <button
              type="button"
              onClick={() => {
                setCoverImageId(undefined);
                setCoverImageUrl(null);
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-gray-300">
        {editor && (
          <EditorToolbar editor={editor} onInsertImage={insertImage} />
        )}
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleSave("published")}
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => void handleSave("draft")}
          disabled={isSaving}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save draft
        </button>
        <a
          href="/"
          className="rounded-md px-4 py-2 text-center font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          Cancel
        </a>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleInlineImageSelected(e)}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleCoverSelected(e)}
      />
    </div>
  );
}

export default withConvexProvider(function PostEditor({
  postId,
}: {
  // Accepts a raw string from Astro route params; cast to the branded id below.
  postId?: string;
}) {
  useEnsureUser();

  return (
    <>
      <Unauthenticated>
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-gray-600">
          Please sign in to write a post.
        </p>
      </Unauthenticated>
      <Authenticated>
        <PostEditorForm postId={postId as Id<"posts"> | undefined} />
      </Authenticated>
    </>
  );
});
