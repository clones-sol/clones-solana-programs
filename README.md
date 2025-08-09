# Clones Solana Programs

Solana smart contracts for the Clones project - Automated reward distribution system with 10% platform fees.

## 🚀 Features

- **Automated Reward Distribution**: Reward pool system with farmer-initiated withdrawals
- **Platform Fees**: 10% automatically deducted from each reward
- **Multi-Token Support**: USDC, CLONES and other supported tokens
- **Enhanced Security**: Protection against replay attacks with nonces
- **Emergency Features**: Emergency pause system
- **Administrative Management**: Platform fee updates

## 📁 Project Structure

```
clones-solana-programs/
├── programs/                    # Solana smart contracts
│   ├── reward-pool/            # Reward distribution program
│   └── shared/                 # Shared modules
├── client/                     # TypeScript client for program interaction
├── tests/                      # Smart contract tests
├── scripts/                    # Deployment scripts and utilities
├── docs/                       # Technical documentation
└── examples/                   # Usage examples
```

## 🛠️ Technologies

- **Solana Program Framework**: Native Solana smart contracts
- **TypeScript**: Client and tests
- **Anchor**: Development framework (optional)
- **Jest**: Unit testing
- **ESLint + Prettier**: Code quality

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/clones-sol/clones-solana-programs.git
cd clones-solana-programs

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

## 🔧 Configuration

Create a `.env` file based on `.env.example`:

```env
# Solana Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Deployment Keys
DEPLOYER_KEYPAIR_PATH=~/.config/solana/id.json

# Programs
REWARD_POOL_PROGRAM_ID=your_program_id_here
```

## 📦 Deployment

```bash
# Build programs
npm run build

# Deploy to devnet
npm run deploy:devnet

# Deploy to mainnet
npm run deploy:mainnet
```

## 🧪 Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Tests with coverage
npm run test:coverage
```

## 📚 Documentation

- [Smart Contract Architecture](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api.md)
- [Security](docs/security.md)

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Useful Links

- [Solana Documentation](https://docs.solana.com/)
- [Solana Program Framework](https://docs.solana.com/developing/programming-model/overview)
- [Clones Backend Project](https://github.com/clones-sol/backend)