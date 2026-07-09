import { Agent } from '@mastra/core/agent';
import { LocalPubSubBus } from './LocalPubSubBus.ts';
import { DatabaseMemoryService } from '../db/DatabaseMemoryService.ts';

export class AgentFlowWrapper {
  static registerAgentOnBus(
    agent: Agent,
    inputTopic: string,
    outputTopic: string,
    handler: (agent: Agent, data: any) => Promise<any>
  ) {
    const pubsub = LocalPubSubBus.getInstance();
    const db = DatabaseMemoryService.getInstance();

    pubsub.subscribe(inputTopic, async (data: any) => {
      const transactionId = data.transactionId || 'unknown_tx';
      const agentId = agent.id || agent.name || 'unknown_agent';

      console.log('[' + agentId + '] Starting step: ' + inputTopic);
      await db.saveFlowCheckpoint(transactionId, agentId, inputTopic, { status: 'STARTED', data });

      try {
        const result = await handler(agent, data);
        await db.saveFlowCheckpoint(transactionId, agentId, outputTopic, { status: 'COMPLETED', result });
        console.log('[' + agentId + '] Finished step. Publishing to ' + outputTopic);
        pubsub.publish(outputTopic, { ...data, ...result });
      } catch (error) {
        console.error('[' + agentId + '] Error in step ' + inputTopic + ':', error);
        await db.saveFlowCheckpoint(transactionId, agentId, inputTopic, { status: 'FAILED', error: String(error) });
      }
    });
  }
}
