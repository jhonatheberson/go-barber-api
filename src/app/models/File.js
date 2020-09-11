import Sequelize, { Model } from 'sequelize';

class File extends Model {
  // aqui declaro os campos da migração
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        path: Sequelize.STRING,
        url: {
          type: Sequelize.VIRTUAL, // não exixte no banco de ados so no codigo
          get() {
            return `${process.env.APP_URL}/files/${this.path}`; // para colocar variavel na string é outra aspas
          },
        },
      },
      {
        sequelize,
      }
    );

    return this;
  }
}

export default File; // exportando o models user
