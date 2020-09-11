# modulo05

## Listando horarios disponíveis

a primeira coisa é criar uma rota para isso:

```
import { Router } from 'express';
import multer from 'multer'; // importando o multer
import multerConfig from './config/multer'; // importando configuração do multer

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import AppointmentController from './app/controllers/AppointmentController';
import ScheduleController from './app/controllers/ScheduleController';
import NotificationController from './app/controllers/NotificationController';
import AvailableController from './app/controllers/AvailableController';

import authMiddleware from './app/middleware/auth';

const routes = new Router();
const upload = multer(multerConfig);

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

// esse middleware so é executado apos ele ser declarado.
// logo as rotas posts acima não é executado esse middleware
routes.use(authMiddleware); // middleware global de auth
routes.put('/users', UserController.update);

routes.get('/providers', ProviderController.index);
routes.get('/providers/:providerId/available', AvailableController.index);

routes.post('/appointments', AppointmentController.store);
routes.get('/appointments', AppointmentController.index);
routes.delete('/appointments/:id', AppointmentController.delete);

routes.get('/schedule', ScheduleController.index);

routes.get('/notifications', NotificationController.index);
routes.put('/notifications/:id', NotificationController.update);

routes.post('/files', upload.single('file'), FileController.store);

module.exports = routes;


```

**routes.get('/providers/:providerId/available', AvailableController.index);**

e

importa o Controller

**import AvailableController from './app/controllers/AvailableController';**

agora iremos criar o controller **AvailableController.js**

com o seguinte conteudo:

```
import {
 startOfDay,
 endOfDay,
 setHours,
 setMinutes,
 setSeconds,
 format,
 isAfter,
} from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
 async index(req, res) {
   const { date } = req.query;

   if (!date) {
     return res.status(400).json({ error: 'Invalid date' });
   }

   const searchDate = Number(date);

   const appointments = await Appointment.findAll({
     where: {
       provider_id: req.params.providerId,
       canceled_at: null,
       date: {
         [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
       },
     },
   });

   const schedule = [
     '08:00', // 2020-06-23 08:00:00
     '09:00', // 2020-06-23 09:00:00
     '10:00',
     '11:00',
     '12:00',
     '13:00',
     '14:00',
     '15:00',
     '16:00',
     '17:00',
     '18:00',
     '19:00',
   ];

   const available = schedule.map((time) => {
     const [hour, minute] = time.split(':');
     const value = setSeconds(
       setMinutes(setHours(searchDate, hour), minute),
       0
     );

     return {
       time,
       value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
       available:
         isAfter(value, new Date()) &&
         !appointments.find((a) => format(a.date, 'HH:mm') == time),
     };
   });
   return res.json(available);
 }
}

export default new AvailableController();

```

# campos virtuais de agendamentos

a primeira cousa é ir no arquivo **models/Appointment.js**

e vamos criar os compo virtual (campo que so existe no codigo)

criei dois acmpos um para verificar se posso cancelar o agendamento e outro para verificar se a hora ja passou do agendamento.

essa aquivo ficou assim:

```
import Sequelize, { Model } from 'sequelize';
import { isBefore, subHours } from 'date-fns';

class Appointment extends Model {
  // aqui declaro os campos da migração
  static init(sequelize) {
    super.init(
      {
        date: Sequelize.DATE,
        canceled_at: Sequelize.DATE,
        past: {
          type: Sequelize.VIRTUAL,
          get() {
            return isBefore(this.date, new Date()); // verifica se data do agendamento é depois da data atual, logo pode ser realizado o serviço
          },
        },
        cancellable: {
          type: Sequelize.VIRTUAL,
          get() {
            return isBefore(new Date(), subHours(this.date, 2)); // verifica se o agendamento tem 2h da hora atual
          },
        },
      },
      {
        sequelize,
      }
    );

    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id' });
    this.belongsTo(models.User, { foreignKey: 'provider_id' });
  }
}

export default Appointment; // exportando o models user

```

e para mostar o valores virtuais temos que incluir no controller **AppointmentController.js**

```
import * as Yup from 'yup'; // library de validação
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query; // pegando a paginação
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'], // ordenar a busca por data
      attributes: ['id', 'date', 'past', 'cancellable'],
      limit: 20, // limitando quando iŕa mostrar por consulta
      offset: (page - 1) * 20, // mostrando de onde voi começar
      include: [
        {
          model: User,
          attributes: ['id', 'name'], // mostrar somente id e nome do User
          include: [
            {
              model: File,
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const scheme = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await scheme.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    /** Check if provider_id is a provider  */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res.status(401).json({
        error: 'You can only create  appointments with providers',
      });
    }
    /**
     * check user is provider
     */

    if (provider_id === req.userId) {
      return res.status(401).json({ error: 'you not appointment for you' });
    }
    /**
     * Check for past date
     */
    const hourStart = startOfHour(parseISO(date)); // se pega a hora, zera minutos e segundos

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitions' });
    }
    /**
     * check date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({
        error: 'Appointment date is not available',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id: req.body.provider_id,
      date: hourStart, // o minuto e segundo vai ser zero zero
    });

    /**
     * Notify appointment provider
     */
    const user = await User.findByPk(req.userId);

    const formattedDate = format(hourStart, "'dia' dd 'de' MMM', às' H:mm'h'", {
      locale: pt,
    }); // para dia 30 de agosto às 10:00h

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`, // `Novo agendamento de jhonat heberson para dia 30 de abril às 19:00h`
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id);
    const user = await User.findByPk(req.userId);
    const provider = await User.findByPk(appointment.provider_id);

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You dont't have permission to concel this appointment.fail",
      });
    }

    // 16.20
    // datewithsub: 14:30h
    // now 16.30

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointment 2 hours in advance',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      provider,
      user,
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();


```

incluindo **past** e **cancellable**

# tratamento de exceções

iremos usar um biblioteca de tratamento e monitoramento de aplicação

- bugsnag - https://www.bugsnag.com/
- sentry - https://sentry.io/onboarding/jhonat/get-started/
- express-async-errors
- youch

iremos usar o **sentry** para instalar:

```
yarn add @sentry/node
```

porém para o sentry funcionar corretamente precisamos instalar uma biblioteca que possa pegar os erros dentro do **async** do node que por padrão ele não pega:

vamos instalar :

```
yarn add express-async-errors
```

e vamos instalar o biblioteca **youch**
ele faz uma trataiva de erro, com visualização melhor para o dev

```
yarn add youch
```

para usar isso primeiro iremos criar uma arquivo de configuração do **sentry** em **/src/config/sentry**
colocando o **dsn** do sentry:

```
export default {
  dsn:
    'https://d0cde146d7694634be08863c3c6d1948@o440114.ingest.sentry.io/5408130',
};

```

e agora iremos criar uma metodo para retornar os problemas e sentry monito a api:

iremos fazer isso no primeiro arquivo que o **node.js** executa, em nosso caso é **/src/app.js** com o seguinte conteudo:

```
import express from 'express'; // sucrase faz isso
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';

import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    // esse metodo é contrutor é chamado
    // automaticamente ao chamar a classe App
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler()); // antes de tudo
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads')) // meodo static consegue abrir imagens
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      const errors = await new Youch(err, req).toJSON();

      return res.status(500).json(errors);
    });
  }
}

// module.exports = new App().server; //esportanto o class App, o server
export default new App().server; // sucrase faz isso

```

# variáveis ambiente

- dotenv

A primeira coisa é criar um arquivo **./.env** e colocar todas as variaveis de enbientes nela no seguinte formato e o arquivo também ficou assim:

```
APP_URL=htpp://localhost:3333
NODE_ENV=development

# Auth

APP_SECRET=bootcampgobarbernode

# Database

DB_HOST=localhost
DB_USER=postgres
DB_PASS=1298
DB_NAME=gobarber

# Mongo

MONG_URL=mongodb://localhost:27017/gobarber

# Redis

REDIS_HOST=127.0.0.1
REDIS_POST=6379

# Mail

MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=ea32dc7705b10b
MAIL_PASS=3f3ac8644a45a6

# Sentry

SENTRY_DSN=https://d0cde146d7694634be08863c3c6d1948@o440114.ingest.sentry.io/5408130 # SO FAZ SENTIDO EM PROD

```

e vamos instalar um pacote **dotenv**

```
yarn add dotenv
```

agora vamos importar o **dotenv** nos arquivo que precisamos, na primeira importação (_ondem é importante_) **app.js** o **queue.js** e **/src/config/database.js**

os arquivos ficou da seguinte forma respectivamente:

```
import 'dotenv/config';

import express from 'express'; // sucrase faz isso
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';

import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    // esse metodo é contrutor é chamado
    // automaticamente ao chamar a classe App
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler()); // antes de tudo
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads')) // meodo static consegue abrir imagens
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      const errors = await new Youch(err, req).toJSON();

      return res.status(500).json(errors);
    });
  }
}

// module.exports = new App().server; //esportanto o class App, o server
export default new App().server; // sucrase faz isso

```

```
import 'dotenv/config';

import Queue from './lib/Queue';

Queue.processQueue(); // isso faz que o afila não afeta a plicação
// porque estara executando em node.js diferentes no pc

```

```
require('dotenv/config');

module.exports = {
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: '1298',
  database: 'gobarber',
  define: {
    timestamps: true,
    underscored: true,
    underscoredALL: true,
  },
};

```

e agora iremos trocar as variaveis de anbientes nos arquivos que usamos:

exemplo:

```
get() {
    return `http://localhost:3333/files/${this.path}`;
      },
```

para :

```
get() {
    return `${process.env.APP_URL}/files/${this.path}`;
      },
```

o primeiro que mudamos foi no arquivo **/src/app/models/File.js** :

```
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

```

o segundo foi no arquivo **/src/app.js** para que possamos
verificar se esta em anbiente de desenvolvimento e não mostrar os erros internos do servidor:

```
import 'dotenv/config';

import express from 'express'; // sucrase faz isso
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';

import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    // esse metodo é contrutor é chamado
    // automaticamente ao chamar a classe App
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler()); // antes de tudo
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads')) // meodo static consegue abrir imagens
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();

        return res.status(500).json(errors);
      }
      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

// module.exports = new App().server; //esportanto o class App, o server
export default new App().server; // sucrase faz isso

```

apenas alteramos a perte final do arquivo **exceptionHandler()**

e alteramos todos as outras variaveis.

também criamos um arquivo **.env.example** que é copia do **.env** sem os dados sensíveis
