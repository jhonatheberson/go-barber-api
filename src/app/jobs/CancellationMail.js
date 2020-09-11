import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class CancellaationMail {
  get key() {
    // colocando o get na frente
    return 'CancellationMail';
  }

  async handle({ data }) {
    const { provider, user, appointment } = data;
    // a função handle que vai executar o job que queremos executar

    console.log('A fila executou!');

    Mail.sendMail({
      to: `${provider.name} <${provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: provider.name,
        user: user.name,
        date: format(
          parseISO(appointment.date),
          "'dia' dd 'de' MMM', às' H:mm'h'",
          {
            locale: pt,
          }
        ), // para dia 30 de agosto às 10:00h
      },
    });
  }
}
export default new CancellaationMail();

// import CancellationMail from '..'fail
// CancellationMail.key
