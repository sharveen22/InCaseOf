"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: "01",
    title: "Build your profile",
    desc: "Add your medical info, emergency contacts, allergies, and any action plans you want us to follow.",
  },
  {
    num: "02",
    title: "Get your number",
    desc: "We assign you a dedicated phone number and a PIN-protected emergency card to carry with you.",
  },
  {
    num: "03",
    title: "We handle it",
    desc: "When someone calls about you, a real person answers, verifies with your PIN, and follows your action plan.",
  },
];

export default function HowItWorks() {
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
          y: 50, opacity: 0, duration: 0.8, stagger: 0.18, ease: "power3.out",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" className="section section--cream">
      <div className="section__wrap">
        <div ref={headRef} className="section__head">
          <div className="section__pill">
            <span className="section__pill-text">How it works</span>
          </div>
          <h2 className="section__title section__title--light">
            Three steps to peace of mind
          </h2>
          <p className="section__subtitle section__subtitle--light">
            Set up once. We handle the rest — forever.
          </p>
        </div>

        <div ref={gridRef} className="card-grid">
          {steps.map((s) => (
            <div key={s.num} className="card">
              <div className="step__num">{s.num}</div>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
