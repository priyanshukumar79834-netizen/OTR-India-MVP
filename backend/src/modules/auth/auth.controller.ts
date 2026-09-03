import { Request, Response } from 'express';
import { registerSchema, loginSchema } from './auth.validation';
import { registerUser, loginUser } from './auth.service';
import { created, ok } from '../../utils/apiResponse';

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await registerUser(input);
  return created(res, result);
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input);
  return ok(res, result);
}
