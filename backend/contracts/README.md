# Loreloom contracts

`LoreloomGenesis` mints one root NFT per world. `LoreloomChapter` mints a
chapter NFT only to the current owner of its linked Genesis token.

## Local verification

```bash
npm test -w @loreloom/contracts
```

## X Layer testnet deployment

X Layer testnet is chain ID `1952`, uses `OKB` for gas, and has the official
RPC `https://testrpc.xlayer.tech/terigon`.

If thirdweb's browser deploy page rejects X Layer testnet with `invalid chain
ID`, use the Remix fallback in `contracts/REMIX_DEPLOY.md`.

1. From `contracts/`, run `npx thirdweb deploy -k "$THIRDWEB_SECRET_KEY"`.
2. In the browser flow, connect the funded OKX wallet, select **X Layer
   testnet**, and deploy `LoreloomGenesis` with:
   `Loreloom Genesis`, `LORE-G`, and your wallet address as `initialAdmin`.
3. Deploy `LoreloomChapter` with `Loreloom Chapter`, `LORE-C`, the deployed
   Genesis address, and the same wallet address as `initialAdmin`.
4. Record the two addresses in root `.env.local` as
   `GENESIS_CONTRACT_ADDRESS` and `CHAPTER_CONTRACT_ADDRESS`.
5. Create a dedicated thirdweb Server Wallet, fund it with test OKB, and grant
   its address `MINTER_ROLE` on both contracts. Then set the three
   `THIRDWEB_ENGINE_*` values and `MINT_MODE=thirdweb-engine` in `.env.local`.

The direct Hardhat script is deliberately limited to a fresh, test-only EOA.
Never export or place a personal OKX wallet private key in an environment file.
