const { StringSelectMenuBuilder } = require("@discordjs/builders");

const storeComponent = new StringSelectMenuBuilder({
  custom_id: "components_store",
  placeholder: "Selecciona una categoría",
  options: [
    { label: "Case", value: "case" },
    { label: "Motherboard", value: "motherboard" },
    { label: "Procesador", value: "cpu" },
    { label: "Cooler", value: "cooler" },
    { label: "RAM", value: "ram" },
    { label: "Almacenamiento", value: "hard_disk" },
    { label: "Grafica", value: "gpu" },
    { label: "Fuente de poder", value: "power_supply" },
  ],
});

const caseComponent = new StringSelectMenuBuilder({
  custom_id: "case_store",
  placeholder: "Selecciona un case",
  options: [
    { label: "Case Antryx", value: "antryx" },
    { label: "Case Halion", value: "halion" },
  ],
});

const components = {
  storeComponent,
  caseComponent
}
module.exports = components;
