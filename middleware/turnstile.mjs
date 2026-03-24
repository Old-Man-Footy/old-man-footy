import { body } from 'express-validator';
import fetch from 'node-fetch';

/**
 * Cloudflare Turnstile Validation Middleware
 * 
 * Verifies the CAPTCHA response sent by the client.
 * Bypasses validation in the test environment to prevent breaking automated tests.
 */
export const validateTurnstile = body('cf-turnstile-response')
  .custom(async (token, { req }) => {
    // Bypass for testing
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    // Fail open if secret key is missing (logs warning)
    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.warn('⚠️ TURNSTILE_SECRET_KEY is not configured in environment variables. CAPTCHA validation skipped.');
      return true;
    }

    if (!token) {
      throw new Error('Please complete the CAPTCHA to verify you are human.');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
      formData.append('response', token);
      formData.append('remoteip', req.ip);

      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      const outcome = await result.json();
      
      if (!outcome.success) {
        console.error('Turnstile verification failed:', outcome['error-codes']);
        throw new Error('CAPTCHA verification failed. Please try again.');
      }
      
      return true;
    } catch (error) {
      if (error.message.includes('CAPTCHA verification failed')) {
        throw error;
      }
      console.error('Turnstile API connection error:', error);
      throw new Error('Verification service temporarily unavailable. Please try again later.');
    }
  });
