import { useEffect, useState } from "react";
import "./ContactAdmin.css";

export default function ContactAdmin() {
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowText(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const whatsappUrl =
    "https://wa.me/6285162651533?text=" +
    encodeURIComponent("Halo Admin Ilyon Academy, saya membutuhkan bantuan.");

  return (
    <a
      href={whatsappUrl}
      className={`contact-admin ${showText ? "with-text" : "icon-only"}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hubungi Admin Ilyon Academy melalui WhatsApp"
      title="Hubungi Admin Ilyon Academy"
    >
      {showText && (
        <span className="contact-admin-text">Butuh bantuan? Hubungi Admin</span>
      )}

      <span className="contact-admin-icon">
        <svg
          viewBox="0 0 24 24"
          width="27"
          height="27"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.34 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 19.05 4.9 9.85 9.85 0 0 0 12.04 2Zm.01 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.26-8.25a8.2 8.2 0 0 1 5.84 2.42 8.2 8.2 0 0 1 2.42 5.84c0 4.55-3.71 8.25-8.27 8.25Zm4.53-6.18c-.25-.13-1.47-.73-1.7-.81-.23-.09-.4-.13-.57.13-.17.25-.65.81-.8.98-.15.17-.3.19-.55.06-.25-.13-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.15-.25-.02-.39.11-.52.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.79 2.73 4.34 3.83.61.26 1.08.42 1.45.54.61.19 1.16.16 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.49-.29Z" />
        </svg>
      </span>
    </a>
  );
}
