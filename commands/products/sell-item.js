const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell-item')
        .setDescription('Sell a PC component from the inventory.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the product to be sold')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity of product to be sold')
                .setRequired(true)
        ),
    async run({ interaction }) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be executed within a server.', ephemeral: true });
            return;
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const name = interaction.options.getString('name');
        const cantidad = interaction.options.getInteger('quantity') || 1;

        console.log(`User: ${userId}, Name: ${name}, Quantity: ${cantidad}`);

        const userProfile = await UserProfile.findOne({ userId, guildId });

        if (!userProfile) {
            await interaction.reply({ content: 'You dont have a registered profile. Register first!', ephemeral: true });
            return;
        }

        // Buscar el artículo en el inventario del usuario
        let inventoryItem = userProfile.inventory.find(item => item.name === name);

        if (!inventoryItem || inventoryItem.quantity < cantidad) {
            await interaction.reply({ content: `You don't have enough ${name}(s) in your inventory.`, ephemeral: true });
            return;
        }

        // Encontrar el producto en la base de datos para obtener su precio
        const product = await Product.findOne({ name: name });

        if (!product) {
            await interaction.reply({ content: `There is no product with the name ${name}.`, ephemeral: true });
            return;
        }

        const ventaTotal = Math.round(product.price * 0.8 * cantidad); // El usuario obtiene el 80% del precio original por cada unidad vendida

        // Actualizar el balance del usuario
        userProfile.balance += ventaTotal;

        // Actualizar el inventario del usuario
        inventoryItem.quantity -= cantidad;
        if (inventoryItem.quantity === 0) {
            userProfile.inventory = userProfile.inventory.filter(item => item.name !== name);
        }

        try {
            await userProfile.save();

            // Crear un mensaje embed para mostrar la información de la venta
            const sellEmbed = new EmbedBuilder()
                .setTitle(`Sale of ${cantidad} ${name}(s)`)
                .setColor('#00ff00')
                .setDescription(`You have sold ${cantidad} ${name}(s) for <:pcb:827581416681898014> ${ventaTotal}!`)
                .setTimestamp()
                .setFooter({ text: 'Successful sale!' });

            await interaction.reply({ embeds: [sellEmbed] });
        } catch (error) {
            console.error('Error saving user profile:', error);
            await interaction.reply({ content: `An error occurred while trying to sell the product. Error: ${error.message}`, ephemeral: true});
        }
    },
};
