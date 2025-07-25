## **6. Database & Migrations**

  * **ORM:** Use Sequelize with SQLite.
  * **Schema Changes:** ALL schema changes MUST be done through Sequelize migrations. Do not alter the database schema manually.
      * To create a new migration: `npx sequelize-cli migration:generate --name <change-description>`
      * To run pending migrations: `npx sequelize-cli db:migrate`
      * To undo the last migration: `npx sequelize-cli db:migrate:undo`