import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendGetPost, backendMe } from "@/lib/api";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { CommentForm } from "@/components/board/comment-form";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { PAGE_ROUTES, POST_CATEGORY, POST_CATEGORY_LABEL, ROLE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function BoardPostPage({
  params,
}: {
  params: Promise<{ buildingId: string; postId: string }>;
}) {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  const { buildingId, postId } = await params;

  let post;
  try {
    post = await backendGetPost(token, postId);
  } catch {
    return (
      <AppShell unread={0} userInitial="">
        <EmptyState text={MESSAGES.board.postNotFound} />
      </AppShell>
    );
  }

  let me = null;
  try {
    me = await backendMe(token);
  } catch {}

  const tone = post.category === POST_CATEGORY.NOTICE ? "warning" : "neutral";
  const label = POST_CATEGORY_LABEL[post.category];
  const dateStr = post.createdAt ? new Date(post.createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <AppShell unread={0} userInitial="">
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Chip tone={tone}>{label}</Chip>
          {dateStr && <span className="text-[12px] text-text-3">{dateStr}</span>}
        </div>
        <h1 className="mb-4 text-[20px] font-extrabold tracking-tight">{post.title}</h1>
        <p className="whitespace-pre-wrap text-[15px] text-text leading-relaxed">{post.content}</p>
      </Card>

      {me?.role === ROLE.OWNER && me.id !== post.authorId && (
        <StartChatButton buildingId={buildingId} tenantId={post.authorId} label={MESSAGES.chat.startTenant} />
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-[16px] font-bold text-text">댓글 {post.comments.length}개</h2>
        {post.comments.length === 0 ? (
          <EmptyState text={MESSAGES.comment.empty} />
        ) : (
          <Card className="p-0">
            <div className="divide-y divide-border px-4">
              {post.comments.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.content}
                  meta={c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : undefined}
                />
              ))}
            </div>
          </Card>
        )}
        <CommentForm postId={postId} />
      </section>
    </AppShell>
  );
}
