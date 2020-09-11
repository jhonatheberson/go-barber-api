import User from '../models/User';
import File from '../models/File';

class ProviderController {
  async index(req, res) {
    // ordem do req, res importa na function
    const providers = await User.findAll({
      where: { provider: true },
      attributes: ['id', 'name', 'email', 'avatar_id'], // restrigindo o que vai ser retornado
      include: [
        {
          model: File,
          attributes: ['name', 'path', 'url'],
        },
      ], // incluindo informação da relação que tem o users
    });

    return res.json(providers);
  }
}

export default new ProviderController();
