"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Story() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Animate each story block as it scrolls into view
      gsap.utils.toArray<HTMLElement>(".story__block").forEach((block, i) => {
        gsap.from(block, {
          scrollTrigger: {
            trigger: block,
            start: "top 85%",
            end: "top 50%",
            toggleActions: "play none none none",
          },
          y: 40,
          opacity: 0,
          duration: 0.8,
          delay: i === 0 ? 0 : 0.1,
          ease: "power3.out",
        });
      });

      // Animate the divider
      const divider = el.querySelector(".story__divider");
      if (divider) {
        gsap.from(divider, {
          scrollTrigger: {
            trigger: divider,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.6,
          ease: "power2.out",
        });
      }

      // Animate CTA button
      const cta = el.querySelector(".story__cta");
      if (cta) {
        gsap.from(cta, {
          scrollTrigger: {
            trigger: cta,
            start: "top 90%",
            toggleActions: "play none none none",
          },
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
        });
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="story" className="story">
      <div className="story__container">
        <div className="story__block">
          <h2 className="story__heading">The Indemnity Form Problem</h2>
          <p className="story__text">
            I&apos;m in my 30s. Single. I spend a lot of time traveling. Diving in Indonesia, climbing in Patagonia, and the occasional skydiving trip.
          </p>
          <p className="story__text">
            Every time I start an adventure, I&apos;m handed the same thing: <strong>The Indemnity Form.</strong>
          </p>
          <p className="story__text">
            There&apos;s always that one field: <em>Emergency Contact.</em>
          </p>
        </div>

        <div className="story__block">
          <p className="story__text">
            I usually scribble down my mum&apos;s number and move on. But recently, it hit me. If something actually happened, she&apos;d have nothing. She has no idea where my insurance policy is kept. She doesn&apos;t have my passport number or my doctor&apos;s name.
          </p>
          <p className="story__text">
            In the worst moment of her life, she&apos;d be left panicking.
          </p>
        </div>

        <div className="story__divider" />

        <div className="story__block">
          <h2 className="story__heading">100+ Replies and 7,000 Views</h2>
          <p className="story__text">
            I asked Reddit if I was the only one feeling this way. I wasn&apos;t.
          </p>
          <p className="story__text">
            Across two threads, I got 100+ replies and 7,000+ views. Half the people were in the exact same boat. No system, nor plan, just a name on a form. The other half had binders and folders already sorted.
          </p>
          <p className="story__text">
            <strong>I built InCaseOf for people in the same boat as me.</strong>
          </p>
        </div>

        <div className="story__divider" />

        <div className="story__block">
          <h2 className="story__heading">How it Works</h2>
          <p className="story__text">
            InCaseOf isn&apos;t a complex platform. It&apos;s a dedicated layer that sits on top of your Google Drive.
          </p>
          <div className="story__features">
            <div className="story__feature">
              <span className="story__feature-label">The Vault</span>
              <p className="story__text">You fill in your essential info: medical, insurance, documents, contacts, and final wishes.</p>
            </div>
            <div className="story__feature">
              <span className="story__feature-label">The Storage</span>
              <p className="story__text">Everything is saved to a folder on your Drive, encrypted with a PIN.</p>
            </div>
            <div className="story__feature">
              <span className="story__feature-label">The Access</span>
              <p className="story__text">You share a single link with your contact. They get a clean, simple page with everything they need.</p>
            </div>
          </div>
        </div>

        <div className="story__divider" />

        <div className="story__block">
          <h2 className="story__heading">100% Private and Secure</h2>
          <p className="story__text">
            Your data stays yours. Your loved ones get access when it matters. That&apos;s it.
          </p>
          <div className="story__features">
            <div className="story__feature">
              <span className="story__feature-label">Zero Footprint</span>
              <p className="story__text">No app to download. No account for your contact to create. Just a link and a PIN.</p>
            </div>
            <div className="story__feature">
              <span className="story__feature-label">Total Privacy</span>
              <p className="story__text">I don&apos;t store your data on my servers. I can&apos;t see your documents even if I wanted to. Your Drive is the database; I just provide the interface.</p>
            </div>
            <div className="story__feature">
              <span className="story__feature-label">Completely Free</span>
              <p className="story__text">All you need is a Google account.</p>
            </div>
          </div>
          <p className="story__text story__text--accent">
            Use it. Tell me what&apos;s missing. I&apos;m building this based on what people actually need.
          </p>
        </div>

        <div className="story__cta">
          <a href="/lite" className="btn btn--gold">
            Set up your emergency kit
          </a>
        </div>
      </div>
    </section>
  );
}
