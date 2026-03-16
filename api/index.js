/**
 * api/index.js — Vercel Serverless Entry Point
 * Routes all /api/* requests to the Express app.
 */
const app = require('../backend/server');
module.exports = app;
