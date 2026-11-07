import type { Material } from "./contracts";

export type GraphNode = { id: string; type: "Course" | "Lecture" | "Source" | "Concept"; label: string };
export type GraphEdge = { from: string; to: string; relation: "contains" | "uses" | "mentions"; sourceId?: string; quote?: string; addedBy: string; recordedAt: string };
export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[]; warnings: string[] };
const sampleTerms = ["machine learning", "model", "supervised learning", "classification", "regression", "overfitting", "accuracy"];

/** Source-backed relationships only. Concept names never imply prerequisites or mastery. */
export function buildKnowledgeGraph(material: Material, addedTerms: string[] = [], hiddenTerms: string[] = []): KnowledgeGraph {
  const nodes: GraphNode[] = [{ id: material.courseId, type: "Course", label: material.course }, { id: material.id, type: "Lecture", label: material.title }];
  const edges: GraphEdge[] = [{ from: material.courseId, to: material.id, relation: "contains", addedBy: "lecture metadata", recordedAt: material.createdAt }];
  const warnings: string[] = [];
  for (const source of material.sources) {
    nodes.push({ id: source.id, type: "Source", label: source.name });
    edges.push({ from: material.id, to: source.id, relation: "uses", addedBy: "lecture metadata", recordedAt: source.updatedAt ?? source.addedAt });
  }
  const extracted = material.compilation?.keyTerms.map(item => item.term) ?? (material.isSample ? sampleTerms : []);
  const terms = [...new Set([...extracted, ...addedTerms].map(term => term.trim().toLowerCase()).filter(Boolean))].filter(term => !hiddenTerms.includes(term));
  for (const term of terms) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
    const evidence = material.sources.flatMap(source => {
      const match = pattern.exec(source.text);
      if (!match) return [];
      const start = Math.max(0, source.text.lastIndexOf(".", match.index - 1) + 1);
      const end = source.text.indexOf(".", match.index + term.length);
      const quote = source.text.slice(start, end < 0 ? Math.min(source.text.length, match.index + term.length + 200) : end + 1).trim();
      return [{ source, quote }];
    });
    if (!evidence.length) { warnings.push(`“${term}” was omitted because no original source contains that term.`); continue; }
    const id = `concept:${term}`;
    nodes.push({ id, type: "Concept", label: term });
    for (const { source, quote } of evidence) edges.push({ from: source.id, to: id, relation: "mentions", sourceId: source.id, quote, addedBy: addedTerms.some(item => item.toLowerCase() === term) ? "student review" : material.isSample && !material.compilation ? "illustrative sample vocabulary" : "AI key term, checked against original text", recordedAt: material.compilation?.generatedAt ?? source.updatedAt ?? source.addedAt });
  }
  return { nodes, edges, warnings };
}

export function queryKnowledgeGraph(graph: KnowledgeGraph, question: string) {
  const query = question.trim().toLowerCase();
  const concept = graph.nodes.filter(node => node.type === "Concept").sort((a, b) => b.label.length - a.label.length).find(node => query.includes(node.label));
  if (!concept || /prerequisite|requires|before|grade|criterion|criteria|mastered|struggle/.test(query)) return { answer: "This graph does not contain that information. It records which original sources mention a concept, not prerequisites, grading criteria, or student mastery.", paths: [] as { labels: string[]; sourceId: string; quote: string }[] };
  const paths = graph.edges.filter(edge => edge.to === concept.id && edge.relation === "mentions").map(edge => {
    const source = graph.nodes.find(node => node.id === edge.from)!;
    const lecture = graph.nodes.find(node => node.type === "Lecture")!;
    const course = graph.nodes.find(node => node.type === "Course")!;
    return { labels: [course.label, lecture.label, source.label, concept.label], sourceId: source.id, quote: edge.quote! };
  });
  return { answer: `“${concept.label}” appears in ${paths.length} original ${paths.length === 1 ? "source" : "sources"}. The evidence below shows exactly what the sources say.`, paths };
}
