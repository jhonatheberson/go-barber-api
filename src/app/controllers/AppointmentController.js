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
