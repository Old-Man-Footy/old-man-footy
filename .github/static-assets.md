## **7. Static Assets & Styling (/public)**

  * **Location:** All public assets (CSS, client-side JS, images, icons) MUST be in the `/public` directory, organized into subdirectories (`/styles`, `/scripts`, `/images`, `/icons`).
  * **Styling:** All CSS rules MUST be in external `.css` files within `/public/styles`. You MUST NOT use inline `style` attributes or CSS-in-JS. Styles MUST be authored to support both **light and dark modes**, preferably using CSS custom properties (variables) for colours that can be toggled with a `prefers-color-scheme` media query.
  * **Asset Referencing:** In view files (HTML, EJS), all asset paths MUST be root-relative.
      * **Correct:** `<link rel="stylesheet" href="/styles/main.css">`
      * **Incorrect:** `<link rel="stylesheet" href="/public/styles/main.css">`