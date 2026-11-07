# Knowledge graph implementation and Level 3 scope

Open a lecture and choose **Knowledge map**. The graph works without an API key. Compiled lecture key terms originate from the existing AI compiler; the graph only keeps concepts that literally appear in an original source. Synthetic sample vocabulary is explicitly labeled as such. Student-added terms undergo the same exact-term check.

## Ontology

Classes: Course groups teaching context; Lecture represents the current learning unit; Source retains the original evidence; Concept represents a term to trace.

Relations: Course contains Lecture; Lecture uses Source; Source mentions Concept. Mentions carry sourceId, an exact quote, addedBy and recordedAt. Dates reflect available source/compilation metadata, not a claim of independently verified authorship. No student identity or performance records are inferred.

The UI shows the relationship chain, lets students trace a concept to source text, add/remove terms for the session, and export reviewed JSON. Edits remain session-only until exported; there is no authenticated lecturer editing workflow.

## Query and validation

src/lib/knowledge-graph.ts builds and queries an explicit JSON adjacency graph. Queries match a known concept and traverse existing evidence edges. They do not call an LLM or invent missing relationships. Unsupported concepts and questions about prerequisites, criteria or mastery receive an explicit limitation response.

Validation checks that endpoints exist, quotations occur in original text, and each concept has original-source support. Exact term presence verifies a mention, not a definition's accuracy or an inferred semantic relationship. Manual review remains necessary. Source snapshots update when lecture material changes.

## Deliverables

- knowledge-graph.json: populated, synthetic sample graph with provenance.
- graph-examples.json: three answer/path/evidence examples, including an unsupported prerequisite question.
- tests/knowledge-graph.test.ts: endpoint, quote, abstention and edit-validation tests.
- src/components/knowledge-map.tsx: visualization, evidence review, query UI and export.

## Honest Level 3 status

A working partial Path B. It provides ontology, a populated/exportable graph, deterministic graph-grounded answers and three example interactions. It does not implement cross-course prerequisites, grading criteria, a Neo4j/SPARQL service, graph grounding for every existing chat reply, or durable multi-user graph editing. These are possible next steps, not implemented claims. Multi-agent and launch-campaign paths are not claimed.
