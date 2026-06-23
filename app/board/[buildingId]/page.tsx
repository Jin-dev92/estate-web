import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendListPosts, type Post } from "@/lib/api";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PostListItem } from "@/components/board/post-list-item";
import { PostForm } from "@/components/board/post-form";
import { PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function BoardListPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  const { buildingId } = await params;

  let posts: Post[] = [];
  try {
    posts = await backendListPosts(token, buildingId);
  } catch {
    // 백엔드 미동작 시 빈 상태로 degrade
  }

  return (
    <AppShell unread={0} userInitial="">
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">건물 게시판</h1>
      <PostForm buildingId={buildingId} />
      <Card className="p-0">
        {posts.length === 0 ? (
          <EmptyState text={MESSAGES.board.empty} />
        ) : (
          <div className="divide-y divide-border px-4">
            {posts.map((p) => (
              <PostListItem
                key={p.id}
                id={p.id}
                category={p.category}
                title={p.title}
                createdAt={p.createdAt}
                buildingId={buildingId}
              />
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
