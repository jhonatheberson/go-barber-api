import * as Yup from 'yup'; // pacote de validação
import User from '../models/User';

class UserController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(), // o compo name é string e obrigatorio
      email: Yup.string().email().required(),
      password: Yup.string().required().min(6), // compo senha é string, obrigatorio, com minimo de caractere igual a 6
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation fails' });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } }); // verifica se ja existe esse email no banco

    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // const user = await User.create(req.body); // "await" é para realizar as coisas assincronas
    const { id, name, email, provider } = await User.create(req.body); // "await" é para realizar as coisas assincronas

    // return res.json(user);
    return res.json({
      id,
      name,
      email,
      provider,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      // validação condicional
      password: Yup.string()
        .min(6)
        .when(
          'oldPassword',
          (oldPassword, field) => (oldPassword ? field.required() : field) // se minha variavel oldPassword não for vazia, field (password) sera obrigatorio, senão retorna o fildd (password) como estava antes
        ),
      confirmPassword: Yup.string().when(
        'password',
        (password, field) =>
          password ? field.required().oneOf([Yup.ref('password')]) : field // se o compo password for obrigatorio e sejá igual a password senão retorn field
      ),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }
    const { email, oldPassword } = req.body;

    console.log(req.userId);

    const user = await User.findByPk(req.userId);

    // verifica se os email são diferentes
    if (email !== user.email) {
      const userExists = await User.findOne({
        where: { email },
      }); // verifica se ja existe esse email no banco

      if (userExists) {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      // so altera a senha se informou a senha antigo e bate com a senha cadastrada
      return res.status(401).json({ error: 'Password does not math' });
    }

    const { id, name, provider } = await user.update(req.body);

    return res.json({
      id,
      name,
      email,
      provider,
    });
  }
}

export default new UserController();
