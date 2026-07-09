import { AppBootstrapper } from '../core/boot.ts';
import { LocalPubSubBus } from '../core/pubsub/LocalPubSubBus.ts';
import { DatabaseMemoryService } from '../core/db/DatabaseMemoryService.ts';

async function simulateAgent(agentId: string, inputTopic: string, outputTopic: string, transactionId: string) {
  const pubsub = LocalPubSubBus.getInstance();
  const db = DatabaseMemoryService.getInstance();

  pubsub.subscribe(inputTopic, async (data: any) => {
    console.log('[' + agentId + '] Received event on ' + inputTopic + ':', data);
    await db.saveFlowCheckpoint(transactionId, agentId, inputTopic, { status: 'STARTED', data });
    const resultData = { ...data, [agentId + 'Result']: 'success' };
    await db.saveFlowCheckpoint(transactionId, agentId, outputTopic, { status: 'COMPLETED', resultData });
    console.log('[' + agentId + '] Finished work. Publishing to ' + outputTopic);
    pubsub.publish(outputTopic, resultData);
  });
}

export async function runE2EFlow() {
  await AppBootstrapper.bootstrap();
  const pubsub = LocalPubSubBus.getInstance();
  const transactionId = '00000000-0000-0000-0000-000000000001';

  console.log('Starting E2E Flow test with Pub/Sub...');

  await simulateAgent('SourcingAgent', 'FLOW_START', 'SOURCING_DONE', transactionId);
  await simulateAgent('DDAgent', 'SOURCING_DONE', 'DD_DONE', transactionId);
  await simulateAgent('NegotiationAgent', 'DD_DONE', 'NEGOTIATION_DONE', transactionId);
  await simulateAgent('ClosingAgent', 'NEGOTIATION_DONE', 'FLOW_END', transactionId);

  pubsub.subscribe('FLOW_END', (data: any) => {
    console.log('[Orchestrator] Flow completed successfully!', data);
    console.log('E2E Test Finished.');
    Deno.exit(0);
  });

  pubsub.publish('FLOW_START', { dealName: 'Acquisition of TechCorp' });
}

if (import.meta.main) {
  runE2EFlow().catch(console.error);
}
