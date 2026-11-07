# LexiLearn: challenge fit and submission readiness

Assessed against the Student Tech Clash 2026 text supplied by the team, including the attached Level 3 brief. This is a requirements review, not an official score.

## Verdict

The prototype strongly fits Levels 1 and 2 in scope and functionality. The submission is not fully ready until the team rehearses the pitch and demonstrates the flow on actual university material. A working, limited Level 3 knowledge graph is now included. No measured learning impact or full Level 3 completion is claimed.

## Required deliverables

| Requirement | Status | Evidence and next action |
|---|---|---|
| Learning, teaching or assessment problem | Fits | Dense university lecture review and study practice, especially for dyslexic learners. No administration/logistics use case. |
| Specific target and moment | Defined | A dyslexic student revisiting a machine-learning lecture before an exam. Validate this scenario with actual students. |
| AI solution in plain language | Ready | Accessible lecture review with source-based explanations and practice requiring student attempts. |
| Use scenario | Ready for demo | Import notes/slides or available YouTube captions, compile, use reading/listening controls, try practice, inspect a source. |
| Success measures | Proposed only | Matched comprehension, 24-hour recall, time to locate evidence, self-reported effort and independent use. No results collected. |
| 60-second pitch rehearsed | Team action | Script provided below. Time it aloud and adjust to your speaking pace. |
| Working coding prototype | Implemented | Next.js/React/TypeScript app with extraction, server AI routes, narration, practice and original-source views. |
| README and architecture | Present, with limits | README lists setup/models/libraries. docs/ARCHITECTURE.md describes the pipeline but contains older references to reserved adaptation/browser narration. Prefer this report and current source code for those features. |
| Work with real material | Supported; demo evidence needed | PDF/PPTX/text/captions are accepted. The bundled sample is explicitly synthetic. Show one authorized university lecture and its original file. |
| Action beyond replying | Implemented | Creates practice, holds expected answers server-side, releases hints, checks a submitted attempt, and creates quiz questions with quoted evidence. |
| Know its limits | Implemented and tested in part | Source references/evidence are validated; prompt instructions forbid assessed-work completion; unsupported graph queries abstain. Mocked model tests establish code behavior, not a guarantee of live-model refusal. |
| Example interactions incl. a boundary | Included | Graph examples JSON has two supported questions and one unsupported relationship. Use the live tutor boundary example below as an additional rehearsal. |
| Frontend/demo video | Frontend implemented; video absent | Interface is optional. A 45–60 second recording would strengthen the hand-in. |
| Presentation | Provided | Exactly four slides, with a 4:45 speaking plan in speaker notes. Stage 1 still uses no slides. |

## The three questions judges will ask

**New, or just faster?** Reading controls, summaries and chat already exist elsewhere. Do not claim invention of those features. The stronger case is the connected workflow: the same university sources support alternative reading modes, active attempts, evidence checking and a navigable provenance graph. Demonstrate the student making a connection they can then explain independently.

**Thinking support or substitution?** Practice invites an attempt before revealing worked steps, and two limited hints provide scaffolding. The tutor prompt steers away from completing assessed work. Summaries and ready-made MCQ solutions can still encourage passive consumption. During the demo, show the student reasoning first and verifying the source, rather than simply generating an answer.

**Who benefits and who is left out?** Dyslexic students are the primary design audience, not a clinically validated outcome group. Other learners may benefit from adjustable presentation and listening. Check keyboard and screen-reader use with users. Cloud speech/tutoring need connectivity and API funding; original-text reading remains available when AI fails. No full offline guarantee. Scanned PDFs, diagrams and captionless/private recordings need additional input. Language and speech-recognition availability vary.

## Evaluation weights and the strongest presentation choices

- Creativity and innovation (40%): show one integrated learning moment and the source path in the knowledge map. Avoid a long feature tour or claims of unique technology.
- Impact (20%): name the learner and a concrete obstacle. Present pilot measures as proposed, with no invented improvement percentages.
- Technical (20%): explain inputs, extraction, original storage, validated AI outputs, held practice answers and graph provenance. Mention context limits and failures candidly.
- Effective presentation (20%): use the one-minute script for Stage 1 and the four-slide narrative for Stage 2. Rehearse the transition into a short demo.

## Architecture the team can defend

Input: notes, slides and available captions. Extraction: selectable text and slide speaker notes. Knowledge: original sources, compiled notes with valid source IDs, and a graph of explicit source mentions. Tools/actions: compilation, narration, practice generation/hints/checking, evidence-validated MCQs and graph export. Decisions: schema checks, valid IDs, source coverage, exact quote checks, context-size limits and graph abstention. Output: reading views, generated explanations, feedback and traceable source passages. Memory: local lecture JSON plus browser reading progress/glossary; practice sessions have limited lifetime. Account storage exists, but the demo sign-in opens the dashboard directly. This prototype is not a deployed multi-tenant student record system.

Current study-summary/chat context is capped at 24,000 characters and warns when truncated. This is not a guarantee that every answer considered the entire source collection. Compilation accepts a larger bounded source set. Read-aloud uses a separate server-side speech model. Keep .env and API credentials out of any submission archive.

## Boundary demonstration

Student: “Write my assessed exam answer for me.”
Expected tutor behavior: explain the relevant lecture idea, invite the student to attempt an explanation, and avoid supplying a submission-ready answer. This is the intended behavior encoded in src/server/ai/study.ts; rehearse it with the configured live model before presenting it as a demonstrated refusal.

Deterministic graph boundary: “What prerequisite comes before overfitting?” returns that the graph does not contain prerequisites or mastery information, with no fabricated path. This boundary is directly implemented and tested.

## 60-second pitch script

Imagine understanding a lecture in class, then getting stuck in a wall of notes when you revise. For a student with dyslexia, the effort of navigating that material can get in the way of thinking about it.

LexiLearn turns a student's own lecture sources into a flexible reading and practice space. They can focus on one sentence, listen at their pace, ask for an explanation, and try a problem before seeing the worked answer.

Every concept in our knowledge map connects to an original source passage, so the student can check the evidence. When the graph lacks a relationship, it says so.

Our prototype works today. Next, we want to test comprehension, next-day recall and reading effort with dyslexic university students. The goal is a student who can explain the idea independently.

## Before hand-in

1. Use one authorized, real university lecture as the main example; retain the synthetic sample as a fallback.
2. Rehearse the script aloud to 60 seconds. The slides are for Stage 2 only, with a five-minute maximum.
3. Test the tutor's assessed-work boundary on the configured live model; document the actual result.
4. Submit the PPTX, repository/run instructions, graph export and three graph examples. Exclude .env, .data student material and credentials.
5. State limitations honestly: no impact study yet, no inferred prerequisites/criteria, session-only graph edits, no multi-agent system, no launch campaign.
