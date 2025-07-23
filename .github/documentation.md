## **9. Documentation**

  * **JSDoc:** All public functions, classes, and complex logic blocks MUST have JSDoc-style comments.
  * **README.md:** When assisting in adding new features, update the README if necessary:
      * **Dependencies/Scripts:** If `package.json` changes, update the "Installation" section.
      * **Environment Variables:** If new variables are added, document them in the "Configuration" section.
      * **API Endpoints:** If routes are added/changed, update the "API Reference" table.
  * **Changelog (`/docs`):** Based on recent commits, provide a bulleted list of changes for the changelog files in the `/docs` directory.

### **9.1. Test & Development Plans**

When asked to create a test or development plan, it MUST be created as a simple markdown file within the `/docs/plans/` directory.

  * **Format:** Use markdown checklists.
  * **Content:** The plan should be a list of tasks to be completed. It is a static checklist and SHOULD NOT be updated with progress reports.
  * **Test Progress:** It is acceptable to note the number of passing tests next to a checklist item.

#### **Example Plan (`/docs/plans/feature-x-test-plan.md`):**

```markdown
# Test Plan: Feature X

- [ ] Model: `featureX.model.js` tests (5/7)
- [ ] Controller: `featureX.controller.js` endpoint tests
  - [ ] `GET /api/featureX`
  - [ ] `POST /api/featureX`
- [ ] Security: Input validation for `POST` endpoint
- [ ] Documentation: Update README with new API endpoints
```