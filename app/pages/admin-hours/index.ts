import { Request, Response } from "@elements/app";
import { allowPage } from "#app/shared/services/auth";
import html, { loadHours } from "./template";

export default function route(req: Request, res: Response) {
  if (!allowPage("owner")) {
    return;
  }

  return new html({ days: loadHours() });
}
