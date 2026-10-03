import { Request, Response } from "@elements/app";
import { allowPage } from "#app/shared/services/auth";
import { menuItems, loadCategories } from "#app/shared/services/menu";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!allowPage("staff")) {
    return;
  }

  return new html({ menu: menuItems.view(), categories: loadCategories() });
}
