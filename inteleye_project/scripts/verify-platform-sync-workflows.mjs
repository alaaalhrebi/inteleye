import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflows = [
  {
    file: "n8n/workflows/google-maps-sync.json",
    platform: "google_maps",
    due: "HTTP Request",
    loop: "Loop Over Items",
  },
  {
    file: "n8n/workflows/instagram-comments-sync.json",
    platform: "instagram",
    due: "Get Active Instagram Platforms",
    loop: "Loop Instagram Accounts",
  },
  {
    file: "n8n/workflows/x-mentions-sync.json",
    platform: "x",
    due: "Get Due X Platforms",
    loop: "Loop Over Items",
  },
  {
    file: "n8n/workflows/tiktok-comments-clockworks.json",
    platform: "tiktok",
    due: "Get Due TikTok Platforms",
    loop: "Loop Over Items",
  },
];

function firstTarget(workflow, source) {
  return workflow.connections[source]?.main?.[0]?.[0]?.node ?? null;
}

for (const config of workflows) {
  const workflow = JSON.parse(await readFile(config.file, "utf8"));
  const dueNode = workflow.nodes.find((node) => node.name === config.due);
  const webhookNode = workflow.nodes.find(
    (node) => node.name === "Platform Added Webhook"
  );

  assert.ok(dueNode, `${config.file}: missing weekly claim node`);
  assert.ok(webhookNode, `${config.file}: missing platform webhook`);
  assert.match(
    dueNode.parameters.url,
    /body\?\.platform_id.*\/rpc\/claim_platform_sync.*\/rpc\/claim_due_platform_syncs/,
    `${config.file}: the shared claim node must select exact or batch mode`
  );
  assert.match(dueNode.parameters.jsonBody, /body\?\.platform_id/);
  assert.match(dueNode.parameters.jsonBody, /Number\(\$json\.body\.platform_id\)/);
  assert.match(dueNode.parameters.jsonBody, /p_batch_size: 25/);
  assert.match(dueNode.parameters.jsonBody, new RegExp(config.platform));
  assert.equal(
    firstTarget(workflow, "Platform Added Webhook"),
    config.due,
    `${config.file}: webhook must enter the dynamic claim node`
  );
  assert.equal(
    firstTarget(workflow, config.due),
    config.loop,
    `${config.file}: weekly claim must enter the shared processing loop`
  );
}

console.log(`Verified ${workflows.length} platform sync workflows.`);
