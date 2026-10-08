import streamDeck from "@elgato/streamdeck";
import { AgentSlot } from "./actions/agent-slot";
import { AgentsDial } from "./actions/agents-dial";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new AgentSlot());
streamDeck.actions.registerAction(new AgentsDial());
streamDeck.connect();
