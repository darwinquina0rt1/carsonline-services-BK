import { Router } from 'express';
import { validateUserDummy } from '../controllers/authController';
const router = Router();


// Registro inseguro 
router.post('/register-insecure', async (req, res) => {
const { email, name, password } = req.body as { email: string; name?: string; password: string };
if (!email || !password) return res.status(400).json({ ok: false, msg: 'email y password requeridos' });
try {
const user = await validateUserDummy(email.toLocaleLowerCase(), password) ;
} catch (e) {
return res.status(400).json({ ok: false, msg: 'No se pudo registrar (posible email duplicado)' });
}
});