// token.js
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import TokenStore from '../models/TokenStore.js';

export const generateToken = async (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  const decodedRefresh = jwt.decode(refreshToken);

  await TokenStore.create({
    user: userId,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(decodedRefresh.exp * 1000),
  });

  console.log('TokenStore: ', {
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