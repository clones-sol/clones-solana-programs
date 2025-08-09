import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { RewardPoolClient, RewardPoolClientError } from '../../client/src/reward-pool-client';
import BN from 'bn.js';

// Mock Solana connection
const mockConnection = {
    getAccountInfo: jest.fn(),
    getBalance: jest.fn(),
} as unknown as Connection;

describe('RewardPoolClient', () => {
    let client: RewardPoolClient;
    let programId: PublicKey;
    let platformAuthority: Keypair;
    let poolAccount: Keypair;
    let rewardMint: PublicKey;
    let platformTreasury: PublicKey;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create test instances
        programId = new PublicKey('11111111111111111111111111111111');
        platformAuthority = Keypair.generate();
        poolAccount = Keypair.generate();
        rewardMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
        platformTreasury = new PublicKey('22222222222222222222222222222222');

        client = new RewardPoolClient(mockConnection, programId);
    });

    describe('createInitializePoolInstruction', () => {
        it('should create a valid initialization instruction', () => {
            const instruction = client.createInitializePoolInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey,
                rewardMint,
                platformTreasury,
                10
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(8);
            expect(instruction.data).toHaveLength(2);
            expect(instruction.data[0]).toBe(0); // InitializePool instruction
            expect(instruction.data[1]).toBe(10); // platform_fee_percentage
        });

        it('should include the correct keys in the instruction', () => {
            const instruction = client.createInitializePoolInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey,
                rewardMint,
                platformTreasury,
                10
            );

            const keys = instruction.keys;

            expect(keys[0]?.pubkey).toEqual(platformAuthority.publicKey);
            expect(keys[0]?.isSigner).toBe(true);
            expect(keys[0]?.isWritable).toBe(false);

            expect(keys[1]?.pubkey).toEqual(poolAccount.publicKey);
            expect(keys[1]?.isSigner).toBe(false);
            expect(keys[1]?.isWritable).toBe(true);
        });
    });

    describe('createRecordRewardInstruction', () => {
        it('should create a valid recording instruction', () => {
            const farmerPubkey = new PublicKey('33333333333333333333333333333333');
            const amount = new BN(1000000); // 1 USDC
            const taskId = 'test-task-001';

            const instruction = client.createRecordRewardInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey,
                platformTreasury,
                new PublicKey('44444444444444444444444444444444'), // farmer reward account
                rewardMint,
                amount,
                farmerPubkey,
                taskId
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(7);
            expect(instruction.data[0]).toBe(1); // RecordReward instruction
        });

        it('should serialize data correctly', () => {
            const farmerPubkey = new PublicKey('33333333333333333333333333333333');
            const amount = new BN(1000000);
            const taskId = 'test-task-001';

            const instruction = client.createRecordRewardInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey,
                platformTreasury,
                new PublicKey('44444444444444444444444444444444'),
                rewardMint,
                amount,
                farmerPubkey,
                taskId
            );

            // Verify data is correctly serialized
            const data = instruction.data;
            expect(data.readUInt8(0)).toBe(1); // RecordReward
            expect(new BN(data.slice(1, 9), 'le')).toEqual(amount);
        });
    });

    describe('createWithdrawRewardInstruction', () => {
        it('should create a valid withdrawal instruction', () => {
            const farmer = new PublicKey('55555555555555555555555555555555');
            const amount = new BN(500000); // 0.5 USDC
            const nonce = new BN(12345);

            const instruction = client.createWithdrawRewardInstruction(
                farmer,
                poolAccount.publicKey,
                new PublicKey('66666666666666666666666666666666'), // farmer reward account
                new PublicKey('77777777777777777777777777777777'), // farmer destination account
                rewardMint,
                amount,
                nonce
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(7);
            expect(instruction.data[0]).toBe(2); // WithdrawReward instruction
        });
    });

    describe('createUpdatePlatformFeeInstruction', () => {
        it('should create a valid fee update instruction', () => {
            const newFeePercentage = 15;

            const instruction = client.createUpdatePlatformFeeInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey,
                newFeePercentage
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(2);
            expect(instruction.data[0]).toBe(3); // UpdatePlatformFee instruction
            expect(instruction.data[1]).toBe(newFeePercentage);
        });
    });

    describe('createPausePoolInstruction', () => {
        it('should create a valid pause instruction', () => {
            const instruction = client.createPausePoolInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(2);
            expect(instruction.data[0]).toBe(4); // PausePool instruction
        });
    });

    describe('createResumePoolInstruction', () => {
        it('should create a valid resume instruction', () => {
            const instruction = client.createResumePoolInstruction(
                platformAuthority.publicKey,
                poolAccount.publicKey
            );

            expect(instruction.programId).toEqual(programId);
            expect(instruction.keys).toHaveLength(2);
            expect(instruction.data[0]).toBe(5); // ResumePool instruction
        });
    });

    describe('getPoolData', () => {
        it('should return null if account does not exist', async () => {
            (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);

            const result = await client.getPoolData(poolAccount.publicKey);

            expect(result).toBeNull();
        });

        it('should deserialize pool data correctly', async () => {
            // Mock pool data
            const mockPoolData = Buffer.alloc(115);

            // Platform authority (32 bytes)
            platformAuthority.publicKey.toBuffer().copy(mockPoolData, 0);

            // Reward mint (32 bytes)
            rewardMint.toBuffer().copy(mockPoolData, 32);

            // Platform treasury (32 bytes)
            platformTreasury.toBuffer().copy(mockPoolData, 64);

            // Platform fee percentage (1 byte)
            mockPoolData[96] = 10;

            // Total rewards distributed (8 bytes)
            new BN(1000000).toArrayLike(Buffer, 'le', 8).copy(mockPoolData, 97);

            // Total platform fees collected (8 bytes)
            new BN(100000).toArrayLike(Buffer, 'le', 8).copy(mockPoolData, 105);

            // Is paused (1 byte)
            mockPoolData[113] = 0;

            // Bump seed (1 byte)
            mockPoolData[114] = 0;

            (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue({
                data: mockPoolData,
            });

            const result = await client.getPoolData(poolAccount.publicKey);

            expect(result).not.toBeNull();
            expect(result!.platformAuthority).toEqual(platformAuthority.publicKey);
            expect(result!.rewardMint).toEqual(rewardMint);
            expect(result!.platformTreasury).toEqual(platformTreasury);
            expect(result!.platformFeePercentage).toBe(10);
            expect(result!.totalRewardsDistributed.toString()).toBe('1000000');
            expect(result!.totalPlatformFeesCollected.toString()).toBe('100000');
            expect(result!.isPaused).toBe(false);
        });

        it('should handle deserialization errors', async () => {
            (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue({
                data: Buffer.alloc(10), // Invalid data
            });

            await expect(client.getPoolData(poolAccount.publicKey)).rejects.toThrow(RewardPoolClientError);
        });
    });

    describe('getFarmerRewardBalance', () => {
        it('should return 0 if account does not exist', async () => {
            (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);

            const result = await client.getFarmerRewardBalance(
                new PublicKey('88888888888888888888888888888888'),
                rewardMint
            );

            expect(result.toString()).toBe('0');
        });

        it('should return correct balance', async () => {
            // Mock token account data
            const mockTokenData = Buffer.alloc(165);

            // Balance (8 bytes at offset 64)
            new BN(500000).toArrayLike(Buffer, 'le', 8).copy(mockTokenData, 64);

            (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue({
                data: mockTokenData,
            });

            const result = await client.getFarmerRewardBalance(
                new PublicKey('88888888888888888888888888888888'),
                rewardMint
            );

            expect(result.toString()).toBe('500000');
        });
    });
});
