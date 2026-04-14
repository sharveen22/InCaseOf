"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    q: "Is this really free?",
    a: "Yes. Your data lives on your own Google Drive. I don't run servers or store anything, so there's nothing to charge you for.",
  },
  {
    q: "Can you see my data?",
    a: "No. Everything is encrypted with a PIN that only you and your emergency contact know. The files on your Drive are gibberish without that PIN. I have zero access.",
  },
  {
    q: "What happens if I forget my PIN?",
    a: "You'd need to start fresh. Set a new PIN and re-enter your info. That's the trade-off of real encryption. I can't recover it for you because I never have it.",
  },
  {
    q: "How does my emergency contact access my info?",
    a: "You share a link and give them your 6-digit PIN (separately, in person, over a call, etc). They open the link, enter the PIN, and everything decrypts right in their browser.",
  },
  {
    q: "What if I don't have a Google account?",
    a: "You'll need one for now. It's how I store your data without building a database. A free Gmail account works fine.",
  },
  {
    q: "Will you add more features?",
    a: "That depends on you. I built what I thought was necessary. Tell me what's missing and I'll prioritise based on what people actually need.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const answersRef = useRef<(HTMLDivElement | null)[]>([]);

  const toggle = useCallback(
    (i: number) => {
      if (open === i) {
        // Close current
        const el = answersRef.current[i];
        if (el) {
          gsap.to(el, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: "power2.inOut",
            onComplete: () => setOpen(null),
          });
        } else {
          setOpen(null);
        }
      } else {
        // Close previous
        if (open !== null) {
          const prev = answersRef.current[open];
          if (prev) {
            gsap.to(prev, { height: 0, opacity: 0, duration: 0.25, ease: "power2.in" });
          }
        }
        setOpen(i);
      }
    },
    [open]
  );

  // Animate answer open
  useEffect(() => {
    if (open === null) return;
    const el = answersRef.current[open];
    if (!el) return;

    gsap.set(el, { height: "auto", opacity: 1 });
    const h = el.offsetHeight;
    gsap.fromTo(el, { height: 0, opacity: 0 }, { height: h, opacity: 1, duration: 0.35, ease: "power2.out" });
  }, [open]);

  // ScrollTrigger entrance
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(".faq__heading", {
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>(".faq__item").forEach((item, i) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: "top 90%",
            toggleActions: "play none none none",
          },
          y: 20,
          opacity: 0,
          duration: 0.5,
          delay: i * 0.06,
          ease: "power3.out",
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="faq" className="faq">
      <div className="faq__container">
        <h2 className="faq__heading">Questions</h2>
        <div className="faq__list">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`faq__item ${open === i ? "faq__item--open" : ""}`}
            >
              <button
                className="faq__question"
                onClick={() => toggle(i)}
              >
                <span>{faq.q}</span>
                <span className="faq__icon">+</span>
              </button>
              <div
                ref={(el) => { answersRef.current[i] = el; }}
                className="faq__answer"
                style={{ height: 0, opacity: 0, overflow: "hidden" }}
              >
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
