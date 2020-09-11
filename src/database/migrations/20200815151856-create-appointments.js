module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('appointments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false, // não permite nulo
        autoIncrement: true, // autoincrementa o valor do interger
        primaryKey: true, // é chave primaria
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' }, // adiciona chave entrangeira no tabela users, referenciando o tabela "files", coluna "id"
        onUpdate: 'CASCADE', // SE FOR ATUALIZADO, TODOS OS AGENDAMENTOS TAMBEM SÃO
        onDelete: 'SET NULL', // SE O USER FOR DELETADO, O AGENDAMENTO AINDA FICA
        allowNull: true,
      },
      provider_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' }, // adiciona chave entrangeira no tabela users, referenciando o tabela "files", coluna "id"
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      canceled_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('appointments');
  },
};
