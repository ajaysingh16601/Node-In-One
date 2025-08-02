// token.js
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import TokenStore from '../models/TokenStore.js';

export const generateJwtToken = (payload, expiresIn = '1h', isRefresh = false) => {
  const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateToken = async (userId) => {
  const accessToken = generateJwtToken({ userId }, config.jwt.expiresIn);
  const refreshToken = generateJwtToken({ userId }, config.jwt.refreshExpiresIn, true);

  const decodedRefresh = jwt.decode(refreshToken);

  await TokenStore.create({
    user: userId,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(decodedRefresh.exp * 1000),
  });

  return { accessToken, refreshToken };
};

export const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
  return jwt.verify(token, secret);
};