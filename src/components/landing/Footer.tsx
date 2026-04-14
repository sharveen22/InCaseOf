"use client";

const footerLinks = ["Privacy", "Terms", "Support"];

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer__copy">
        © 2026 InCaseOf. All rights reserved.
      </span>
      <div className="footer__links">
        {footerLinks.map((link) => (
          <a key={link} href="#" className="footer__link">
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
}
