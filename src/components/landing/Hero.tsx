"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const WORDS = ["Emergency.", "Accident.", "Medical Episode.", "Life."];

export default function Hero() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let typeTimeout: ReturnType<typeof setTimeout> | null = null;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(badgeRef.current, { y: 20, opacity: 0, duration: 0.6, delay: 0.6 })
      .from(h1Ref.current, { y: 30, opacity: 0, duration: 0.7 }, "-=0.3")
      .call(() => { if (!cancelled) cycleWords(0); }, [], "-=0.1")
      .from(subRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.3")
      .from(btnsRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.3")
      .from(trustRef.current, { y: 10, opacity: 0, duration: 0.5 }, "-=0.2");

    function cycleWords(wordIndex: number) {
      if (cancelled) return;
      const el = goldRef.current;
      if (!el) return;

      const word = WORDS[wordIndex];
      el.textContent = "";
      el.style.opacity = "1";
      el.classList.remove("cursor-blink");

      // Type in
      let i = 0;
      const node = el;
      function typeChar() {
        if (cancelled) return;
        if (i < word.length) {
          node.textContent = word.slice(0, i + 1);
          i++;
          typeTimeout = setTimeout(typeChar, 55);
        } else {
          node.classList.add("cursor-blink");
          typeTimeout = setTimeout(() => {
            if (cancelled) return;
            node.classList.remove("cursor-blink");
            deleteChars(word.length);
          }, 2000);
        }
      }

      function deleteChars(remaining: number) {
        if (cancelled) return;
        if (remaining > 0) {
          node.textContent = word.slice(0, remaining - 1);
          typeTimeout = setTimeout(() => deleteChars(remaining - 1), 30);
        } else {
          const nextIndex = (wordIndex + 1) % WORDS.length;
          typeTimeout = setTimeout(() => cycleWords(nextIndex), 300);
        }
      }

      typeChar();
    }

    return () => {
      cancelled = true;
      tl.kill();
      if (typeTimeout) clearTimeout(typeTimeout);
      [badgeRef, h1Ref, goldRef, subRef, btnsRef, trustRef].forEach((r) => {
        if (r.current) gsap.set(r.current, { clearProps: "all" });
      });
      if (goldRef.current) {
        goldRef.current.textContent = "";
        goldRef.current.style.opacity = "0";
        goldRef.current.classList.remove("cursor-blink");
      }
    };
  }, []);

  return (
    <section className="hero">
      <div className="hero__glow" />

      <div className="hero__content">
        <div ref={badgeRef} className="hero__badge">
          <span className="hero__badge-dot">●</span>
          <span className="hero__badge-text">
            Your emergency contact, sorted before you need it
          </span>
        </div>

        <h1 ref={h1Ref} className="hero__h1">
          InCaseOf
        </h1>
        <span ref={goldRef} className="hero__typed gold-text">
          Emergency.
        </span>

        <p ref={subRef} className="hero__sub">
          Fill in your emergency info once. Share it with the people who matter.
          So when someone needs to act on your behalf, they know exactly what to do.
        </p>

        <div ref={btnsRef} className="hero__btns">
          <a href="/lite" className="btn btn--gold">
            Get started, it&apos;s free
          </a>
          <a href="#story" className="btn btn--outline-light">
            Why I built this
          </a>
        </div>

        <div ref={trustRef} className="hero__trust">
          <span className="hero__trust-text">
            Free forever. Your data stays on your Google Drive. I never see it.
          </span>
        </div>
      </div>

      <div className="hero__scroll">
        <div className="hero__scroll-pill">
          <div className="hero__scroll-dot" />
        </div>
      </div>
    </section>
  );
}
