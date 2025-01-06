import type { Route } from "./+types/auth";

import { auth } from "~/lib/auth.server";

export function loader({ request }: Route.LoaderArgs) {
  return auth.handler(request);
}

export function action({ request }: Route.ActionArgs) {
  return auth.handler(request);
}
