import {
  charactersApi as httpCharactersApi,
  dataApi as httpDataApi,
} from "../api/characters.js";

// Local por defecto; HTTP solo si VITE_LOCAL === "false".
const USE_LOCAL = import.meta.env.VITE_LOCAL !== "false";

let charactersApi = httpCharactersApi;
let dataApi = httpDataApi;

if (USE_LOCAL) {
  const { createLocalClient } = await import("../local/container.js");
  const client = createLocalClient();
  charactersApi = client.charactersApi;
  dataApi = client.dataApi;
}

export { charactersApi, dataApi };
