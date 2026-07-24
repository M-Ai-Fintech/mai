import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { LocalPubSubBus } from "./LocalPubSubBus.ts";

Deno.test("LocalPubSubBus - Single publish and subscribe", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  const received = new Promise<unknown>((resolve) => {
    bus.subscribe("TEST_TOPIC", resolve);
  });
  bus.publish("TEST_TOPIC", { msg: "hello" });
  assertEquals(await received, { msg: "hello" });
});

Deno.test("LocalPubSubBus - Replay past events (at-least-once)", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  bus.publish("REPLAY_TOPIC", { event: 1 });
  bus.publish("REPLAY_TOPIC", { event: 2 });
  const received: any[] = [];
  const replayed = new Promise<void>((resolve) => {
    bus.subscribe("REPLAY_TOPIC", (data) => {
      received.push(data);
      if (received.length === 2) resolve();
    });
  });
  await replayed;
  assertEquals(received.length, 2);
  assertEquals(received[0].event, 1);
  assertEquals(received[1].event, 2);
});
