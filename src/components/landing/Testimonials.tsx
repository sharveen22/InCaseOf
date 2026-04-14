"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote:
      "I had a motorbike accident in Bali. InCase handled everything — called my sister, shared my blood type with the hospital, even contacted my insurance. They saved me hours of panic.",
    name: "Jake Russel",
    role: "Digital nomad, Bali",
    initials: "JR",
    accent: true,
  },
  {
    quote:
      "As a solo female traveller, this gives me so much peace of mind. My family doesn't worry as much because they know if something happens, InCase is there.",
    name: "Sophie Larsen",
    role: "Expat, Thailand",
    initials: "SL",
    accent: false,
  },
  {
    quote:
      "My dad lives alone after mom passed. I signed him up so if anything happens, someone trained is always reachable. The action plan feature is genius.",
    name: "Marcus Rivera",
    role: "Son & caregiver, Austin",
    initials: "MR",
    accent: false,
  },
];

export default function Testimonials() {
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
          y: 50, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power3.out",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="section section--cream">
      <div className="section__wrap">
        <div ref={headRef} className="section__head">
          <h2 className="section__title section__title--light">
            Trusted by people who live boldly
          </h2>
          <p className="section__subtitle section__subtitle--light">
            Solo travellers, digital nomads, expats, and anyone who values peace
            of mind.
          </p>
        </div>

        <div ref={gridRef} className="card-grid">
          {testimonials.map((t) => (
            <div key={t.name} className={`card ${t.accent ? "card--accent" : ""}`}>
              <div className="testi__stars">★★★★★</div>
              <p className="testi__quote">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="testi__author">
                <div className={`testi__avatar ${t.accent ? "testi__avatar--accent" : "testi__avatar--muted"}`}>
                  {t.initials}
                </div>
                <div>
                  <div className="testi__name">{t.name}</div>
                  <div className="testi__role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
