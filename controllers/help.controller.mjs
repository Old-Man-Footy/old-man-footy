/**
 * @file help.controller.mjs
 * @description Controller for contextual help popups API.
 */
import { validationResult, param } from 'express-validator';
import HelpContent from '../models/HelpContent.mjs';
import { marked } from 'marked';

/**
 * GET /api/help/:pageIdentifier
 * Returns help content for the given page identifier.
 */
export const getHelpContentValidators = [
  param('pageIdentifier')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid page identifier'),
];

export async function getHelpContent(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { status: 400, message: 'Invalid page identifier.' } });
    }
    const { pageIdentifier } = req.params;
    const help = await HelpContent.findOne({ where: { pageIdentifier } });
    if (!help) {
      return res.status(404).json({ error: { status: 404, message: 'Help content not found.' } });
    }
  // Render markdown to HTML using marked
  const htmlContent = marked.parse(help.content);
  return res.json({ title: help.title, content: htmlContent });
  } catch (err) {
    next(err);
  }
}
