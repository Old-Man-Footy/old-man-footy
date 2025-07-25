## **1. Project Stack**

  * **Language:** TypeScript / JavaScript (ES2020+)
  * **Framework:** Node.js with Express.js
  * **Module System:** ES Modules (ESM) over CommonJS. We use the modern `import`/`export` syntax as it is the official standard for JavaScript and the modern approach for Node.js. This enables features like top-level `await` for cleaner asynchronous code and allows for static analysis, which can improve optimisation. This supersedes the legacy CommonJS (`require`/`module.exports`) system.
  * **Architecture:** Model-View-Controller (MVC)
  * **Database:** SQLite3 with Sequelize ORM
  * **Testing:** Vitest