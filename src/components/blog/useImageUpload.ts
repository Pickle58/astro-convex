import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type UploadedImage = {
  storageId: Id<"_storage">;
  url: string;
};

/** Upload an image file to Convex storage and resolve its servable URL. */
export function useImageUpload() {
  const convex = useConvex();

  return useCallback(
    async (file: File): Promise<UploadedImage> => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files can be uploaded");
      }

      const uploadUrl = await convex.mutation(api.posts.generateUploadUrl, {});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Image upload failed");
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };

      const url = await convex.query(api.posts.getImageUrl, { storageId });
      if (!url) {
        throw new Error("Could not resolve the uploaded image");
      }

      return { storageId, url };
    },
    [convex],
  );
}
