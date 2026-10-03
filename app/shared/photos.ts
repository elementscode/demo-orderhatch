import streetTacos from "#app/shared/assets/menu/street-tacos.jpg";
import tacoSampler from "#app/shared/assets/menu/taco-sampler.jpg";
import bajaFishTaco from "#app/shared/assets/menu/baja-fish-taco.jpg";
import shrimpTacos from "#app/shared/assets/menu/shrimp-tacos.jpg";
import burrito from "#app/shared/assets/menu/burrito.jpg";
import californiaBurrito from "#app/shared/assets/menu/california-burrito.jpg";
import burritoMojado from "#app/shared/assets/menu/burrito-mojado.jpg";
import breakfastBurrito from "#app/shared/assets/menu/breakfast-burrito.jpg";
import quesadilla from "#app/shared/assets/menu/quesadilla.jpg";
import enchiladaPlate from "#app/shared/assets/menu/enchilada-plate.jpg";
import tamales from "#app/shared/assets/menu/tamales.jpg";
import enchiladasRojas from "#app/shared/assets/menu/enchiladas-rojas.jpg";
import chipsGuacamole from "#app/shared/assets/menu/chips-guacamole.jpg";
import elote from "#app/shared/assets/menu/elote.jpg";
import nachos from "#app/shared/assets/menu/nachos.jpg";
import chipsSalsa from "#app/shared/assets/menu/chips-salsa.jpg";
import horchata from "#app/shared/assets/menu/horchata.jpg";
import jamaica from "#app/shared/assets/menu/jamaica.jpg";
import flan from "#app/shared/assets/menu/flan.jpg";
import churros from "#app/shared/assets/menu/churros.jpg";

/** Menu photos by the key stored on each item (menuItems.photo). CC0 and public domain, from Wikimedia Commons. */
export const PHOTOS: Record<string, string> = {
  "street-tacos": streetTacos,
  "taco-sampler": tacoSampler,
  "baja-fish-taco": bajaFishTaco,
  "shrimp-tacos": shrimpTacos,
  "burrito": burrito,
  "california-burrito": californiaBurrito,
  "burrito-mojado": burritoMojado,
  "breakfast-burrito": breakfastBurrito,
  "quesadilla": quesadilla,
  "enchilada-plate": enchiladaPlate,
  "tamales": tamales,
  "enchiladas-rojas": enchiladasRojas,
  "chips-guacamole": chipsGuacamole,
  "elote": elote,
  "nachos": nachos,
  "chips-salsa": chipsSalsa,
  "horchata": horchata,
  "jamaica": jamaica,
  "flan": flan,
  "churros": churros,
};

export function photoUrl(key: string): string {
  return PHOTOS[key] ?? "";
}
