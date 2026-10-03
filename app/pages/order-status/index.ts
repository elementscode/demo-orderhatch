import { NotFoundError, Request, Response } from "@elements/app";
import { tickets } from "#app/shared/services/tickets";
import html from "./template";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The order id is the capability: an unguessable uuid, like a tracking link. */
export default function route(req: Request, res: Response) {
  let id = String(req.params.id ?? "");

  if (!UUID.test(id)) {
    throw new NotFoundError();
  }

  let order = tickets.view({ id });

  if (order.length === 0) {
    throw new NotFoundError();
  }

  return new html({ order });
}
