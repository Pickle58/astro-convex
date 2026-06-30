import { withConvexProvider } from "../lib/convex.tsx";
import { CommentForm, useEnsureUser } from "./CommentForm.tsx";
import { CommentList } from "./CommentList.tsx";

export default withConvexProvider(function Comments() {
  useEnsureUser();

  return (
    <>
      <CommentForm />
      <CommentList />
    </>
  );
});
