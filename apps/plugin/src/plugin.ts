import streamDeck from "@elgato/streamdeck";
import { AgentSlot } from "./actions/agent-slot";
import { AgentsDial } from "./actions/agents-dial";
import { ShowcaseToggle } from "./actions/showcase-toggle";
import { CloudAgent } from "./actions/cloud-agent";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new AgentSlot());
streamDeck.actions.registerAction(new AgentsDial());
streamDeck.actions.registerAction(new ShowcaseToggle());
streamDeck.actions.registerAction(new CloudAgent());
streamDeck.connect();
