"use client";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/privacy" },
  { label: "Support", href: "mailto:hello@tryincaseof.com" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer__copy">
        © 2026 InCaseOf. All rights reserved.
      </span>
      <div className="footer__links">
        {footerLinks.map((link) => (
          <a key={link.label} href={link.href} className="footer__link">
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
