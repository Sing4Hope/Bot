export default {
  name: 'modmail_no',

  async execute(interaction) {

    await interaction.update({
      content: '❌ Ticket geannuleerd.',
      embeds: [],
      components: []
    });
  }
};
