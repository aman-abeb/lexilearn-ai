"use client";
import { useMemo, useState } from "react";
import type { Material } from "@/lib/contracts";
import { buildKnowledgeGraph, queryKnowledgeGraph } from "@/lib/knowledge-graph";

export function KnowledgeMap({ material, onOpenSource }: { material: Material; onOpenSource: (id: string) => void }) {
  const [question, setQuestion] = useState("");
  const [term, setTerm] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [asked, setAsked] = useState("");
  const graph = useMemo(() => buildKnowledgeGraph(material, added, hidden), [material, added, hidden]);
  const concepts = graph.nodes.filter(node => node.type === "Concept");
  const answer = asked ? queryKnowledgeGraph(graph, asked) : null;
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "lecture-knowledge-graph.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="knowledge-map" aria-labelledby="knowledge-map-title"><div className="section-heading"><div><h2 id="knowledge-map-title">Your lecture, connected</h2><p className="field-help">Explore which sources mention each concept. Every connection has evidence.</p></div><button className="button button-secondary button-small" onClick={download}>Export graph</button></div>
    <div className="graph-ontology" aria-label="Graph relationship types"><span>Course</span><small>contains</small><span>Lecture</span><small>uses</small><span>Source</span><small>mentions</small><span>Concept</span></div>
    <p className="field-help">Concepts come from compiled key terms, checked against the original text. The illustrative sample includes a small checked vocabulary. A mention does not prove mastery or a prerequisite.</p>
    <div className="graph-concepts">{concepts.map(node => <span key={node.id}><button className="button button-secondary button-small" onClick={() => { setQuestion(`Where is ${node.label} mentioned?`); setAsked(`Where is ${node.label} mentioned?`); }}>{node.label}</button><button className="graph-remove" aria-label={`Remove ${node.label} from this graph`} onClick={() => setHidden([...hidden, node.label])}>×</button></span>)}</div>
    {!concepts.length && <p className="notice">Compile your notes to discover key terms, or add a term that appears in an original source.</p>}
    <form onSubmit={event => { event.preventDefault(); setAdded([...added, term.trim()]); setHidden(hidden.filter(item => item !== term.trim().toLowerCase())); setTerm(""); }}><label className="field-label" htmlFor="graph-term">Review the graph: add a source term</label><div className="graph-form-row"><input id="graph-term" className="text-input" value={term} onChange={event => setTerm(event.target.value)} required maxLength={100} placeholder="A term from your notes" /><button className="button button-secondary">Add term</button></div></form>
    <p className="field-help">Edits apply to this session. Export the graph to keep your reviewed version and its provenance.</p>
    <form onSubmit={event => { event.preventDefault(); setAsked(question); }}><label className="field-label" htmlFor="graph-question">Ask the graph</label><div className="graph-form-row"><input id="graph-question" className="text-input" value={question} onChange={event => setQuestion(event.target.value)} required maxLength={500} placeholder="Where is this concept mentioned?" /><button className="button button-primary">Trace sources</button></div></form>
    {answer && <div role="status" className="graph-answer"><p>{answer.answer}</p>{answer.paths.map(path => <article key={path.sourceId}><p className="field-help">{path.labels.join(" → ")}</p><blockquote>{path.quote}</blockquote><button className="button button-secondary button-small" onClick={() => onOpenSource(path.sourceId)}>Check original source</button></article>)}</div>}
    {graph.warnings.map(warning => <p className="notice" key={warning}>{warning}</p>)}
  </section>;
}
