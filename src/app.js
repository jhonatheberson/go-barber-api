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
