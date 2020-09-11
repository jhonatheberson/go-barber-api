import Sequelize, { Model } from 'sequelize';
import bcrypt from 'bcryptjs';

class User extends Model {
  // aqui declaro os campos da migração
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.VIRTUAL, // VIRTUAL significa que ele não existe na base de dados, somente no codigo
        password_hash: Sequelize.STRING,
        provider: Sequelize.BOOLEAN,
      },
      {
        sequelize,
      }
    );
    // é executado automaticamente
    this.addHook('beforeSave', async (user) => {
      // Hook: trecho de codigo que são acionados com as condições
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 8);
      }
      return this;
    });
  }

  static associate(models) {
    // fazendo o realacionamento no tabela em todos os models
    this.belongsTo(models.File, {
      foreignKey: 'avatar_id',
    });
    // HasOne  = Users estaria na tabela de arquivo
    // HasMany =  id do users em varios registro em tabelas
  }

  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

export default User; // exportando o models user
