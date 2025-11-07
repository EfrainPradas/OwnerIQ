const ENABLE_DEMO_MODE = (process.env.ENABLE_DEMO_MODE || 'false').toLowerCase() === 'true';

const authenticateToken = (supabase) => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.error('No authorization token provided');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    if (token === 'dummy-token') {
      if (!ENABLE_DEMO_MODE) {
        console.error('Demo mode is disabled');
        return res.status(403).json({ error: 'Demo mode is disabled' });
      }
      console.log('Using dummy token (demo mode)');
      req.user = { id: 'dummy-id' };
      return next();
    }
    
    console.log('Validating Supabase token...');

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('Supabase auth error:', error.message);
        return res.status(403).json({ error: 'Authentication failed', details: error.message });
      }
      if (!user) {
        console.error('No user found for token');
        return res.status(403).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch (err) {
      console.error('Auth middleware exception:', err);
      res.status(403).json({ error: 'Authentication error', details: err.message });
    }
  };
};

module.exports = { authenticateToken };