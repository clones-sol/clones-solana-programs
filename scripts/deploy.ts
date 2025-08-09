#!/usr/bin/env node

import { Command } from 'commander';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { RewardPoolClient } from '../client/src/reward-pool-client';
import BN from 'bn.js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name('deploy')
    .description('Solana smart contract deployment script')
    .version('1.0.0');

program
    .command('reward-pool')
    .description('Deploy reward pool program')
    .option('-n, --network <network>', 'Solana network (devnet/mainnet)', 'devnet')
    .option('-k, --keypair <path>', 'Path to keypair', process.env['DEPLOYER_KEYPAIR_PATH'] || '~/.config/solana/id.json')
    .action(async (options) => {
        try {
            console.log('🚀 Deploying reward pool program...');

            // Connection configuration
            const network = options.network;
            const rpcUrl = network === 'mainnet'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com';

            const connection = new Connection(rpcUrl, 'confirmed');

            // Load keypair
            const keypairPath = path.resolve(options.keypair.replace('~', process.env['HOME'] || ''));
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
            const deployerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

            console.log(`📡 Connecting to ${network}...`);
            console.log(`👤 Deployer: ${deployerKeypair.publicKey.toString()}`);

            // Check balance
            const balance = await connection.getBalance(deployerKeypair.publicKey);
            console.log(`💰 Balance: ${balance / 1e9} SOL`);

            if (balance < 2 * 1e9) { // 2 SOL minimum
                throw new Error('Insufficient balance for deployment');
            }

            // Program ID (to be replaced with real ID after deployment)
            const programId = new PublicKey(process.env['REWARD_POOL_PROGRAM_ID'] || '11111111111111111111111111111111');

            // Create client
            const client = new RewardPoolClient(connection, programId);

            // Create test keypairs
            const platformAuthority = Keypair.generate();
            const poolAccount = Keypair.generate();
            const rewardMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
            const platformTreasury = new PublicKey('11111111111111111111111111111111'); // To be replaced

            console.log('🔧 Initializing reward pool...');

            // Initialize pool
            const txSignature = await client.initializePool(
                deployerKeypair,
                platformAuthority,
                poolAccount,
                rewardMint,
                platformTreasury,
                10, // 10% platform fee
            );

            console.log('✅ Pool initialized successfully!');
            console.log(`📝 Transaction: ${txSignature}`);
            console.log(`🏊 Pool Account: ${poolAccount.publicKey.toString()}`);
            console.log(`👑 Platform Authority: ${platformAuthority.publicKey.toString()}`);

            // Save deployment information
            const deploymentInfo = {
                network,
                programId: programId.toString(),
                poolAccount: poolAccount.publicKey.toString(),
                platformAuthority: platformAuthority.publicKey.toString(),
                platformTreasury: platformTreasury.toString(),
                rewardMint: rewardMint.toString(),
                platformFeePercentage: 10,
                deployedAt: new Date().toISOString(),
                transactionSignature: txSignature,
            };

            const deploymentPath = path.join(process.cwd(), 'deployment.json');
            fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

            console.log('💾 Deployment information saved to deployment.json');

        } catch (error) {
            console.error('❌ Deployment error:', error);
            process.exit(1);
        }
    });

program
    .command('test')
    .description('Test deployed program')
    .option('-n, --network <network>', 'Solana network (devnet/mainnet)', 'devnet')
    .option('-k, --keypair <path>', 'Path to keypair', process.env['DEPLOYER_KEYPAIR_PATH'] || '~/.config/solana/id.json')
    .action(async (options) => {
        try {
            console.log('🧪 Testing reward pool program...');

            // Connection configuration
            const network = options.network;
            const rpcUrl = network === 'mainnet'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com';

            const connection = new Connection(rpcUrl, 'confirmed');

            // Load keypair
            const keypairPath = path.resolve(options.keypair.replace('~', process.env['HOME'] || ''));
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
            const deployerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

            // Load deployment information
            const deploymentPath = path.join(process.cwd(), 'deployment.json');
            if (!fs.existsSync(deploymentPath)) {
                throw new Error('deployment.json file not found. Deploy the program first.');
            }

            const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

            // Program ID
            const programId = new PublicKey(deploymentInfo.programId);
            const poolAccount = new PublicKey(deploymentInfo.poolAccount);
            const rewardMint = new PublicKey(deploymentInfo.rewardMint);
            const platformTreasury = new PublicKey(deploymentInfo.platformTreasury);

            // Create client
            const client = new RewardPoolClient(connection, programId);

            console.log('📊 Retrieving pool data...');

            // Retrieve pool data
            const poolData = await client.getPoolData(poolAccount);

            if (poolData) {
                console.log('✅ Pool found!');
                console.log(`👑 Authority: ${poolData.platformAuthority.toString()}`);
                console.log(`🪙 Mint: ${poolData.rewardMint.toString()}`);
                console.log(`💰 Distributed rewards: ${poolData.totalRewardsDistributed.toString()}`);
                console.log(`💸 Collected fees: ${poolData.totalPlatformFeesCollected.toString()}`);
                console.log(`⏸️  Paused: ${poolData.isPaused}`);
            } else {
                console.log('❌ Pool not found');
            }

            // Create test farmer
            const testFarmer = Keypair.generate();
            console.log(`👨‍🌾 Test farmer: ${testFarmer.publicKey.toString()}`);

            // Test reward recording
            console.log('🎁 Testing reward recording...');

            const testAmount = new BN(1000000); // 1 USDC (6 decimals)
            const testTaskId = 'test-task-001';

            const recordTx = await client.recordReward(
                deployerKeypair,
                poolAccount,
                platformTreasury,
                rewardMint,
                testAmount,
                testFarmer.publicKey,
                testTaskId,
            );

            console.log(`✅ Reward recorded: ${recordTx}`);

            // Check farmer balance
            const farmerBalance = await client.getFarmerRewardBalance(testFarmer.publicKey, rewardMint);
            console.log(`💰 Farmer balance: ${farmerBalance.toString()} (${farmerBalance.toNumber() / 1e6} USDC)`);

            console.log('🎉 Tests completed successfully!');

        } catch (error) {
            console.error('❌ Test error:', error);
            process.exit(1);
        }
    });

program.parse();
