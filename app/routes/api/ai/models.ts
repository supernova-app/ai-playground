import { getModels } from "~/lib/models";

export async function loader() {
  try {
    const models = await getModels();
    return Response.json(models);
  } catch (error: any) {
    console.error("Failed to fetch models from gateway:", error?.message);

    return Response.json(
      { error: "Failed to fetch models" },
      { status: 502 },
    );
  }
}
