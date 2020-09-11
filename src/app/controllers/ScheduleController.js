import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';
import User from '../models/User';

class ScheduleController {
  async index(req, res) {
    const checkUserProvider = await User.findOne({
      where: {
        id: req.userId,
        provider: true,
      },
    });

    if (!checkUserProvider) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    const { date } = req.query;
    const parsedDate = parseISO(date);
    // 2020-08-30T00:00:00-03:00
    // 2020-08-30 00:00:00
    // 2020-08-30 23:59:59
    // iremos buscar todos os agendamentos entre essa datas, ou *between*
    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
      order: ['date'],
    });

    if (!appointments) {
      return res.status(401).json({ error: 'Not apoointments for as date' });
    }

    return res.json(appointments);
  }
}

export default new ScheduleController();
