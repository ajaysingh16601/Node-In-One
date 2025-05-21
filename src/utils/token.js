import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import Token from '../models/Token.js';

export const generateToken = async (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  const decodedRefresh = jwt.decode(refreshToken);
  const expiresAt = new Date(decodedRefresh.exp * 1000); // Convert to ms

  await Token.create({ user: userId, refreshToken, expiresAt });
  console.log('accessToken: ', accessToken);
  console.log('refreshToken: ', refreshToken);
  return { accessToken, refreshToken };
};

export const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
  return jwt.verify(token, secret);
};

