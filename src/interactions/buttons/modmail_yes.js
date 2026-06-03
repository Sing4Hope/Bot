import {
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';

const CATEGORY_ID = process.env.MODMAIL_CATEGORY_ID || '1498650880604639272';
const STAFF_ROLE_ID = process.env.MODMAIL_STAFF_ROLE_ID || '1498650876473249818';

export default {
  name: 'modmail_yes',

  async execute(interaction, client, args) {
    const userId = args[0];
    if (!userId || userId !== interaction.user.id) {
      return interaction.reply({
        content: 'Deze modmail knop is niet voor jou.',
        ephemeral: true
      });
    }

    const guild = client.guilds.cache.get(client.config.bot.guildId)
      || await client.guilds.fetch(client.config.bot.guildId).catch(() => null);

    if (!guild) {
      return interaction.reply({
        content: 'Ik kan de support server niet vinden. Controleer GUILD_ID.',
        ephemeral: true
      });
    }

    const existing = guild.channels.cache.find(
      channel => channel.parentId === CATEGORY_ID && channel.topic === userId
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

    await channel.send(`Nieuw ModMail ticket van <@${userId}>`);

    await interaction.update({
      content: 'Ticket geopend.',
      embeds: [],
      components: []
    });
  }
};
