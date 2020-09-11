import Bee from 'bee-queue';
import CancellationMail from '../app/jobs/CancellationMail';
import redisConfig from '../config/redis';

const jobs = [CancellationMail]; // aqui fica notos os jobs, que quero fazer asincrono (fila)

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        bee: new Bee(key, {
          redis: redisConfig, // armazena a fila
        }),
        handle, // armazena os jobs
      };
    });
  }

  add(queue, job) {
    // adiciona os jobs a fila
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    // processa a fila, executa os jobs que tem na fila
    jobs.forEach((job) => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();
