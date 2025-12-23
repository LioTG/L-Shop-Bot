const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product');
const { Category } = require('../../schemas/Category');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-product')
        .setDescription('Add a product to the store.')
        .addStringOption(option => option.setName('categoria')
            .setDescription('Product category')
            .setRequired(true)
            .addChoices(
                { name: 'Cases', value: 'cases' },
                { name: 'Motherboards', value: 'motherboard' },
                { name: 'Processors', value: 'cpu' },
                { name: 'Coolers', value: 'cooler' },
                { name: 'RAM', value: 'ram' },
                { name: 'Storage', value: 'storage' },
                { name: 'GPUs', value: 'gpu' },
                { name: 'Power supplies', value: 'psu' },
            ))
        .addStringOption(option => option.setName('nombre')
            .setDescription('Product name')
            .setRequired(true))
        .addStringOption(option => option.setName('emoji')
            .setDescription('Emoji ID')
            .setRequired(true))
        .addIntegerOption(option => option.setName('precio')
            .setDescription('Product price')
            .setRequired(true))
        .addStringOption(option => option.setName('socket')
            .setDescription('Socket (CPUs and motherboards only)')
            .setRequired(false))
        .addStringOption(option => option.setName('ramtype')
            .setDescription('RAM type (RAM and motherboards only)')
            .setRequired(false))
        .addIntegerOption(option => option.setName('ramslots')
            .setDescription('RAM slots (motherboards only)')
            .setRequired(false))
        .addIntegerOption(option => option.setName('hashrate')
            .setDescription('Hash rate (GPU/CPU/RAM/Storage only)')
            .setRequired(false)),

    async run({ interaction }) {
        const categoryId = interaction.options.getString('categoria');
        const name = interaction.options.getString('nombre');
        const price = interaction.options.getInteger('precio');
        const imageUrl = interaction.options.getString('emoji');
        const socketRaw = interaction.options.getString('socket');
        const ramTypeRaw = interaction.options.getString('ramtype');
        const ramSlotsRaw = interaction.options.getInteger('ramslots');
        const hashRateRaw = interaction.options.getInteger('hashrate');
        const socket = socketRaw ? socketRaw.toUpperCase() : undefined;
        const ramType = ramTypeRaw ? ramTypeRaw.toUpperCase() : undefined;
        const ramSlots = Number.isFinite(ramSlotsRaw) ? ramSlotsRaw : undefined;
        const hashRate = Number.isFinite(hashRateRaw) ? hashRateRaw : undefined;

        await interaction.deferReply();

        try {
            let product = await Product.findOne({ name: name });

            if (!product) {
                product = new Product({
                    id: Math.floor(Math.random() * 1000) + 1,
                    name: name,
                    price: price,
                    imageUrl: imageUrl,
                    category: categoryId,
                    socket: ['cpu', 'motherboard'].includes(categoryId) ? socket : undefined,
                    ramType: ['ram', 'motherboard'].includes(categoryId) ? ramType : undefined,
                    ramSlots: categoryId === 'motherboard' ? ramSlots : undefined,
                    hashRate: ['gpu', 'cpu', 'ram', 'storage'].includes(categoryId) ? hashRate : undefined
                });

                let category = await Category.findOne({ name: categoryId });
                if (!category) {
                    category = new Category({
                        id: Math.floor(Math.random() * 1000) + 1000,
                        name: categoryId,
                        products: []
                    });
                }

                category.products.push(product._id);

                await Promise.all([category.save(), product.save()]);
                const socketMsg = socket && ['cpu', 'motherboard'].includes(categoryId) ? ` | Socket: ${socket}` : '';
                const ramMsg = ramType && ['ram', 'motherboard'].includes(categoryId) ? ` | RAM: ${ramType}` : '';
                const slotsMsg = ramSlots && categoryId === 'motherboard' ? ` | RAM slots: ${ramSlots}` : '';
                const hashMsg = hashRate && ['gpu', 'cpu', 'ram', 'storage'].includes(categoryId) ? ` | Hash rate: ${hashRate}` : '';
                await interaction.editReply({ content: `${imageUrl} ${name} in category ${categoryId} was created for <:pcb:827581416681898014> ${price}${socketMsg}${ramMsg}${slotsMsg}${hashMsg}` });
            } else {
                await interaction.editReply({ content: 'A product with that name already exists.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error creating product:', error);
            await interaction.editReply({ content: 'An error occurred while creating the product.', ephemeral: true });
        }
    }
};
