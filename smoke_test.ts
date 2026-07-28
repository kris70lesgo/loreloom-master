import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollWorldStatus(worldId: string, targetStatuses: string[], timeoutMs = 240000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: world } = await supabase.from('worlds').select('id, status, genesis_token_id, reference_image_url').eq('id', worldId).single();
    if (world) {
      console.log(`[World ${worldId}] status=${world.status} token=${world.genesis_token_id || 'pending'} refImg=${world.reference_image_url ? 'yes' : 'no'}`);
      if (targetStatuses.includes(world.status)) return world;
      if (world.status === 'failed') throw new Error(`World ${worldId} reached failed status`);
    }
    await sleep(4000);
  }
  throw new Error(`World ${worldId} did not reach target status [${targetStatuses.join(', ')}] in ${timeoutMs}ms`);
}

async function pollChapterStatus(chapterId: string, targetStatuses: string[], timeoutMs = 240000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: chapter } = await supabase.from('chapters').select('id, status, chapter_token_id, image_url').eq('id', chapterId).single();
    if (chapter) {
      console.log(`[Chapter ${chapterId}] status=${chapter.status} token=${chapter.chapter_token_id || 'pending'} img=${chapter.image_url ? 'yes' : 'no'}`);
      if (targetStatuses.includes(chapter.status)) return chapter;
      if (chapter.status === 'failed') throw new Error(`Chapter ${chapterId} reached failed status`);
    }
    await sleep(4000);
  }
  throw new Error(`Chapter ${chapterId} did not reach target status [${targetStatuses.join(', ')}] in ${timeoutMs}ms`);
}

async function main() {
  console.log('==================================================');
  console.log('--- STARTING REAL END-TO-END MINT SMOKE TEST ---');
  console.log('==================================================');
  console.log(`MINT_MODE: ${process.env.MINT_MODE}`);
  console.log(`GENESIS CONTRACT: ${process.env.GENESIS_CONTRACT_ADDRESS}`);
  console.log(`CHAPTER CONTRACT: ${process.env.CHAPTER_CONTRACT_ADDRESS}`);

  // 1. Create World
  console.log('\n1. Creating world via POST /api/worlds...');
  const createRes = await fetch(`${API_URL}/api/worlds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: '0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467',
      title: 'Neon Samurai Chronicles',
      intake: {
        name: 'Neon Samurai Chronicles',
        prompt: 'A cyborg samurai defending the last memory garden in Neo-Kyoto.',
        species: 'Cyborg Human',
        style: 'Cyberpunk Anime, High Contrast Neon',
        protagonistName: 'Renjiro-09'
      },
      styleLock: 'Cyberpunk Anime, High Contrast Neon, Cinematic Lighting',
      aiProvider: 'openrouter'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Create World API failed: ${createRes.status} ${errText}`);
  }

  const createData = (await createRes.json()) as any;
  const worldId = createData.world.id;
  console.log(`World created! ID: ${worldId}`);

  // 2. Wait for Genesis text + Portrait generation -> portrait_ready
  console.log('\n2. Waiting for Genesis generation & Portrait generation (status: portrait_ready)...');
  await pollWorldStatus(worldId, ['portrait_ready']);
  console.log('>>> Genesis text and Character Portrait successfully generated! <<<');

  // 3. Confirm World to trigger Genesis NFT Minting
  console.log('\n3. Confirming world (POST /api/worlds/:id/confirm) to queue Genesis NFT minting...');
  const confirmRes = await fetch(`${API_URL}/api/worlds/${worldId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!confirmRes.ok) {
    const errText = await confirmRes.text();
    throw new Error(`Confirm World API failed: ${confirmRes.status} ${errText}`);
  }

  console.log('Confirm request accepted! Waiting for Thirdweb Engine to queue and mine Genesis NFT (status: active)...');
  const activeWorld = await pollWorldStatus(worldId, ['active']);
  console.log(`>>> SUCCESS! Genesis NFT Minted! Token ID: ${activeWorld.genesis_token_id} <<<`);

  // 4. Create Chapter 1
  console.log('\n4. Creating Chapter 1 (POST /api/worlds/:id/chapters)...');
  const chapRes = await fetch(`${API_URL}/api/worlds/${worldId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!chapRes.ok) {
    const errText = await chapRes.text();
    throw new Error(`Chapter creation failed: ${chapRes.status} ${errText}`);
  }

  const chapData = (await chapRes.json()) as any;
  const chapterId = chapData.chapter.id;
  console.log(`Chapter 1 job enqueued! Chapter ID: ${chapterId}`);

  // 5. Wait for Chapter text -> Stability AI Image -> Thirdweb Chapter NFT Minting
  console.log('\n5. Waiting for Chapter text generation, Stability AI illustration, and Thirdweb Chapter NFT minting (status: minted)...');
  const mintedChapter = await pollChapterStatus(chapterId, ['minted']);
  console.log(`>>> SUCCESS! Chapter 1 NFT Minted! Token ID: ${mintedChapter.chapter_token_id}, Image: ${mintedChapter.image_url} <<<`);

  console.log('\n==================================================');
  console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log(`Genesis Token ID: ${activeWorld.genesis_token_id}`);
  console.log(`Chapter 1 Token ID: ${mintedChapter.chapter_token_id}`);
  console.log(`Chapter 1 Image IPFS: ${mintedChapter.image_url}`);
  console.log('==================================================');
}

main().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
