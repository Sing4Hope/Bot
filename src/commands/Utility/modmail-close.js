import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const MODMAIL_CATEGORY_ID = process.env.MODMAIL_CATEGORY_ID || '1498650880604639272';
const MODMAIL_STAFF_ROLE_ID = process.env.MODMAIL_STAFF_ROLE_ID || '1498650876473249818';

export default {
  data: new SlashCommandBuilder()
    .setName('modmail-close')
    .setDescription('Sluit het huidige ModMail ticket')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reden voor het sluiten van het ticket')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.channel;

    if (
      channel?.parentId !== MODMAIL_CATEGORY_ID ||
      !channel?.topic
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Geen ModMail ticket')
            .setDescription('Gebruik dit command alleen in een ModMail ticketkanaal.')
            .setColor(0xed4245)
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const canClose = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)
      || interaction.member?.roles?.cache?.has(MODMAIL_STAFF_ROLE_ID);

    if (!canClose) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Geen toestemming')
            .setDescription('Alleen staff kan een ModMail ticket sluiten.')
            .setColor(0xed4245)
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const user = await interaction.client.users.fetch(channel.topic).catch(() => null);
    const reason = interaction.options.getString('reason') || 'Geen reden opgegeven.';
    const staffName = interaction.member?.displayName || interaction.user.username;

    if (user) {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('ModMail ticket gesloten')
            .setDescription('Je ModMail ticket is gesloten door het staffteam.')
            .addFields(
              { name: 'Gesloten door', value: staffName, inline: true },
              { name: 'Reden', value: reason }
            )
            .setColor(0xed4245)
            .setTimestamp()
        ]
      }).catch(() => {});
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('ModMail ticket gesloten')
          .setDescription('Dit kanaal wordt over 3 seconden verwijderd.')
          .addFields(
            { name: 'Gesloten door', value: staffName, inline: true },
            { name: 'Reden', value: reason }
          )
          .setColor(0x57f287)
          .setTimestamp()
      ]
    });

    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 3000);
  }
};
