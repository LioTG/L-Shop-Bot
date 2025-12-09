const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { Product } = require('../../schemas/Product');
const { Category } = require('../../schemas/Category');

const ITEMS_PER_PAGE = 12;
const SHOP_TITLE = '\uD83D\uDED2 PC Component Store';

const CATEGORY_EMOJIS = {
  recent: '✨',
  cases: '🧳',
  motherboard: '🧠',
  cpu: '🖥️',
  cooler: '❄️',
  ram: '📗',
  storage: '💾',
  gpu: '🎨',
  psu: '🔌',
};

const CATEGORY_LABELS = {
  recent: 'Recent Products',
  cases: 'Cases',
  motherboard: 'Motherboards',
  cpu: 'CPUs',
  cooler: 'Coolers',
  ram: 'RAMs',
  storage: 'Storage',
  gpu: 'GPUs',
  psu: 'Power Supplies',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Explore and buy PC components.'),

  async run({ interaction }) {
    await interaction.deferReply();

    const allProducts = await Product.find().sort({ _id: -1 });

    if (!allProducts.length) {
      await interaction.editReply({ content: 'The store is empty at the moment.' });
      return;
    }

    const categories = await Category.find().select('name').sort({ name: 1 });
    const selectOptions = [
      { label: CATEGORY_LABELS.recent, value: 'recent', emoji: CATEGORY_EMOJIS.recent },
      ...categories.map((cat) => ({
        label: CATEGORY_LABELS[cat.name] || cat.name,
        value: cat.name,
        emoji: CATEGORY_EMOJIS[cat.name] || '📦',
      })),
    ];

    let currentCategory = 'recent';
    let currentPage = 0;

    const getProducts = () =>
      currentCategory === 'recent'
        ? allProducts
        : allProducts.filter((p) => p.category === currentCategory);

    const buildEmbed = () => {
      const products = getProducts();
      if (!products.length) {
        return new EmbedBuilder()
          .setTitle(`${SHOP_TITLE} - ${CATEGORY_LABELS[currentCategory] || currentCategory}`)
          .setDescription('There are no products for this category.')
          .setColor('White');
      }

      const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages - 1);
      const start = currentPage * ITEMS_PER_PAGE;
      const pageItems = products.slice(start, start + ITEMS_PER_PAGE);

      const titleSuffix = CATEGORY_LABELS[currentCategory] || currentCategory;
      const embed = new EmbedBuilder()
        .setTitle(`${SHOP_TITLE} - ${titleSuffix}`)
        .setColor('White')
        .addFields({ name: '\u200B', value: 'Purchase using the command `/buy-item`.' })
        .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

      for (const product of pageItems) {
        embed.addFields({
          name: `${product.imageUrl} ${product.name}`,
          value: `Price: <:pcb:827581416681898014> ${product.price}`,
          inline: false,
        });
      }

      return embed;
    };

    const buildComponents = () => {
      const products = getProducts();
      const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_category')
          .setPlaceholder('Select a category')
          .addOptions(selectOptions)
          .setMinValues(1)
          .setMaxValues(1)
      );

      const buttonRow = new ActionRowBuilder();
      if (totalPages > 1) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId('shop_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('shop_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1)
        );
      }

      return totalPages > 1 ? [selectRow, buttonRow] : [selectRow];
    };

    const message = await interaction.editReply({
      embeds: [buildEmbed()],
      components: buildComponents(),
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'shop_category' && i.isStringSelectMenu()) {
        currentCategory = i.values[0];
        currentPage = 0;
        await i.update({
          embeds: [buildEmbed()],
          components: buildComponents(),
        });
        return;
      }

      if (i.customId === 'shop_prev' || i.customId === 'shop_next') {
        const products = getProducts();
        const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

        if (i.customId === 'shop_prev' && currentPage > 0) currentPage -= 1;
        if (i.customId === 'shop_next' && currentPage < totalPages - 1) currentPage += 1;

        await i.update({
          embeds: [buildEmbed()],
          components: buildComponents(),
        });
      }
    });

    collector.on('end', async () => {
      if (!message.editable) return;
      await message.edit({ components: [] });
    });
  },
};
