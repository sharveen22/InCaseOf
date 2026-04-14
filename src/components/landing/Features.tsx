"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    emoji: "📞",
    title: "24/7 human operator",
    desc: "A trained person answers every call. No bots, no voicemail, no hold music.",
  },
  {
    emoji: "🛡️",
    title: "Bank-grade encryption",
    desc: "AES-256 encryption on all medical data. SOC 2 compliant infrastructure.",
  },
  {
    emoji: "📋",
    title: "Custom action plans",
    desc: "Tell us exactly what to do — who to call, what to share, and in what order.",
  },
];

export default function Features() {
  const headRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headRef.current) {
        gsap.from(headRef.current.children, {
          scrollTrigger: { trigger: headRef.current, start: "top 82%" },
          y: 35, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
        });
      }
      if (gridRef.current) {
        gsap.from(gridRef.current.children, {
          scrollTrigger: { trigger: gridRef.current, start: "top 78%" },
          y: 50, opacity: 0, scale: 0.97, duration: 0.8, stagger: 0.15, ease: "power3.out",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="security" className="section section--dark">
      <div className="section__wrap">
        <div ref={headRef} className="section__head">
          <div className="section__pill">
            <span className="section__pill-text">Why InCase</span>
          </div>
          <h2 className="section__title section__title--dark">
            Not just a number.
            <br />
            <span className="gold-text">A person who knows your plan.</span>
          </h2>
          <p className="section__subtitle section__subtitle--dark">
            Most emergency contacts are unreachable, unprepared, or unaware.
            InCase changes that.
          </p>
        </div>

        <div ref={gridRef} className="card-grid">
          {features.map((f) => (
            <div key={f.title} className="glass-card">
              <div className="feat__icon">{f.emoji}</div>
              <h3 className="feat__title">{f.title}</h3>
              <p className="feat__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
