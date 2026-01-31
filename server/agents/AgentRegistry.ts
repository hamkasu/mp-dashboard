/**
 * Agent Registry
 * Central registry for all AI agents
 * Copyright by Calmic Sdn Bhd
 */

import type { IAgent, AgentType } from "./types";
import { HansardMonitorAgent } from "./HansardMonitorAgent";
import { DataQualityAgent } from "./DataQualityAgent";
import { BillAnalyzerAgent } from "./BillAnalyzerAgent";
import { PollGeneratorAgent } from "./PollGeneratorAgent";

export class AgentRegistry {
  private static agents: Map<AgentType, IAgent> = new Map();

  /**
   * Initialize and register all agents
   */
  static initialize() {
    this.register(new HansardMonitorAgent());
    this.register(new DataQualityAgent());
    this.register(new BillAnalyzerAgent());
    this.register(new PollGeneratorAgent());
  }

  /**
   * Register an agent
   */
  static register(agent: IAgent) {
    this.agents.set(agent.type, agent);
  }

  /**
   * Get an agent by type
   */
  static getAgent(type: AgentType): IAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Get all registered agents
   */
  static getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent types
   */
  static getAgentTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if agent exists
   */
  static hasAgent(type: AgentType): boolean {
    return this.agents.has(type);
  }
}

// Initialize agents on module load
AgentRegistry.initialize();
