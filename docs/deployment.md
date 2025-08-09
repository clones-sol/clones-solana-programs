# Deployment Guide

## Prerequisites

### Required Tools

- **Node.js** (version 18 or higher)
- **Rust** (version 1.70 or higher)
- **Solana CLI** (version 1.17 or higher)
- **Git**

### Tool Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Verify installations
rustc --version
solana --version
node --version
```

### Solana Configuration

```bash
# Configure default network (devnet for testing)
solana config set --url devnet

# Create new keypair if needed
solana-keygen new --outfile ~/.config/solana/id.json

# Check balance
solana balance
```

## Project Configuration

### 1. Dependency Installation

```bash
# Install Node.js dependencies
npm install

# Install Rust dependencies
cd programs/reward-pool
cargo build
cd ../..
```

### 2. Environment Configuration

```bash
# Copy example file
cp env.example .env

# Edit .env file with your parameters
nano .env
```

Important environment variables:

```env
# Solana Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Deployment Keys
DEPLOYER_KEYPAIR_PATH=~/.config/solana/id.json

# Programs (will be updated after deployment)
REWARD_POOL_PROGRAM_ID=your_program_id_here
```

## Deployment

### 1. Program Build

```bash
# Complete build
npm run build

# Or separate build
npm run build:programs
npm run build:client
```

### 2. Devnet Deployment

```bash
# Deploy reward pool program
npm run deploy:devnet

# Or use script directly
npx ts-node scripts/deploy.ts reward-pool --network devnet
```

### 3. Deployment Verification

```bash
# Test deployed program
npm run test

# Or use test script
npx ts-node scripts/deploy.ts test --network devnet
```

### 4. Mainnet Deployment

⚠️ **WARNING**: Mainnet deployment requires complete validation.

```bash
# Change configuration to mainnet
solana config set --url mainnet-beta

# Check balance (minimum 2 SOL recommended)
solana balance

# Deploy to mainnet
npm run deploy:mainnet
```

## Post-Deployment

### 1. Program ID Updates

After deployment, update the `.env` file with real Program IDs:

```env
REWARD_POOL_PROGRAM_ID=your_actual_program_id_here
```

### 2. Post-Deployment Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Tests with coverage
npm run test:coverage
```

### 3. Documentation

Update documentation with real Program IDs:

```markdown
## Program IDs

- **Reward Pool Program**: `your_program_id_here`
- **Deployed on**: `date`
- **Network**: `devnet/mainnet`
```

## Monitoring

### 1. Program Verification

```bash
# Check program status
solana program show your_program_id_here

# Check program accounts
solana account your_program_id_here
```

### 2. Logs and Debugging

```bash
# Enable detailed logs
export RUST_LOG=debug

# View real-time logs
solana logs your_program_id_here
```

## Security

### 1. Key Verification

```bash
# Verify you're using the correct key
solana address

# Check balance
solana balance
```

### 2. Security Tests

```bash
# Security tests
npm run test:security

# Dependency audit
npm audit
```

## Troubleshooting

### Common Errors

1. **Insufficient balance**
   ```bash
   # Buy SOL on devnet
   solana airdrop 2
   ```

2. **Program not found**
   ```bash
   # Check Program ID
   solana program show your_program_id_here
   ```

3. **Compilation error**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

### Support

- **GitHub Issues**: [Create an issue](https://github.com/clones-sol/clones-solana-programs/issues)
- **Documentation**: [Read documentation](docs/)
- **Discord**: [Join Discord](https://discord.gg/clones)
