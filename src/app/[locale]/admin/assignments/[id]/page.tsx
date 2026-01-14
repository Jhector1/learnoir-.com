import { prisma } from "@/lib/prisma";
import AssignmentEditor from "@/components/admin/assignments/AssignmentEditor";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sections = await prisma.practiceSection.findMany({
    orderBy: [{ order: "asc" }],
    select: { id: true, slug: true, title: true, topics: true },
  });

  const assignment =
    id === "new"
      ? null
      : await prisma.assignment.findUnique({
          where: { id },
          include: { section: { select: { id: true, title: true, slug: true, topics: true } } },
        });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <AssignmentEditor
        mode={id === "new" ? "new" : "edit"}
        initialAssignment={assignment as any}
        sections={sections as any}
      />
    </main>
  );
}
