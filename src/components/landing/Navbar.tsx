"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Navbar() {
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    gsap.from(ref.current, { y: -30, opacity: 0, duration: 0.8, delay: 0.3, ease: "power3.out" });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={ref} className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav__inner">
        <span className="nav__logo">InCaseOf</span>
        <div className="nav__links">
          <a href="/lite" className="nav__cta">
            Get Started Free
          </a>
        </div>
      </div>
    </nav>
  );
}
