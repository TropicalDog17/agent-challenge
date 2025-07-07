import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { newsIntelligenceAgent } from "./agents/smart-task-agent/your-agent";

export const mastra = new Mastra({
	agents: { newsIntelligenceAgent },
	logger: new PinoLogger({
		name: "Mastra",
		level: "debug",
	}),
	server: {
		port: 8081,
		timeout: 60000, // Increased to 60 seconds
	},
});
