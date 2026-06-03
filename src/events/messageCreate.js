import {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;
const MODMAIL_CATEGORY_ID = process.env.MODMAIL_CATEGORY_ID || '1498650880604639272';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot) return;

      if (!message.guild) {
        await handleModmailDm(message, client);
        return;
      }

      const handledStaffReply = await handleModmailStaffReply(message, client);
      if (handledStaffReply) return;

      await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handleModmailDm(message, client) {
  const guild = await getConfiguredGuild(client);
  if (!guild) {
    logger.warn('Modmail DM received, but GUILD_ID is not configured or the guild is unavailable.');
    return;
  }

  const ticket = guild.channels.cache.find(
    channel => channel.parentId === MODMAIL_CATEGORY_ID && channel.topic === message.author.id
  );

  if (ticket) {
    await ticket.send({
      content: `User ${message.author.tag}: ${message.content || '(no text)'}`,
      files: [...message.attachments.values()].map(attachment => attachment.url)
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('ModMail')
    .setDescription('Weet je zeker dat je een ticket wilt openen?');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`modmail_yes:${message.author.id}`)
        .setLabel('Ja')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`modmail_no:${message.author.id}`)
        .setLabel('Nee')
        .setStyle(ButtonStyle.Danger)
    );

  await message.author.send({
    embeds: [embed],
    components: [row]
  });
}

async function handleModmailStaffReply(message, client) {
  if (
    message.channel?.parentId !== MODMAIL_CATEGORY_ID ||
    !message.channel?.topic
  ) {
    return false;
  }

  const user = await client.users.fetch(message.channel.topic).catch(() => null);
  if (!user) {
    await message.reply('I could not find the user for this modmail ticket.');
    return true;
  }

  await user.send({
    content: `Staff: ${message.content || '(no text)'}`,
    files: [...message.attachments.values()].map(attachment => attachment.url)
  }).catch(async () => {
    await message.reply('I could not DM this user. Their DMs may be closed.');
  });

  return true;
}

async function getConfiguredGuild(client) {
  const guildId = client.config?.bot?.guildId;
  if (!guildId) return null;

  return client.guilds.cache.get(guildId)
    || await client.guilds.fetch(guildId).catch(() => null);
}

async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }

    const levelingConfig = await getLevelingConfig(client, message.guild.id);

    if (!levelingConfig?.enabled) {
      return;
    }

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);

    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);

    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    const result = await addXp(client, message.guild, message.member, finalXP);

    if (result.success && result.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}
