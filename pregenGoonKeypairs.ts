import { Keypair } from '@solana/web3.js';
import { writeFileSync } from 'fs';

async function pregenVanityKeypairs(suffix: string = 'goon', count: number = 5) {
  const keypairs: { publicKey: string; secretKey: string }[] = [];
  let tries = 0;

  console.log(`Starting to generate ${count} keypairs ending with "${suffix}"...`);
  console.log('This may take a while depending on your hardware...\n');

  while (keypairs.length < count) {
    const kp = Keypair.generate();
    const address = kp.publicKey.toBase58();
    
    if (address.toLowerCase().endsWith(suffix.toLowerCase())) {
      keypairs.push({
        publicKey: address,
        secretKey: Buffer.from(kp.secretKey).toString('base64'),
      });
      console.log(`Found #${keypairs.length}: ${address} after ${tries.toLocaleString()} tries`);
    }
    
    tries++;
    if (tries % 100000 === 0) {
      console.log(`Checked ${tries.toLocaleString()} keypairs... (found ${keypairs.length}/${count})`);
    }
  }

  const filename = `goon-keypairs-${Date.now()}.json`;
  writeFileSync(filename, JSON.stringify(keypairs, null, 2));
  
  console.log(`\n✅ Generated ${count} keypairs, saved to ${filename}`);
  console.log(`Total tries: ${tries.toLocaleString()}`);
  console.log(`\nNext steps:`);
  console.log(`1. Upload the keypairs to your Supabase 'goon_keypairs' table`);
  console.log(`2. Use the 'used' field to track which ones have been consumed`);
  console.log(`3. Run this script again when you're running low on keypairs`);
}

// Run the script with error handling
console.log('🚀 Starting GoonHub vanity keypair generation...');
pregenVanityKeypairs().catch((error) => {
  console.error('❌ Error generating keypairs:', error);
  process.exit(1);
});
