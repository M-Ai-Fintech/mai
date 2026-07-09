import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { LocalPubSubBus } from "./LocalPubSubBus.ts";

Deno.test("LocalPubSubBus - Single publish and subscribe", () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  let receivedData = null;
  bus.subscribe("TEST_TOPIC", (data) => { receivedData = data; });
  bus.publish("TEST_TOPIC", { msg: "hello" });
  assertEquals(receivedData, { msg: "hello" });
});

Deno.test("LocalPubSubBus - Replay past events (at-least-once)", () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  bus.publish("REPLAY_TOPIC", { event: 1 });
  bus.publish("REPLAY_TOPIC", { event: 2 });
  const received: any[] = [];
  bus.subscribe("REPLAY_TOPIC", (data) => { received.push(data); });
  assertEquals(received.length, 2);
  assertEquals(received[0].event, 1);
  assertEquals(received[1].event, 2);
});
