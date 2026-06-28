import {
  charactersApi as httpCharactersApi,
  dataApi as httpDataApi,
} from "../api/characters.js";
import { USE_LOCAL } from "./mode.js";

let charactersApi = httpCharactersApi;
let dataApi = httpDataApi;

if (USE_LOCAL) {
  const { createLocalClient } = await import("../local/container.js");
  const client = createLocalClient();
  charactersApi = client.charactersApi;
  dataApi = client.dataApi;
}

export { charactersApi, dataApi };
