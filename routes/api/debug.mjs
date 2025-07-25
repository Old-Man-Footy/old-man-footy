import express from 'express';
import { User } from '../../models/index.mjs';
import bcrypt from 'bcrypt';
import { applyApiSecurity } from '../../middleware/security.mjs';

const router = express.Router();

// Apply centralized API security to all routes
router.use(applyApiSecurity);

/**
 * DEBUG ENDPOINT: Check user data and password verification
 * This endpoint will be removed after debugging is complete
 */
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ 
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      return res.json({
        error: 'User not found',
        email: email
      });
    }
    
    // Test password verification with known passwords
    let passwordTests = {};
    
    if (email === 'admin@test.com') {
      passwordTests.admin123 = await user.checkPassword('admin123');
      passwordTests.admin123_direct = await bcrypt.compare('admin123', user.passwordHash);
    }
    
    if (email === 'delegate@test.com') {
      passwordTests.delegate123 = await user.checkPassword('delegate123');
      passwordTests.delegate123_direct = await bcrypt.compare('delegate123', user.passwordHash);
    }
    
    return res.json({
      userFound: true,
      email: user.email,
      isActive: user.isActive,
      passwordHashLength: user.passwordHash?.length,
      passwordHashPrefix: user.passwordHash?.substring(0, 10),
      isBcryptHash: user.passwordHash?.startsWith('$2'),
      passwordTests,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
  } catch (error) {
    return res.json({
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * DEBUG ENDPOINT: Test Passport authentication directly
 */
router.post('/test-auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ 
      where: { 
        email: email.toLowerCase(),
        isActive: true 
      }
    });
    
    if (!user) {
      return res.json({
        success: false,
        error: 'User not found or inactive',
        email: email
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    return res.json({
      success: isValidPassword,
      userFound: true,
      email: user.email,
      isActive: user.isActive,
      passwordVerified: isValidPassword,
      passwordHashInfo: {
        length: user.passwordHash?.length,
        prefix: user.passwordHash?.substring(0, 10),
        isBcrypt: user.passwordHash?.startsWith('$2')
      }
    });
    
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;