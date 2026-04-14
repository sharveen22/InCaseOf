"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (innerRef.current) {
        gsap.from(innerRef.current.children, {
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
          y: 40, opacity: 0, duration: 0.7, stagger: 0.15, ease: "power3.out",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="cta" ref={sectionRef} className="section section--cta">
      <div className="cta__glow" />
      <div ref={innerRef} className="cta__inner">
        <h2 className="cta__h2">InCaseOf anything.</h2>
        <p className="cta__sub">
          Your emergency info, organised and shareable — so the people around you
          know exactly what to do.
        </p>
        <a href="/lite" className="btn btn--gold">
          Get started — it&apos;s free
        </a>
        <p className="cta__fine">
          Free forever · No credit card · Your data stays on your Google Drive
        </p>
      </div>
    </section>
  );
}
