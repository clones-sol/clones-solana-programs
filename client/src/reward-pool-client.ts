import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { Buffer } from 'buffer';
import BN from 'bn.js';

// Types for instructions
export enum RewardPoolInstruction {
    InitializePool = 0,
    RecordReward = 1,
    WithdrawReward = 2,
    UpdatePlatformFee = 3,
    PausePool = 4,
    ResumePool = 5,
}

// Reward pool structure
export interface RewardPool {
    platformAuthority: PublicKey;
    rewardMint: PublicKey;
    platformTreasury: PublicKey;
    platformFeePercentage: number;
    totalRewardsDistributed: BN;
    totalPlatformFeesCollected: BN;
    isPaused: boolean;
    bumpSeed: number;
}

// Structure for pending rewards
export interface PendingReward {
    farmerPubkey: PublicKey;
    amount: BN;
    taskId: string;
    recordedAt: BN;
    isWithdrawn: boolean;
}

// Structure for withdrawal history
export interface WithdrawalRecord {
    farmerPubkey: PublicKey;
    amount: BN;
    nonce: BN;
    withdrawnAt: BN;
}

// Client errors
export class RewardPoolClientError extends Error {
    constructor(message: string, public code?: number) {
        super(message);
        this.name = 'RewardPoolClientError';
    }
}

// Reward pool client
export class RewardPoolClient {
    private connection: Connection;
    private programId: PublicKey;

    constructor(connection: Connection, programId: PublicKey) {
        this.connection = connection;
        this.programId = programId;
    }

    /**
     * Creates an instruction to initialize a reward pool
     */
    createInitializePoolInstruction(
        platformAuthority: PublicKey,
        poolAccount: PublicKey,
        rewardMint: PublicKey,
        platformTreasury: PublicKey,
        platformFeePercentage: number,
    ): TransactionInstruction {
        const data = Buffer.alloc(1 + 1); // instruction + platform_fee_percentage
        data.writeUInt8(RewardPoolInstruction.InitializePool, 0);
        data.writeUInt8(platformFeePercentage, 1);

        return new TransactionInstruction({
            keys: [
                { pubkey: platformAuthority, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
                { pubkey: rewardMint, isSigner: false, isWritable: false },
                { pubkey: platformTreasury, isSigner: false, isWritable: true },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Creates an instruction to record a reward
     */
    createRecordRewardInstruction(
        platformAuthority: PublicKey,
        poolAccount: PublicKey,
        platformTreasury: PublicKey,
        farmerRewardAccount: PublicKey,
        rewardMint: PublicKey,
        amount: BN,
        farmerPubkey: PublicKey,
        taskId: string,
    ): TransactionInstruction {
        const taskIdBuffer = Buffer.from(taskId, 'utf8');
        const data = Buffer.alloc(1 + 8 + 32 + 4 + taskIdBuffer.length);
        let offset = 0;

        data.writeUInt8(RewardPoolInstruction.RecordReward, offset);
        offset += 1;

        amount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
        offset += 8;

        farmerPubkey.toBuffer().copy(data, offset);
        offset += 32;

        data.writeUInt32LE(taskIdBuffer.length, offset);
        offset += 4;

        taskIdBuffer.copy(data, offset);

        return new TransactionInstruction({
            keys: [
                { pubkey: platformAuthority, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
                { pubkey: platformTreasury, isSigner: false, isWritable: true },
                { pubkey: farmerRewardAccount, isSigner: false, isWritable: true },
                { pubkey: rewardMint, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Creates an instruction to withdraw rewards
     */
    createWithdrawRewardInstruction(
        farmer: PublicKey,
        poolAccount: PublicKey,
        farmerRewardAccount: PublicKey,
        farmerDestinationAccount: PublicKey,
        rewardMint: PublicKey,
        amount: BN,
        nonce: BN,
    ): TransactionInstruction {
        const data = Buffer.alloc(1 + 8 + 8); // instruction + amount + nonce
        let offset = 0;

        data.writeUInt8(RewardPoolInstruction.WithdrawReward, offset);
        offset += 1;

        amount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
        offset += 8;

        nonce.toArrayLike(Buffer, 'le', 8).copy(data, offset);

        return new TransactionInstruction({
            keys: [
                { pubkey: farmer, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
                { pubkey: farmerRewardAccount, isSigner: false, isWritable: true },
                { pubkey: farmerDestinationAccount, isSigner: false, isWritable: true },
                { pubkey: rewardMint, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Creates an instruction to update platform fees
     */
    createUpdatePlatformFeeInstruction(
        platformAuthority: PublicKey,
        poolAccount: PublicKey,
        newFeePercentage: number,
    ): TransactionInstruction {
        const data = Buffer.alloc(1 + 1); // instruction + new_fee_percentage
        data.writeUInt8(RewardPoolInstruction.UpdatePlatformFee, 0);
        data.writeUInt8(newFeePercentage, 1);

        return new TransactionInstruction({
            keys: [
                { pubkey: platformAuthority, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Creates an instruction to pause the pool
     */
    createPausePoolInstruction(
        platformAuthority: PublicKey,
        poolAccount: PublicKey,
    ): TransactionInstruction {
        const data = Buffer.alloc(1);
        data.writeUInt8(RewardPoolInstruction.PausePool, 0);

        return new TransactionInstruction({
            keys: [
                { pubkey: platformAuthority, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Creates an instruction to resume the pool
     */
    createResumePoolInstruction(
        platformAuthority: PublicKey,
        poolAccount: PublicKey,
    ): TransactionInstruction {
        const data = Buffer.alloc(1);
        data.writeUInt8(RewardPoolInstruction.ResumePool, 0);

        return new TransactionInstruction({
            keys: [
                { pubkey: platformAuthority, isSigner: true, isWritable: false },
                { pubkey: poolAccount, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Initializes a reward pool
     */
    async initializePool(
        payer: Keypair,
        platformAuthority: Keypair,
        poolAccount: Keypair,
        rewardMint: PublicKey,
        platformTreasury: PublicKey,
        platformFeePercentage: number,
    ): Promise<string> {
        const transaction = new Transaction();

        // Pool initialization instruction
        const initInstruction = this.createInitializePoolInstruction(
            platformAuthority.publicKey,
            poolAccount.publicKey,
            rewardMint,
            platformTreasury,
            platformFeePercentage,
        );

        transaction.add(initInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [payer, platformAuthority, poolAccount],
        );
    }

    /**
     * Records a reward for a farmer
     */
    async recordReward(
        platformAuthority: Keypair,
        poolAccount: PublicKey,
        platformTreasury: PublicKey,
        rewardMint: PublicKey,
        amount: BN,
        farmerPubkey: PublicKey,
        taskId: string,
    ): Promise<string> {
        const transaction = new Transaction();

        // Get farmer's reward account address
        const farmerRewardAccount = await getAssociatedTokenAddress(
            rewardMint,
            farmerPubkey,
        );

        // Check if reward account exists
        const accountInfo = await this.connection.getAccountInfo(farmerRewardAccount);
        if (!accountInfo) {
            // Create ATA account if it doesn't exist
            const createAtaInstruction = createAssociatedTokenAccountInstruction(
                platformAuthority.publicKey,
                farmerRewardAccount,
                farmerPubkey,
                rewardMint,
            );
            transaction.add(createAtaInstruction);
        }

        // Reward recording instruction
        const recordInstruction = this.createRecordRewardInstruction(
            platformAuthority.publicKey,
            poolAccount,
            platformTreasury,
            farmerRewardAccount,
            rewardMint,
            amount,
            farmerPubkey,
            taskId,
        );

        transaction.add(recordInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [platformAuthority],
        );
    }

    /**
     * Allows a farmer to withdraw their rewards
     */
    async withdrawReward(
        farmer: Keypair,
        poolAccount: PublicKey,
        rewardMint: PublicKey,
        amount: BN,
        nonce: BN,
    ): Promise<string> {
        const transaction = new Transaction();

        // Get farmer's reward account address
        const farmerRewardAccount = await getAssociatedTokenAddress(
            rewardMint,
            farmer.publicKey,
        );

        // Get farmer's destination account address
        const farmerDestinationAccount = await getAssociatedTokenAddress(
            rewardMint,
            farmer.publicKey,
        );

        // Withdrawal instruction
        const withdrawInstruction = this.createWithdrawRewardInstruction(
            farmer.publicKey,
            poolAccount,
            farmerRewardAccount,
            farmerDestinationAccount,
            rewardMint,
            amount,
            nonce,
        );

        transaction.add(withdrawInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [farmer],
        );
    }

    /**
     * Updates platform fees
     */
    async updatePlatformFee(
        platformAuthority: Keypair,
        poolAccount: PublicKey,
        newFeePercentage: number,
    ): Promise<string> {
        const transaction = new Transaction();

        const updateFeeInstruction = this.createUpdatePlatformFeeInstruction(
            platformAuthority.publicKey,
            poolAccount,
            newFeePercentage,
        );

        transaction.add(updateFeeInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [platformAuthority],
        );
    }

    /**
     * Pauses the pool
     */
    async pausePool(
        platformAuthority: Keypair,
        poolAccount: PublicKey,
    ): Promise<string> {
        const transaction = new Transaction();

        const pauseInstruction = this.createPausePoolInstruction(
            platformAuthority.publicKey,
            poolAccount,
        );

        transaction.add(pauseInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [platformAuthority],
        );
    }

    /**
     * Resumes the pool
     */
    async resumePool(
        platformAuthority: Keypair,
        poolAccount: PublicKey,
    ): Promise<string> {
        const transaction = new Transaction();

        const resumeInstruction = this.createResumePoolInstruction(
            platformAuthority.publicKey,
            poolAccount,
        );

        transaction.add(resumeInstruction);

        return await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [platformAuthority],
        );
    }

    /**
     * Retrieves pool data
     */
    async getPoolData(poolAccount: PublicKey): Promise<RewardPool | null> {
        try {
            const accountInfo = await this.connection.getAccountInfo(poolAccount);
            if (!accountInfo) {
                return null;
            }

            // Deserialize pool data
            // Note: This is a simplified implementation, in production you would
            // use an appropriate deserialization library
            const data = accountInfo.data;

            // Simplified structure for example
            const pool: RewardPool = {
                platformAuthority: new PublicKey(data.slice(0, 32)),
                rewardMint: new PublicKey(data.slice(32, 64)),
                platformTreasury: new PublicKey(data.slice(64, 96)),
                platformFeePercentage: data[96] ?? 0,
                totalRewardsDistributed: new BN(data.slice(97, 105), 'le'),
                totalPlatformFeesCollected: new BN(data.slice(105, 113), 'le'),
                isPaused: data[113] === 1,
                bumpSeed: data[114] ?? 0,
            };

            return pool;
        } catch (error) {
            throw new RewardPoolClientError(`Error retrieving pool data: ${error}`);
        }
    }

    /**
     * Retrieves a farmer's reward balance
     */
    async getFarmerRewardBalance(
        farmerPubkey: PublicKey,
        rewardMint: PublicKey,
    ): Promise<BN> {
        try {
            const farmerRewardAccount = await getAssociatedTokenAddress(
                rewardMint,
                farmerPubkey,
            );

            const accountInfo = await this.connection.getAccountInfo(farmerRewardAccount);
            if (!accountInfo) {
                return new BN(0);
            }

            // Deserialize token account balance
            const balance = new BN(accountInfo.data.slice(64, 72), 'le');
            return balance;
        } catch (error) {
            throw new RewardPoolClientError(`Error retrieving balance: ${error}`);
        }
    }
}
