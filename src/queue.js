import 'dotenv/config';

import Queue from './lib/Queue';

Queue.processQueue(); // isso faz que o afila não afeta a plicação
// porque estara executando em node.js diferentes no pc
