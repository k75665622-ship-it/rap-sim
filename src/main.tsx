import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { useGameStore } from "./store/gameStore";
import * as saves from "./store/saves";
import * as features from "./sim/features";
import * as cameo from "./sim/cameo";
import * as gameClock from "./sim/gameClock";
import * as roles from "./sim/roles";
import * as tax from "./sim/tax";
import * as inbound from "./sim/inbound";
import * as shows from "./sim/shows";
import * as booking from "./sim/booking";
import * as tours from "./sim/tours";
import * as room from "./sim/room";
import * as studio from "./sim/studio";
import * as fanbase from "./sim/fanbase";
import * as beef from "./sim/beef";
import * as rivalries from "./data/rivalries";
import * as release from "./sim/release";

// Dev hook so the store can be driven from the console / automated tests.
// Harmless in production: it exposes no more than the local save file already does.
(window as unknown as { __rapStore?: typeof useGameStore }).__rapStore = useGameStore;

// The save layer, for the same reason — and because the legacy-save migration
// runs at import time, before any test script can put a `rap_game_save_v1` in
// storage. Verifying that path needs to be able to call it directly.
(window as unknown as { __rapSaves?: typeof saves }).__rapSaves = saves;

// The pure decision engines. They are deterministic functions of their inputs,
// which is the whole reason they were written that way — a test can pin an
// outcome by passing a roll instead of hoping for one.
(window as unknown as {
  __rapSim?: {
    features: typeof features;
    cameo: typeof cameo;
    gameClock: typeof gameClock;
    roles: typeof roles;
    tax: typeof tax;
    inbound: typeof inbound;
    shows: typeof shows;
    booking: typeof booking;
    tours: typeof tours;
    room: typeof room;
    studio: typeof studio;
    fanbase: typeof fanbase;
    beef: typeof beef;
    rivalries: typeof rivalries;
    release: typeof release;
  };
}).__rapSim = {
  features,
  cameo,
  gameClock,
  roles,
  tax,
  inbound,
  shows,
  booking,
  tours,
  room,
  studio,
  fanbase,
  beef,
  rivalries,
  release,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
