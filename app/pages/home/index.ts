import { Request, Response } from "@elements/app";
import { menuItems, loadCategories, loadOptionGroups } from "#app/shared/services/menu";
import { todaySchedule } from "#app/shared/services/hours";
import { testCheckout } from "#app/shared/stripe";
import html from "./template";

export default function route(req: Request, res: Response) {
  return new html({
    menu: menuItems.view(),
    categories: loadCategories(),
    groups: loadOptionGroups(),
    schedule: todaySchedule(),
    testMode: testCheckout(),
  });
}
