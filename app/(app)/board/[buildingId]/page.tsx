import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendListPosts, type Post } from "@/lib/api";
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
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">건물 게시판</h1>
      {/* 목록이 먼저다 — 게시판에 들어온 사람은 글을 읽으러 온다.
          작성 폼을 위에 두면 빈 입력칸이 화면을 차지하고 글이 스크롤 아래로 밀린다. */}
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
                likeCount={p.likeCount}
                likedByMe={p.likedByMe}
              />
            ))}
          </div>
        )}
      </Card>
      {/* PostForm이 자체 제목("새 글 작성")을 갖고 있어 여기서 h2를 더하지 않는다. */}
      <section className="mt-6">
        <PostForm buildingId={buildingId} />
      </section>
    </>
  );
}
