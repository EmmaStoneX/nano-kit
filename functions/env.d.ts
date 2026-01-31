/// <reference types="@cloudflare/workers-types" />

interface Env {
  IMAGES_BUCKET: R2Bucket
  PROMPTS_KV: KVNamespace
}
