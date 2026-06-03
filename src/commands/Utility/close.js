import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Sluit een ModMail ticket'),

  async execute(interaction) {

    if (!interaction.channel.topic) {
      return interaction.reply({
        content: 'Dit is geen ticket.',
        ephemeral: true
      });
    }

    const user = await interaction.client.users.fetch(
      interaction.channel.topic
    );

    await user.send(
      '🔒 Je ticket is gesloten.'
    ).catch(() => {});

    await interaction.reply(
      '✅ Ticket gesloten.'
    );

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
};
