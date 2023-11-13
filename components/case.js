const { StringSelectMenuBuilder } = require("@discordjs/builders");
const { categorySchema } = require('../schemas/Category')

const fields = []
async () => {
    const products = await categorySchema.find({ name: "case" }).select('products')
    products.map(product => ({
        name: product.find().select('imageUrl') + product.find().select('name'),
        value: `Precio: 💸${product.find().select('price')}`
    }))
    for (const product of products) {
        const img = await product.find().select('imageUrl');
        const name = await product.find().select('name');
        const price = await product.find().select('price')

        fields.push({
            name: img + name,
            value: `Precio: 💸${price}`,
            inline: true
        })
    }
}

const component = new StringSelectMenuBuilder({
    custom_id: "components_store",
    placeholder: "Selecciona una categoría",
    options: [
        { label: "", value: "" },
    ]
})


const embed = {
    type: "rich",
    title: `🛒 Cases disponibles 🛒`,
    description: "",
    color: 0xffffff,
    fields: [fields]
}

module.exports = { embed, component }