import {
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';

const CATEGORY_ID = '1498650880604639272';
const STAFF_ROLE_ID = '1498650876473249818';

export default {
  name: 'modmail_yes',

  async execute(interaction, client, args) {

    const userId = args[0];

    const guild = client.guilds.cache.get(
      client.config.bot.guildId
    );

    const existing = guild.channels.cache.find(
      c => c.topic === userId
    );

    if (existing) {
      return interaction.reply({
        content: 'Je hebt al een open ticket.',
        ephemeral: true
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${userId}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      topic: userId,

      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        }
      ]
    });

    await channel.send(
      `📩 Nieuw ModMail ticket van <@${userId}>`
    );

    await interaction.update({
      content: '✅ Ticket geopend.',
      embeds: [],
      components: []
    });
  }
};
