import { Request, Response } from "@elements/app";
import { allowPage } from "#app/shared/services/auth";
import { tickets } from "#app/shared/services/tickets";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!allowPage("staff")) {
    return;
  }

  return new html({ tickets: tickets.view() });
}
