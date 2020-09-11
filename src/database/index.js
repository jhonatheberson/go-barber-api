import Sequelize from 'sequelize';
import mongoose from 'mongoose';

import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';

import databaseConfig from '../config/database';

const models = [User, File, Appointment];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    models
      .map((model) => model.init(this.connection))
      .map(
        (model) =>
          Appointment.associate && Appointment.associate(this.connection.models) // iso faz que inclua o relacionamento no banco de a dodos
      )
      .map((model) => User.associate && User.associate(this.connection.models));
    // so executa se a metodo existir "User.associate && User.associate"
  }

  mongo() {
    this.mongoConnection = mongoose.connect(process.env.MONG_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: true,
    });
  }
}

export default new Database();
