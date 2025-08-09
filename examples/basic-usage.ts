import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { RewardPoolClient } from '../client/src/reward-pool-client';
import BN from 'bn.js';

/**
 * Basic usage example of the reward pool client
 */
async function basicUsage() {
    console.log('🚀 Reward pool client usage example');

    // Connection configuration
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Program ID (to be replaced with real ID)
    const programId = new PublicKey('11111111111111111111111111111111');

    // Create client
    const client = new RewardPoolClient(connection, programId);

    // Create keypairs for example
    const platformAuthority = Keypair.generate();
    const poolAccount = Keypair.generate();
    const rewardMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
    const platformTreasury = new PublicKey('22222222222222222222222222222222');

    console.log('👑 Platform Authority:', platformAuthority.publicKey.toString());
    console.log('🏊 Pool Account:', poolAccount.publicKey.toString());
    console.log('🪙 Reward Mint:', rewardMint.toString());

    // Example 1: Create initialization instruction
    console.log('\n📝 Example 1: Creating initialization instruction');

    const initInstruction = client.createInitializePoolInstruction(
        platformAuthority.publicKey,
        poolAccount.publicKey,
        rewardMint,
        platformTreasury,
        10 // 10% platform fee
    );

    console.log('✅ Instruction created successfully');
    console.log('📊 Instruction size:', initInstruction.data.length, 'bytes');

    // Example 2: Create reward recording instruction
    console.log('\n📝 Example 2: Creating recording instruction');

    const farmerPubkey = new PublicKey('33333333333333333333333333333333');
    const amount = new BN(1000000); // 1 USDC (6 decimals)
    const taskId = 'task-001';

    const recordInstruction = client.createRecordRewardInstruction(
        platformAuthority.publicKey,
        poolAccount.publicKey,
        platformTreasury,
        new PublicKey('44444444444444444444444444444444'), // farmer reward account
        rewardMint,
        amount,
        farmerPubkey,
        taskId
    );

    console.log('✅ Instruction created successfully');
    console.log('💰 Amount:', amount.toString(), 'tokens');
    console.log('👨‍🌾 Farmer:', farmerPubkey.toString());
    console.log('📋 Task ID:', taskId);

    // Example 3: Create withdrawal instruction
    console.log('\n📝 Example 3: Creating withdrawal instruction');

    const withdrawAmount = new BN(500000); // 0.5 USDC
    const nonce = new BN(12345);

    const withdrawInstruction = client.createWithdrawRewardInstruction(
        farmerPubkey,
        poolAccount.publicKey,
        new PublicKey('55555555555555555555555555555555'), // farmer reward account
        new PublicKey('66666666666666666666666666666666'), // farmer destination account
        rewardMint,
        withdrawAmount,
        nonce
    );

    console.log('✅ Instruction created successfully');
    console.log('💰 Withdrawal amount:', withdrawAmount.toString(), 'tokens');
    console.log('🔢 Nonce:', nonce.toString());

    // Example 4: Create fee update instruction
    console.log('\n📝 Example 4: Creating fee update instruction');

    const newFeePercentage = 15; // 15%

    const updateFeeInstruction = client.createUpdatePlatformFeeInstruction(
        platformAuthority.publicKey,
        poolAccount.publicKey,
        newFeePercentage
    );

    console.log('✅ Instruction created successfully');
    console.log('💸 New fees:', newFeePercentage, '%');

    // Example 5: Pause/resume instructions
    console.log('\n📝 Example 5: Pool control instructions');

    const pauseInstruction = client.createPausePoolInstruction(
        platformAuthority.publicKey,
        poolAccount.publicKey
    );

    const resumeInstruction = client.createResumePoolInstruction(
        platformAuthority.publicKey,
        poolAccount.publicKey
    );

    console.log('✅ Pause/resume instructions created');

    console.log('\n🎉 Example completed successfully!');
}

/**
 * Advanced usage example with transaction simulation
 */
async function advancedUsage() {
    console.log('\n🚀 Advanced usage example');

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('11111111111111111111111111111111');
    const client = new RewardPoolClient(connection, programId);

    // Simulate pool data retrieval
    console.log('📊 Simulating pool data retrieval...');

    // Note: In a real environment, this data would come from the blockchain
    const mockPoolData = {
        platformAuthority: new PublicKey('11111111111111111111111111111111'),
        rewardMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        platformTreasury: new PublicKey('22222222222222222222222222222222'),
        platformFeePercentage: 10,
        totalRewardsDistributed: new BN(10000000), // 10 USDC
        totalPlatformFeesCollected: new BN(1000000), // 1 USDC
        isPaused: false,
        bumpSeed: 0,
    };

    console.log('✅ Pool data retrieved:');
    console.log('💰 Total distributed rewards:', mockPoolData.totalRewardsDistributed.toString());
    console.log('💸 Total collected fees:', mockPoolData.totalPlatformFeesCollected.toString());
    console.log('⏸️  Pool paused:', mockPoolData.isPaused);

    // Simulate farmer balance retrieval
    console.log('\n💰 Simulating farmer balance retrieval...');

    const farmerPubkey = new PublicKey('33333333333333333333333333333333');
    const rewardMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    // Note: In a real environment, this would retrieve the actual balance
    const mockBalance = new BN(2500000); // 2.5 USDC

    console.log('✅ Farmer balance retrieved:');
    console.log('👨‍🌾 Farmer:', farmerPubkey.toString());
    console.log('💰 Balance:', mockBalance.toString(), 'tokens');
    console.log('💵 Amount in USDC:', mockBalance.toNumber() / 1e6);

    console.log('\n🎉 Advanced example completed!');
}

/**
 * Error handling example
 */
async function errorHandlingExample() {
    console.log('\n🚨 Error handling example');

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('11111111111111111111111111111111');
    const client = new RewardPoolClient(connection, programId);

    try {
        // Simulate pool data retrieval error
        console.log('📊 Attempting to retrieve data from non-existent pool...');

        const poolAccount = new PublicKey('99999999999999999999999999999999');
        const poolData = await client.getPoolData(poolAccount);

        if (poolData === null) {
            console.log('⚠️  Pool not found (expected behavior)');
        }
    } catch (error) {
        console.log('❌ Error caught:', error.message);
    }

    try {
        // Simulate balance retrieval error
        console.log('\n💰 Attempting to retrieve balance from non-existent account...');

        const farmerPubkey = new PublicKey('88888888888888888888888888888888');
        const rewardMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

        const balance = await client.getFarmerRewardBalance(farmerPubkey, rewardMint);
        console.log('💰 Balance retrieved:', balance.toString());
    } catch (error) {
        console.log('❌ Error caught:', error.message);
    }

    console.log('\n🎉 Error handling example completed!');
}

// Run examples
async function runExamples() {
    try {
        await basicUsage();
        await advancedUsage();
        await errorHandlingExample();

        console.log('\n🎊 All examples executed successfully!');
    } catch (error) {
        console.error('❌ Error running examples:', error);
    }
}

// Export for use in other files
export { basicUsage, advancedUsage, errorHandlingExample, runExamples };

// Run if file is called directly
if (require.main === module) {
    runExamples();
}
