import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'access'
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'cloudstorage-api',
      audience: 'cloudstorage-app'
    }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'cloudstorage-api',
      audience: 'cloudstorage-app'
    }
  );
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'cloudstorage-api',
      audience: 'cloudstorage-app'
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'cloudstorage-api',
      audience: 'cloudstorage-app'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const generateTokenPair = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  };
};