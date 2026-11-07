import Link from "next/link";

const features = [
  {
    image: "/landing/sentences.jpg",
    alt: "A hand points to one highlighted line on a reading card, while the lines above and below stay quiet.",
    title: "One piece at a time",
    text: "A long lecture is split into sections. When you want less on the page, the sentence guide shows a single sentence and keeps the rest one step away.",
  },
  {
    image: "/landing/listen.jpg",
    alt: "A student wears headphones and reads an open book, with soft sound waves beside the page.",
    title: "Hear it at your pace",
    text: "Listen with a natural AI-generated voice from OpenAI. Choose your voice and a speed from 0.5× to 2×, then pause, resume, or stop. The words stay on the page while you listen.",
  },
  {
    image: "/landing/glossary.jpg",
    alt: "An open notebook sits beside a small stack of blank cards, ready for terms you want to keep.",
    title: "Keep the words that matter",
    text: "Save a term in your own words and return to the passage it came from. Mark a section to revisit, and pick up at the last place you stopped.",
  },
];

export default function LandingPage() {
  return <>
    <section className="landing-hero" aria-labelledby="landing-title">
      <div>
        <p className="eyebrow">UNIVERSITY READING</p>
        <h1 id="landing-title">A calmer way through a dense lecture.</h1>
        <p className="page-subtitle">LexiLearn is a reading space for university students, designed with dyslexic learners in mind. Work through a lecture in smaller pieces, listen when that helps, and collect unfamiliar terms without losing the original wording.</p>
        <div className="landing-actions">
          <Link href="/auth" className="button button-primary">Start the demo</Link>
          <a href="#how-it-helps" className="button button-secondary">See how it helps</a>
        </div>
      </div>
      <img src="/landing/hero.jpg" width={1600} height={900} alt="A student writes in a notebook at a desk. On the wall, one line of a lecture page is highlighted in green." />
    </section>
    <section id="how-it-helps" className="landing-story" aria-labelledby="help-title">
      <div className="section-heading"><div><p className="section-kicker">WHAT IT DOES</p><h2 id="help-title">Room to read, and a way back.</h2></div></div>
      <ul className="landing-features">
        {features.map(feature => <li key={feature.title}>
          <img src={feature.image} width={1200} height={900} alt={feature.alt} />
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </li>)}
      </ul>
    </section>
    <section className="landing-close" aria-labelledby="close-title">
      <h2 id="close-title">You choose how the page looks.</h2>
      <p>Change the text size, line spacing, typeface, page colour, and light or dark appearance. These are options to try. They do not diagnose anything, and they do not rewrite the lecture.</p>
      <Link href="/auth" className="button button-primary">Start the demo</Link>
    </section>
  </>;
}
