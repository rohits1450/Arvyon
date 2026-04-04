# Sepolia Etherscan Verification Guide

## Contract Addresses (Live on Sepolia)

### 1. PolicyRegistry
- **Address**: 0xEee3203FED2668FcFA5dfD70E2005ECDDB616730
- **Etherscan**: https://sepolia.etherscan.io/address/0xEee3203FED2668FcFA5dfD70E2005ECDDB616730
- **Status**: ✅ **Verified** via `npx hardhat verify --network sepolia <address>`

### 2. PDRLogger
- **Address**: 0x6B787F26F20450600211b593Dd057D11Be58Da30
- **Etherscan**: https://sepolia.etherscan.io/address/0x6B787F26F20450600211b593Dd057D11Be58Da30

### 3. Executor
- **Address**: 0x868c6bc7a7B7eF5Db2cA273c169519D6C5f5C5A3
- **Etherscan**: https://sepolia.etherscan.io/address/0x868c6bc7a7B7eF5Db2cA273c169519D6C5f5C5A3

## Verification Method (if using Etherscan UI)

For each contract, follow these steps:

1. Go to the contract address on Etherscan
2. Click "Contract" tab → "Verify and Publish"
3. Select:
   - Compiler Language: `Solidity (Single file)`
   - Compiler Version: `v0.8.19`
   - License: `MIT`
4. Paste the full contract source code
5. Constructor arguments: Leave empty (no-args constructor)
6. Click "Verify and Publish"

## Verification via Hardhat (Automated)

If you set up ETHERSCAN_API_KEY in .env:

```bash
npx hardhat verify --network sepolia 0xEee3203FED2668FcFA5dfD70E2005ECDDB616730
npx hardhat verify --network sepolia 0x6B787F26F20450600211b593Dd057D11Be58Da30
npx hardhat verify --network sepolia 0x868c6bc7a7B7eF5Db2cA273c169519D6C5f5C5A3
```

## Live Transaction Test Result

✅ **Test Transaction Executed Successfully:**
- Tx: 0x5c1c8138481edc781f0e5f3962bbe8812ffb43a7ed1c3af76af4cd9ae17ad96e
- Block: 10579773
- Function: registerPolicy(bytes32)
- Status: ✅ Confirmed
- Gas Used: 68,488
- Policy Registered: true

**View on Etherscan**: https://sepolia.etherscan.io/tx/0x5c1c8138481edc781f0e5f3962bbe8812ffb43a7ed1c3af76af4cd9ae17ad96e
