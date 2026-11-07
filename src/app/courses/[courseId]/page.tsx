import { LectureLibrary } from "@/components/lecture-library";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <LectureLibrary courseId={courseId} />;
}
