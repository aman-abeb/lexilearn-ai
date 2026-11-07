# First-version demo

## The story

A university student with dyslexia is reading a dense lecture. They want to work through smaller pieces, hear a difficult sentence, keep track of a new term, and return after a break without searching for their place.

## A two-minute walkthrough

1. **Open a lecture.** Choose the labelled sample from the library. For a presentation about real course material, import a lecture you have permission to use.
2. **Choose a presentation.** Change text size, spacing, and page colour. Turn on Sentence guide and show that Next sentence keeps the source wording intact. Switch to Original text to inspect the whole lecture.
3. **Listen at your own pace.** Return to the section view, choose 0.75× or 0.9×, and read a sentence aloud. Pause, resume, and stop. Audio depends on the browser's installed voice service.
4. **Keep your place.** Mark a section as read, move to another, and select Revisit later. Visiting a section alone does not mark it as read.
5. **Remember a term.** In the sample's Part 3, add “overfitting” with a meaning in your own words. Show its Return to Part 3 source action. The definition is the student's note.
6. **Take a break.** Return to the library, select Continue, and refresh. The last section, read/revisit markers, glossary, and preferences should return.

## Browser acceptance checks

- [ ] Navigate the guide, section picker, read marker, revisit list, glossary, and audio controls with the keyboard. Focus indicators remain visible.
- [ ] Moving sections resets the sentence guide and stops active or paused narration.
- [ ] Read-aloud speed is remembered; the speed control is available again after playback stops.
- [ ] The original text remains available with the same words and paragraph breaks.
- [ ] Read markers can be unchecked. Revisit markers can be removed without changing read status.
- [ ] Glossary notes survive refresh. Saving the same term in the same section updates it; removing it removes the saved note.
- [ ] A glossary source action returns to the correct section, including from a different section.
- [ ] A different material has its own progress and glossary.
- [ ] At a 320px-wide viewport and maximum text size, controls wrap and the page does not scroll sideways.
- [ ] Malformed saved data does not crash the reader. Blocked storage shows a session-only message while reading and note-taking still work.
- [ ] Unsupported speech shows an availability message while the text remains readable.

Run `npm run typecheck`, `npm test`, and `npm run build` before sharing the prototype. Unit checks cover source preservation, stored-state validation, stale source references, and the existing backend contracts. Browser checks above cover interaction and persistence; audible voice quality should be checked on the demonstration device.

## The next demo milestone

Add a source-grounded AI explanation and a short comprehension check. Save the attempt and link its feedback to a passage to revisit. The current first version already supplies the reading, terminology-note, and resume experience for that flow.
