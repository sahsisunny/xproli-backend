
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

export const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: '30d' }
  );
};


export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};
