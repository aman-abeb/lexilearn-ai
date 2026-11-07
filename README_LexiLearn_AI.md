# LexiLearn AI

### University reading support, designed with students with dyslexia in mind

LexiLearn AI helps students with dyslexia work through university reading materials using smaller sections, adjustable presentation, terminology support, and optional audio. Students choose what helps them, while the original academic meaning remains available for reference.

**Project status:** This document is the product vision and feature roadmap. The application foundation and run instructions are documented in [README.md](README.md); the [three-person task plan](docs/TEAM_TASKS.md) describes the next implementation work. Features below should not be read as implemented or validated unless listed in the starter README.

## Contents

- [Overview](#overview)
- [The problem](#the-problem)
- [Who it is for](#who-it-is-for)
- [Core experience](#core-experience)
- [Full feature list](#full-feature-list)
- [Hackathon MVP](#hackathon-mvp)
- [Example demonstration](#example-demonstration)
- [Proposed agent workflow](#proposed-agent-workflow)
- [Responsible design](#responsible-design)
- [Success measures](#success-measures)
- [Hackathon deliverables](#hackathon-deliverables)
- [One-sentence pitch](#one-sentence-pitch)

## Overview

Dense slides, long written notes, crowded layouts, and unfamiliar terminology can make university reading demanding for some students with dyslexia. The initial LexiLearn experience focuses on this specific reading context, with a real lecture and feedback from the students it aims to support.

LexiLearn lets students choose how the same course content is presented. The working first version includes paragraph and sentence reading, comfortable text and spacing choices, saved section progress, revisit markers, a source-linked personal glossary, and adjustable narration. AI terminology explanations, source-linked clarification, and short comprehension checks are planned additions to this reading experience.

**Reading accessibility for students with dyslexia is the initial focus.** Comprehension checks and progress tracking support that purpose. No layout, font, or method is assumed to work for every dyslexic student. Captions, transcripts, and support for other accessibility needs remain part of the broader roadmap.

## The problem

- Dense text, unfamiliar terminology, and crowded layouts can make course materials difficult to navigate for some students with dyslexia.
- Students may need to reread a passage, change its presentation, hear it aloud, or clarify a term while keeping their place in the original material.
- Relevant explanations may be scattered across slides, recordings, and notes.
- Simplifying material can accidentally remove an important definition, equation, condition, or exception.
- A single presentation format cannot address every student's accessibility needs; students with the same diagnosis may prefer different options.
- In the broader roadmap, captions and transcripts also address barriers to spoken content for students with hearing impairments.

For the hackathon, the team should demonstrate this problem using **one real university lecture and a specific student use scenario**.

## Who it is for

| User | Intended value |
|---|---|
| Students with dyslexia — primary audience | Adjustable reading views, smaller sections, help keeping one's place, terminology support, and optional audio |
| Other students who find dense written material difficult to access | The same student-controlled reading options, without requiring a diagnosis |
| Students who cannot reliably access spoken content — later expansion | Captions, transcripts, and a complete text-first experience |
| Students with other accessibility needs or preferences | Control over presentation, navigation, and explanation detail |
| Lecturers | Tools to review adaptations, correct source processing, and improve shared course materials |

No diagnosis is required. Features are selected by the student rather than automatically assigned based on a disability label.

## Core experience

1. A student adds text from one real university lecture.
2. LexiLearn retains the original and presents navigable reading sections.
3. The student chooses text size, spacing, typeface, background, and focus preferences.
4. The student reads one section or sentence at a time, optionally listening with speed and pause controls, and can return to the original text.
5. The student saves terms in a personal glossary, marks passages to revisit, and resumes from the last section after a break.
6. In the next milestone, the student requests source-grounded terminology support or clarification of a difficult section.
7. A short comprehension check provides feedback and suggests a relevant section to revisit.

## Full feature list

This section describes the complete product vision. Only the subset in [Hackathon MVP](#hackathon-mvp) is proposed for the initial prototype.

### 1. Student-controlled accessibility preferences

- **Simple onboarding:** Students describe what makes studying difficult without disclosing a medical diagnosis.
- **Presentation preferences:** Choose shorter text sections, larger text, wider spacing, text-first content, or optional audio.
- **Explanation preferences:** Choose concise explanations, more detail, examples, or step-by-step presentation.
- **Saved settings:** Apply preferred settings across lectures when the student chooses to save them.
- **Adjustments at any time:** Change settings for a particular document or passage.
- **Preview before applying:** Compare presentations using a short sample.

### 2. Course-material uploads and organization

- **Slide uploads:** Import PDF and PowerPoint presentations.
- **Document uploads:** Import lecture notes, readings, and text documents.
- **Recording uploads:** Import lecture audio and video.
- **Existing transcript uploads:** Use lecturer-provided captions or transcripts.
- **Scanned material:** Extract text from scanned pages and images, flagging uncertain recognition for review.
- **Course organization:** Group materials by course, topic, and lecture.
- **Original-file access:** Keep original materials available alongside adaptations.

### 3. Content processing and source connections

- **Speech transcription:** Turn recorded lectures into searchable text.
- **Slide-text extraction:** Identify titles, paragraphs, lists, and other readable content.
- **Transcript-to-slide linking:** Connect spoken explanations to relevant slides, with uncertain matches marked for review.
- **Lecture sections:** Divide long materials into navigable topics.
- **Course glossary:** Collect technical terms and explanations linked to their sources.
- **Lecture search:** Find where a topic appears in slides, notes, and recordings.
- **Correction tools:** Let authorized users fix transcription errors and incorrect source links.

### 4. Customizable reading experience

- **Adjustable typography:** Change text size, font, line spacing, and paragraph spacing.
- **Display controls:** Choose contrast and background options.
- **Chunked reading:** Break dense passages into manageable sections.
- **Focus view:** Show one section at a time with optional reduced visual clutter.
- **Sentence guide:** Move through a paragraph one sentence at a time without rewriting the original wording.
- **Plain-language explanations:** Explain difficult wording while retaining necessary technical terms.
- **Inline definitions:** Open a term's explanation without leaving the passage.
- **Personal vocabulary notes:** Write, update, or remove a term's meaning and return to the section where it was encountered.
- **Step-by-step presentation:** Separate complex explanations into numbered steps.
- **Structured navigation:** Move through headings and sections using a keyboard and assistive technology.

### 5. Audio and text alternatives

- **Synchronized captions:** Display captions alongside recorded video.
- **Editable transcripts:** Correct names, terminology, and transcription mistakes.
- **Transcript navigation:** Select a sentence to jump to its recording timestamp.
- **Text-first lecture view:** Access lecture content and activities without depending on audio.
- **Text-to-speech:** Listen to selected passages or an entire section.
- **Playback controls:** Adjust speed and pause or replay sections.
- **Synchronized highlighting:** Highlight the passage being read aloud.
- **Optional spoken responses:** Allow speech input where useful, with an equivalent text option.

### 6. Adaptation of selected content

- **Select and adapt:** Highlight a passage and request a different presentation.
- **Explain unfamiliar terms:** Clarify terminology in the context of the lecture.
- **Break down an explanation:** Turn a difficult passage into smaller steps.
- **Request an example:** Generate a clearly labelled illustrative example connected to the concept.
- **Describe visual content:** Provide reviewable text descriptions of diagrams and charts.
- **Explain equations:** Describe symbols and the steps shown in the source.
- **Compare presentations:** Switch between original and adapted versions.
- **Immediate feedback:** Mark an adaptation as helpful, unclear, too detailed, or inaccurate.

### 7. Academic meaning and source checks

- **Source references:** Link explanations to the relevant page, slide, or timestamp.
- **Essential-content checks:** Flag potentially missing definitions, equations, conditions, or exceptions.
- **Uncertainty notices:** Identify unclear source passages and explanations that lack sufficient source support.
- **Visible additions:** Distinguish original course content from generated examples or explanations.
- **Problem reporting:** Let students flag inaccurate or unhelpful adaptations.
- **Instructor review:** Allow lecturers to correct or approve shared adaptations.
- **Version history:** Record corrections so users can identify updated material.

These checks support review; they do not guarantee that every adaptation is correct.

### 8. Comprehension support

- **Short comprehension checks:** Offer a few questions after a section.
- **Accessible question formats:** Apply the student's presentation settings to practice activities.
- **Explanatory feedback:** Explain why an answer is correct or where reasoning needs attention.
- **Hints:** Guide students through a practice question before revealing a worked explanation.
- **Targeted review:** Recommend revisiting a particular section when answers reveal a possible gap.
- **Progress tracking:** Save completed sections, practice attempts, and topics to revisit.
- **Feedback on difficulty:** Ask whether the difficulty was the presentation, unfamiliar terminology, or the concept itself.
- **Learning boundaries:** Redirect requests to complete assessed work toward explanations, hints, and practice.

A wrong answer is not a diagnosis. The app should treat the reason for difficulty as uncertain and allow the student to explain or correct its interpretation.

### 9. Lecturer tools

- **Shared course materials:** Publish one set of lecture resources for students to personalize.
- **Terminology corrections:** Maintain preferred definitions, spellings, and course-specific terminology.
- **Review queue:** Inspect reported transcription or adaptation problems.
- **Approved accessible versions:** Share reviewed adaptations with the class.
- **Aggregated feedback:** See which passages or concepts repeatedly cause difficulty without displaying students' accessibility profiles.
- **Small-group privacy protection:** Suppress reporting where students could be identifiable.
- **Export:** Download reviewed transcripts and accessible notes.

### 10. Privacy, reliability, and application access

- **Optional preference storage:** Let students choose whether their settings are remembered.
- **Clear data controls:** Explain what is stored, who can access it, and which external services process it.
- **Deletion and export:** Let students remove or download their materials and learning records.
- **Sharing permissions:** Keep personal adaptations private unless deliberately shared.
- **Downloadable study materials:** Export accessible notes and transcripts for offline use.
- **Low-bandwidth access:** Offer text-based views without requiring recordings to load.
- **Saved progress:** Resume a lecture where the student stopped.
- **Service-failure fallback:** Keep previously generated materials available when AI processing is unavailable.
- **Accessible application controls:** Provide keyboard navigation, clear focus indicators, labelled controls, and understandable error messages.

## Hackathon MVP

Build one complete experience around **one real lecture and the reading needs of students with dyslexia**. Start with pasted text or `.txt` input; add extraction for the lecture's actual source format as needed. Presentation options should be customizable rather than labelled as universally suitable for every dyslexic student. This table is the target milestone, not a completion report.

| Priority | Feature | Demonstrable result |
|---|---|---|
| Core | Import text from one real lecture | The experience uses actual course material |
| Core | Preserve source text and section references | The student can inspect the original content |
| Core | Select text size, spacing, typeface, theme, and focus preferences | Presentation changes according to the student's choices |
| Core | Provide smaller reading sections and optional narration | The student can work through the lecture at their own pace |
| Core | Clarify a selected passage | The student can request smaller steps or terminology support |
| Core | Link adaptations to original sources | The student can inspect the relevant slide or transcript passage |
| Core | Generate and score a short comprehension check | The agent performs an action beyond replying in chat |
| Core | Save the result and recommend a section to revisit | The next action responds to demonstrated difficulty |
| Core | Demonstrate a learning or knowledge boundary | The agent flags insufficient evidence or guides instead of completing assessed work |

The remaining features form the roadmap. Audio transcription, full lecturer dashboards, broad file-format support, synchronized video captions, advanced diagram and equation support, automated meaning-preservation checks, and offline exports can follow after the reading flow works.

## Example demonstration

This is the target AI-enabled demonstration after the application foundation is extended.

1. **Import:** A student adds text from a real machine-learning lecture.
2. **Choose:** A student with dyslexia selects short sections, comfortable text size, and wider spacing according to their own preferences.
3. **Read:** LexiLearn presents the lecture in manageable sections while retaining the original text and source references.
4. **Clarify:** The student selects an unfamiliar term and requests an explanation in the context of the lecture.
5. **Verify:** The student opens the original source to compare it with the adaptation.
6. **Practice:** LexiLearn generates a short comprehension check and explains the feedback.
7. **Continue:** The app saves the result and recommends a relevant section to revisit.
8. **Hold a boundary:** When asked about a claim missing from the uploaded materials, the agent identifies the missing evidence and requests a relevant source rather than inventing course content.

## Proposed agent workflow

| Component | Responsibility |
|---|---|
| Inputs | Course materials, student-selected preferences, requests, and practice responses |
| Knowledge | Extracted lecture content, source locations, course glossary, and reviewed corrections |
| Tools and actions | Extract content, transcribe recordings, retrieve source passages, save preferences, generate and score practice, and record progress |
| Decisions | Select relevant source material, apply the requested presentation, identify missing evidence, and recommend a review section |
| Outputs | Accessible lecture views, source-linked explanations, practice feedback, and saved review recommendations |

AI supports transcription, contextual explanations, content adaptation, and interpretation of practice responses. Standard application logic handles display settings, navigation, permissions, storage, and source links.

The foundation uses Next.js App Router, React, TypeScript, and Node.js `route.ts` handlers. See [README.md](README.md) for setup and [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the implemented boundaries. A live AI model has not yet been selected or connected.

## Responsible design

- **Student choice:** Do not require or infer a medical diagnosis. Let students change preferences and correct the app's interpretation of their difficulties.
- **Academic fidelity:** Preserve necessary terminology and conditions. Keep originals accessible and make generated additions identifiable.
- **Human review:** Allow correction of transcripts, source links, and adaptations. Show uncertainty rather than presenting every output as reliable.
- **Data control:** Use course materials with appropriate permission, explain external processing, and provide clear retention, deletion, and sharing controls.
- **Privacy:** Keep individual accessibility preferences private. Design aggregated lecturer feedback to avoid identifying students.
- **Learning support:** Guide practice and understanding. Do not present the system as a replacement for lecturers, learning-support specialists, or official accommodations.
- **Continuity:** Plan for low bandwidth and AI-service outages through text views and access to previously generated materials.
- **Access testing:** Review the interface with keyboard and assistive-technology use, and seek feedback from intended users.

## Success measures

These are proposed evaluation measures, not claims of demonstrated improvement.

| Area | What to check |
|---|---|
| Access | Can a student complete the core lecture flow using their chosen presentation and input methods? |
| Navigation | Can the student find a concept and return to its original source? |
| Academic meaning | Do reviewed adaptations retain essential definitions, equations, conditions, and exceptions? |
| Comprehension | Can the student answer a new question about the concept after using the adapted material? |
| Usability | Which presentation changes do students report as useful, confusing, or unnecessary? |
| Agent actions | Are practice results saved and used to select a relevant review section? |
| Boundaries | Does the agent respond appropriately when sources are insufficient or a request would substitute for assessed work? |

Record the number of participants, the lecture used, and the limits of any small pilot. Avoid claiming that a short demonstration proves improved learning or universal accessibility.

## Hackathon deliverables

- [ ] A specific learning-access problem grounded in a real university context
- [ ] A defined target student and lecture use scenario
- [ ] A working prototype demonstrating the MVP flow
- [ ] Agent instructions describing its role, goal, knowledge, rules, procedure, and memory
- [ ] A description of the course materials and the actions the agent takes
- [ ] Architecture documentation covering inputs, knowledge, tools, decisions, and outputs
- [ ] Updated README with setup, run instructions, models, libraries, and custom logic
- [ ] Example interactions, including one that demonstrates a boundary
- [ ] Screenshots or an export of the setup and workflow
- [ ] Proposed success measures and any collected feedback
- [ ] A rehearsed 60-second pitch and presentation materials
- [ ] Optional short demo video

## One-sentence pitch

> LexiLearn AI helps students with dyslexia work through university materials in manageable sections, choose a comfortable reading presentation, and clarify difficult passages while staying connected to the original source.
