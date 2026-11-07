"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";

const modes = ["Read", "Listen", "Remember"] as const;
const features = [
  { icon: "focus" as const, number: "01", title: "Find your reading rhythm.", text: "One section. One sentence. A little more breathing room. Make a dense lecture feel approachable, without losing the original words.", className: "read" },
  { icon: "volume" as const, number: "02", title: "Let the words come to you.", text: "Switch to a natural OpenAI voice. Slow things down or pick up the pace, from 0.5× to 2×. Your place stays right here.", className: "listen" },
  { icon: "book" as const, number: "03", title: "Make understanding stick.", text: "Keep unfamiliar terms in your own words. Save a passage for later. Come back to a learning space that remembers where you left off.", className: "remember" },
];

export default function LandingPage() {
  const [mode, setMode] = useState<(typeof modes)[number]>("Read");
  const [motion, setMotion] = useState(true);
  return <div className="flow-landing" data-motion={motion ? "on" : "off"}>
    <section className="flow-hero" aria-labelledby="landing-title">
      <div className="flow-intro">
        <p className="flow-eyebrow"><span /> A LITTLE MORE CLARITY. A LOT MORE YOU.</p>
        <h1 id="landing-title">Find your<br /><span className="flow-title-word">learning flow.<svg viewBox="0 0 480 30" fill="none" aria-hidden="true"><path d="M5 22C112 3 285 1 472 13M40 28C198 11 339 13 431 20" /></svg></span></h1>
        <p className="flow-description">Big ideas deserve a little breathing room. Turn your lectures into a space to read, listen, and understand. At a pace that feels like you.</p>
        <div className="landing-actions"><Link href="/auth" className="button button-primary">Find your flow <Icon name="arrow" size={19} /></Link><a href="#how-it-helps" className="flow-text-link">Take a little look <span aria-hidden="true">↘</span></a></div>
        <p className="flow-footnote"><Icon name="check" size={16} /> Designed with dyslexic learners in mind. Open to everyone.</p>
      </div>
      <div className="flow-scene">
        <svg className="flow-ribbons" viewBox="0 0 600 600" fill="none" aria-hidden="true"><circle cx="310" cy="300" r="240" fill="var(--flow-soft)" /><path className="ribbon-main" d="M-30 340C100 490 140 60 320 100S600 250 460 390 190 600 630 520" /><path className="ribbon-fine" d="M-20 380C120 530 180 20 360 65S620 220 500 370 260 570 630 560" /><path className="ribbon-coral" d="M50 70C180 20 80 300 260 260S590 120 570 50" /><circle className="flow-orbit-dot" cx="485" cy="137" r="12" fill="#e6aa87" /><path d="M465 450v30m-15-15h30M115 130v22m-11-11h22" stroke="var(--green)" strokeWidth="2" /></svg>
        <div className="flow-note flow-note-top"><span className="flow-note-icon"><Icon name="file" size={20} /></span><div>All those lecture notes.<small>A clearer place to begin.</small></div><span className="flow-note-tick"><Icon name="check" size={17} /></span></div>
        <div className="flow-preview">
          <div className="flow-preview-top"><span><span className="flow-small-dot" /> YOUR READING SPACE</span><Icon name="sliders" size={18} /></div>
          <div className="flow-preview-tabs" role="group" aria-label="Explore the reading preview">{modes.map(item => <button type="button" key={item} aria-pressed={mode === item} onClick={() => setMode(item)}>{item}</button>)}</div>
          <div className="flow-preview-content" key={mode} aria-live="polite">
            <span className="flow-preview-label">{mode === "Read" ? "ONE IDEA AT A TIME" : mode === "Listen" ? "A DIFFERENT WAY IN" : "A LITTLE KNOWLEDGE, KEPT"}</span>
            <h2>{mode === "Read" ? "Small pieces. Big ideas." : mode === "Listen" ? "Take it at your tempo." : "In your own words."}</h2>
            {mode === "Read" ? <><p>Learning starts with a connection.</p><p className="flow-highlight">A new idea becomes clearer when we link it to something we already know.</p><div className="flow-placeholder-lines" aria-hidden="true"><i /><i /></div></> : mode === "Listen" ? <><div className="flow-wave" aria-hidden="true">{Array.from({length: 23}, (_, i) => <i key={i} style={{height: `${18 + ((i * 17) % 47)}px`, animationDelay: `${i * -0.11}s`}} />)}</div><p>A little slower. A little clearer.</p><div className="flow-speed-pills"><span>0.75×</span><strong>1×</strong><span>1.25×</span></div></> : <><div className="flow-definition"><span>Connection</span><p>A bridge between something new and something I understand.</p></div><p className="flow-saved"><Icon name="check" size={16} /> Saved to your personal glossary</p></>}
          </div>
          <div className="flow-preview-bottom"><span>Illustrative preview</span><span>01 <span className="flow-dash">━━━━</span> 04</span></div>
        </div>
        <div className="flow-note flow-note-bottom"><span className="flow-sun" aria-hidden="true">✳</span><div>Your pace is the right pace.<small>There’s no rush here.</small></div></div>
      </div>
    </section>
    <div className="flow-between"><span>LESS OVERWHELM</span><svg viewBox="0 0 560 45" aria-hidden="true"><path d="M1 22C110-30 170 75 280 22S450 0 550 22m-10-10 12 10-14 8" /></svg><span>MORE ROOM TO UNDERSTAND</span><button type="button" className="flow-motion-toggle" aria-pressed={!motion} onClick={() => setMotion(!motion)}>{motion ? "Pause motion" : "Resume motion"}</button></div>
    <section id="how-it-helps" className="flow-features" aria-labelledby="help-title">
      <div className="flow-section-heading"><p className="flow-eyebrow">A SPACE THAT WORKS WITH YOU</p><h2 id="help-title">Different ways in.<br /><span>The same big possibilities.</span></h2><p>You bring the curiosity. We’ll make a little room for it.</p></div>
      <div className="flow-feature-grid">{features.map(feature => <article className={`flow-feature flow-feature-${feature.className}`} key={feature.number}><div className="flow-feature-top"><Icon name={feature.icon} size={26} /><span>{feature.number}</span></div><div className={`flow-mini flow-mini-${feature.className}`} aria-hidden="true">{feature.className === "read" ? <><i /><i /><i /><i /></> : feature.className === "listen" ? Array.from({length:17},(_,i) => <i key={i} style={{height:`${16 + ((i * 19) % 65)}px`}} />) : <><span>new idea</span><svg viewBox="0 0 100 50"><path d="M5 30C40-10 60 65 95 20m-12 1 12-1-3 12" /></svg><span>got it.</span></>}</div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
    </section>
    <section className="flow-close" aria-labelledby="close-title"><svg viewBox="0 0 1000 300" aria-hidden="true"><path d="M-40 250C200-180 320 500 620 160S950-10 1080 80" /><path d="M-40 280C200-150 320 530 620 190S950 20 1080 110" /></svg><p className="flow-eyebrow">MAKE YOURSELF AT HOME</p><h2 id="close-title">A fresh page.<br />Your kind of pace.</h2><p>Roomier lines. Warmer colours. A voice to follow.<br />Make your learning space feel like yours.</p><Link href="/auth" className="button button-primary">Let’s get into it <Icon name="arrow" size={18} /></Link></section>
    <footer className="flow-footer"><span>LexiLearn <span aria-hidden="true">✳</span> A little more clarity.</span><span>Built for learning. Designed around you.</span></footer>
  </div>;
}
