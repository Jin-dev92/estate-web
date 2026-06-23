import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { PAGE_ROUTES, POST_CATEGORY, POST_CATEGORY_LABEL, type PostCategory } from "@/lib/constants";

type Props = {
  id: string;
  category: PostCategory;
  title: string;
  createdAt?: string;
  buildingId: string;
};

export function PostListItem({ id, category, title, createdAt, buildingId }: Props) {
  const tone = category === POST_CATEGORY.NOTICE ? "warning" : "neutral";
  const label = POST_CATEGORY_LABEL[category];
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <Link href={PAGE_ROUTES.boardPost(buildingId, id)} className="flex items-center gap-3 py-3.5 hover:bg-surface-2 px-4 -mx-4">
      <Chip tone={tone}>{label}</Chip>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">{title}</span>
      {dateStr && <span className="shrink-0 text-[12px] text-text-3">{dateStr}</span>}
    </Link>
  );
}
