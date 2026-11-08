import assert from "node:assert/strict";
import test from "node:test";
import { buildKnowledgeGraph, queryKnowledgeGraph } from "../src/lib/knowledge-graph";
import { SAMPLE_MATERIAL } from "./sample";

test("every concept edge has original evidence and valid endpoints", () => {
  const graph = buildKnowledgeGraph(SAMPLE_MATERIAL);
  assert.ok(graph.nodes.some(node => node.label === "overfitting"));
  for (const edge of graph.edges) {
    assert.ok(graph.nodes.some(node => node.id === edge.from));
    assert.ok(graph.nodes.some(node => node.id === edge.to));
    if (edge.relation === "mentions") {
      const source = SAMPLE_MATERIAL.sources.find(item => item.id === edge.sourceId)!;
      assert.ok(source.text.includes(edge.quote!));
      assert.ok(edge.addedBy && edge.recordedAt);
    }
  }
});
test("graph queries return source paths for concepts and abstain for unsupported relationships", () => {
  const graph = buildKnowledgeGraph(SAMPLE_MATERIAL);
  for (const question of ["Where is overfitting mentioned?", "Where is accuracy mentioned?"]) {
    const answer = queryKnowledgeGraph(graph, question);
    assert.equal(answer.paths.length, 1);
    assert.equal(answer.paths[0].labels.length, 4);
    assert.equal(answer.paths[0].sourceId, SAMPLE_MATERIAL.sources[0].id);
  }
  for (const question of ["What is quantum entanglement?", "What prerequisite comes before overfitting?", "Have I mastered accuracy?"]) {
    const answer = queryKnowledgeGraph(graph, question);
    assert.deepEqual(answer.paths, []);
    assert.match(answer.answer, /does not contain/);
  }
});
test("reviewed concepts need literal source evidence and can be removed", () => {
  const graph = buildKnowledgeGraph(SAMPLE_MATERIAL, ["spam", "invented concept", "a[b"], ["accuracy"]);
  assert.ok(graph.nodes.some(node => node.label === "spam"));
  assert.ok(!graph.nodes.some(node => node.label === "accuracy"));
  assert.ok(!graph.nodes.some(node => node.label === "invented concept"));
  assert.equal(graph.warnings.length, 2);
  assert.ok(graph.edges.some(edge => edge.addedBy === "student review"));
});
