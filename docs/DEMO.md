# Course-to-lecture demo

## The story

A university student with dyslexia receives a lecture as slides, personal notes, and a Webex recording. They want one connected set of notes, a comfortable reading presentation, and a clear place to return after a break.

## Walkthrough

1. **Set up the course.** In My courses, add a course name and optional code/term. Open Add lecture from its card.
2. **Name the lecture.** Show the saved course selection and automatically assigned Lecture 1. Add a descriptive title.
3. **Bring the sources together.** Enter pasted notes, import a PDF/PPTX slide deck, or paste a recording link. Save & open lecture includes the current source without pressing Add source first. Use Add source to collect several inputs. Import a recording transcript as TXT/VTT/SRT, or save the link for later.
4. **Create study notes.** With `OPENAI_API_KEY` configured, choose Create study notes. The lecture is saved before compilation begins. If compilation fails, open the saved lecture or retry without creating a duplicate.
5. **Read comfortably.** Show One section, Full notes, Sentence guide, and the collapsed Reading settings. Change size/spacing/background. Focus view hides navigation and has an Exit focus button.
6. **Inspect the sources.** Follow a compiled section's source action. Show original extracted text and the recording's Open recording link. A link alone does not supply its audio to the model.
7. **Fill a gap.** On a link-only recording, choose Add transcript. Save it, return to Study notes, and update the compilation. The lecture number and recording reference remain the same.
8. **Keep your place.** Mark a section as read, save another to revisit, and add a definition in My glossary. Refresh and return through Continue reading.
9. **Add the next lecture.** Open the same course and show that the next lecture is numbered 2.

Without an AI key, demonstrate the same course/source flow using Save & open lecture. The study screen explains that compilation is not connected and provides the original-text reader. Do not present the collected source text as AI-compiled notes.

## Browser acceptance checks

- [ ] Saved courses appear in the new-lecture selector and survive refresh/restart.
- [ ] Lecture numbers increase within their course; a different course starts at 1.
- [ ] Course-filter and search empty states have clear recovery actions.
- [ ] The two-step form can be used with a keyboard, including adding a course inline.
- [ ] Saving directly after pasting a link/text or importing a file includes the current source exactly once. An empty extra source editor does not block saving already-added sources.
- [ ] Invalid current-source input receives a useful error without dropping the text. Saving is temporarily disabled while file extraction finishes.
- [ ] Imported source text can be reviewed before saving; unsupported, empty, or oversized inputs receive useful errors.
- [ ] A link-only recording can be saved, then updated with a transcript inside the same lecture.
- [ ] The interface distinguishes original text, generated study notes, and personal glossary definitions.
- [ ] Slide-like text attached to a recording is identified as supplied slide text rather than verified recording speech. UniMiB recording pages explain the sign-in and transcript requirement.
- [ ] Source links open the correct original text. New sources or source edits offer an update action.
- [ ] Compilation failure retains previous notes and all originals.
- [ ] Regeneration resets section markers and preserves source-linked personal definitions.
- [ ] Sentence and section changes stop narration. Pause/resume/stop and saved speed work in a supported browser.
- [ ] Refresh restores preferences and the last section without overwriting stored values with defaults.
- [ ] At 320px and 375px, including maximum text size and spacing, controls wrap and the page does not scroll sideways.
- [ ] Focus mode can be exited by keyboard; focus indicators remain visible.
- [ ] Blocked storage and unsupported speech leave reading available.

Run `npm run typecheck`, `npm test`, and `npm run build`. Model and speech mocks can verify the control flow, but live compilation quality, a private Webex integration, and audible voice quality require their own real-service checks.
