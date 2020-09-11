import jwt from 'jsonwebtoken';
import * as Yup from 'yup'; // pacote de validação

import User from '../models/User';
import authConfig from '../../config/auth';

// isso será usado para verificar se o user esta logado
class SesssionController {
  async store(req, res) {
    const schema = Yup.object().shape({
      email: Yup.string().email().required(),
      password: Yup.string().required(), // compo senha é string, obrigatorio
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'User not found ' });
    }

    if (!(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Password does not match' });
    }
    const { id, name } = user;

    return res.json({
      user: {
        id,
        name,
        email,
      },
      // id, MD5 cript, prazo de expiração
      token: jwt.sign({ id }, authConfig.secret, {
        expiresIn: authConfig.expires,
      }),
    });
  }
}

export default new SesssionController();
