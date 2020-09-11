import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import authConfig from '../../config/auth';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  // const token = authHeader.split('')
  // const [bearer, token] = authHeader.split('') // destituração
  const [, token] = authHeader.split(' '); // sera devido onde tem espaço, descart a primeira
  // console.log(authHeader);
  // console.log(token);
  try {
    // aqui posso usar 'jwt.verify' sem url callback com promisify
    const decoded = await promisify(jwt.verify)(token, authConfig.secret);

    // console.log(decoded);
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'token invalid' });
  }
};
