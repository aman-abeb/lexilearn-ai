import { NewLectureForm } from "@/components/new-lecture-form";

export default async function NewLecturePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  return <NewLectureForm initialCourseId={course} />;
}
