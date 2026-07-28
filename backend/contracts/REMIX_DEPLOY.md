# Remix fallback deployment

Use this path when thirdweb's deploy UI rejects X Layer testnet with
`invalid chain ID`. Remix deploys through the browser wallet, so you can sign
with OKX Wallet without exporting a private key.

## 1. Confirm the OKX wallet network

Use **X Layer Testnet**:

- Chain ID: `1952`
- RPC: `https://testrpc.xlayer.tech/terigon`
- Gas token: `OKB`
- Explorer: `https://www.okx.com/web3/explorer/xlayer-test`

## 2. Open Remix

Open `https://remix.ethereum.org`.

In the **File explorer**, create two files:

- `LoreloomGenesis.sol`
- `LoreloomChapter.sol`

Paste the matching source from this repo:

- `contracts/src/LoreloomGenesis.sol`
- `contracts/src/LoreloomChapter.sol`

Remix can resolve the `@openzeppelin/contracts` imports automatically.

## 3. Compile

Open the Solidity compiler tab:

- Compiler version: `0.8.24` or newer `0.8.x`
- Compile `LoreloomGenesis.sol`
- Compile `LoreloomChapter.sol`

## 4. Deploy Genesis

Open **Deploy & run transactions**:

- Environment: `Injected Provider - OKX Wallet`
- Confirm the network shown by Remix is chain ID `1952`
- Contract: `LoreloomGenesis`

Constructor values:

- `name_`: `Loreloom Genesis`
- `symbol_`: `LORE-G`
- `initialAdmin`: your funded OKX wallet address

Click **Deploy** and approve the transaction in OKX Wallet.

Record the deployed Genesis contract address.

## 5. Deploy Chapter

Change the selected contract to `LoreloomChapter`.

Constructor values:

- `name_`: `Loreloom Chapter`
- `symbol_`: `LORE-C`
- `genesisContract_`: the deployed `LoreloomGenesis` address
- `initialAdmin`: your funded OKX wallet address

Click **Deploy** and approve the transaction in OKX Wallet.

Record the deployed Chapter contract address.

## 6. Add addresses locally

Set these in the root `.env.local`:

```bash
GENESIS_CONTRACT_ADDRESS=<deployed Genesis address>
CHAPTER_CONTRACT_ADDRESS=<deployed Chapter address>
```

## 7. Grant backend mint permissions

The wallet that performs backend minting needs `MINTER_ROLE` on both
contracts. Print the role hash with:

```bash
npm run role:minter -w @loreloom/contracts
```

Then call `grantRole(role, account)` on both contracts from the admin wallet:

- `role`: the printed `MINTER_ROLE` hash
- `account`: the backend minter wallet address

For the demo, this can be either a thirdweb Server Wallet or a fresh test-only
EOA managed by the backend. Do not use a personal wallet private key on the
backend.
