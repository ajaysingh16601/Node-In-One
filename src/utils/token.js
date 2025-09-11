// token.js
import jwt from 'jsonwebtoken';
import TokenStore from '../models/TokenStore.js';
import { getJWTConfig } from '../config/env.js';

export const generateJwtToken = async (payload, expiresIn = '1h', isRefresh = false) => {
      const jwtConfig = await getJWTConfig();

  const secret = isRefresh ? jwtConfig.refreshSecret : jwtConfig.secret;
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateToken = async (userId) => {
  const jwtConfig = await getJWTConfig();
  const accessToken = await generateJwtToken({ userId }, jwtConfig.expiresIn);
  const refreshToken = await generateJwtToken({ userId }, jwtConfig.refreshExpiresIn, true);

  const decodedRefresh = jwt.decode(refreshToken);

  await TokenStore.create({
    user: userId,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(decodedRefresh.exp * 1000),
  });

  return { accessToken, refreshToken };
};

export const verifyToken = async (token, isRefresh = false) => {
  const jwtConfig = await getJWTConfig();
  const secret = isRefresh ? jwtConfig.refreshSecret : jwtConfig.secret;
  return jwt.verify(token, secret);
};