use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token::{
    instruction as token_instruction,
    state::{Account as TokenAccount, Mint},
};

// Program entry point
entrypoint!(process_instruction);

// Constants
pub const PLATFORM_FEE_PERCENTAGE: u8 = 10; // 10%
pub const MINIMUM_WITHDRAWAL_AMOUNT: u64 = 1000; // 0.001 tokens

// Program instructions
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum RewardPoolInstruction {
    /// Initializes a new reward pool
    /// Accounts:
    /// 0. `[signer]` - Platform authority
    /// 1. `[writable]` - Reward pool account
    /// 2. `[]` - Reward token mint
    /// 3. `[writable]` - Platform treasury account
    /// 4. `[]` - Rent sysvar
    /// 5. `[]` - System program
    /// 6. `[]` - Token program
    /// 7. `[]` - Associated token account program
    InitializePool { platform_fee_percentage: u8 },

    /// Records a reward in the pool
    /// Accounts:
    /// 0. `[signer]` - Platform authority
    /// 1. `[writable]` - Reward pool account
    /// 2. `[writable]` - Platform treasury account
    /// 3. `[writable]` - Farmer's reward account
    /// 4. `[]` - Token mint
    /// 5. `[]` - Token program
    /// 6. `[]` - Associated token account program
    RecordReward {
        amount: u64,
        farmer_pubkey: Pubkey,
        task_id: String,
    },

    /// Allows a farmer to withdraw their rewards
    /// Accounts:
    /// 0. `[signer]` - Farmer who withdraws
    /// 1. `[writable]` - Reward pool account
    /// 2. `[writable]` - Farmer's reward account
    /// 3. `[writable]` - Farmer's destination account
    /// 4. `[]` - Token mint
    /// 5. `[]` - Token program
    /// 6. `[]` - Associated token account program
    WithdrawReward { amount: u64, nonce: u64 },

    /// Updates platform fees (admin only)
    /// Accounts:
    /// 0. `[signer]` - Platform authority
    /// 1. `[writable]` - Reward pool account
    UpdatePlatformFee { new_fee_percentage: u8 },

    /// Pauses the pool (admin only)
    /// Accounts:
    /// 0. `[signer]` - Platform authority
    /// 1. `[writable]` - Reward pool account
    PausePool,

    /// Resumes the pool (admin only)
    /// Accounts:
    /// 0. `[signer]` - Platform authority
    /// 1. `[writable]` - Reward pool account
    ResumePool,
}

// Reward pool structure
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RewardPool {
    pub platform_authority: Pubkey,
    pub reward_mint: Pubkey,
    pub platform_treasury: Pubkey,
    pub platform_fee_percentage: u8,
    pub total_rewards_distributed: u64,
    pub total_platform_fees_collected: u64,
    pub is_paused: bool,
    pub bump_seed: u8,
}

// Structure for pending rewards
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PendingReward {
    pub farmer_pubkey: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub recorded_at: i64,
    pub is_withdrawn: bool,
}

// Structure for withdrawal history
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct WithdrawalRecord {
    pub farmer_pubkey: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub withdrawn_at: i64,
}

// Program errors
#[derive(thiserror::Error, Debug, Copy, Clone)]
pub enum RewardPoolError {
    #[error("Pool already initialized")]
    PoolAlreadyInitialized,
    #[error("Pool not initialized")]
    PoolNotInitialized,
    #[error("Invalid authority")]
    InvalidAuthority,
    #[error("Insufficient amount")]
    InsufficientAmount,
    #[error("Pool paused")]
    PoolPaused,
    #[error("Invalid nonce")]
    InvalidNonce,
    #[error("Invalid platform fee")]
    InvalidPlatformFee,
    #[error("Invalid treasury account")]
    InvalidTreasuryAccount,
}

impl From<RewardPoolError> for ProgramError {
    fn from(e: RewardPoolError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// Main instruction processing function
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = RewardPoolInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        RewardPoolInstruction::InitializePool {
            platform_fee_percentage,
        } => {
            msg!("Instruction: InitializePool");
            process_initialize_pool(program_id, accounts, platform_fee_percentage)
        }
        RewardPoolInstruction::RecordReward {
            amount,
            farmer_pubkey,
            task_id,
        } => {
            msg!("Instruction: RecordReward");
            process_record_reward(program_id, accounts, amount, farmer_pubkey, task_id)
        }
        RewardPoolInstruction::WithdrawReward { amount, nonce } => {
            msg!("Instruction: WithdrawReward");
            process_withdraw_reward(program_id, accounts, amount, nonce)
        }
        RewardPoolInstruction::UpdatePlatformFee { new_fee_percentage } => {
            msg!("Instruction: UpdatePlatformFee");
            process_update_platform_fee(program_id, accounts, new_fee_percentage)
        }
        RewardPoolInstruction::PausePool => {
            msg!("Instruction: PausePool");
            process_pause_pool(program_id, accounts)
        }
        RewardPoolInstruction::ResumePool => {
            msg!("Instruction: ResumePool");
            process_resume_pool(program_id, accounts)
        }
    }
}

// Pool initialization
fn process_initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    platform_fee_percentage: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let platform_authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let reward_mint_info = next_account_info(account_info_iter)?;
    let platform_treasury_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let ata_program_info = next_account_info(account_info_iter)?;

    // Validations
    if !platform_authority_info.is_signer {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    if platform_fee_percentage > 100 {
        return Err(RewardPoolError::InvalidPlatformFee.into());
    }

    // Check that pool is not already initialized
    if pool_info.data_is_empty() {
        // Create pool account
        let rent = Rent::from_account_info(rent_info)?;
        let space = std::mem::size_of::<RewardPool>();
        let lamports = rent.minimum_balance(space);

        let create_account_ix = system_instruction::create_account(
            platform_authority_info.key,
            pool_info.key,
            lamports,
            space as u64,
            program_id,
        );

        solana_program::program::invoke(
            &create_account_ix,
            &[
                platform_authority_info.clone(),
                pool_info.clone(),
                system_program_info.clone(),
            ],
        )?;
    }

    // Initialize pool
    let mut pool_data = RewardPool {
        platform_authority: *platform_authority_info.key,
        reward_mint: *reward_mint_info.key,
        platform_treasury: *platform_treasury_info.key,
        platform_fee_percentage,
        total_rewards_distributed: 0,
        total_platform_fees_collected: 0,
        is_paused: false,
        bump_seed: 0, // Will be calculated if needed
    };

    pool_data.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Pool initialized successfully");
    Ok(())
}

// Recording a reward
fn process_record_reward(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    farmer_pubkey: Pubkey,
    task_id: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let platform_authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let platform_treasury_info = next_account_info(account_info_iter)?;
    let farmer_reward_account_info = next_account_info(account_info_iter)?;
    let reward_mint_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let ata_program_info = next_account_info(account_info_iter)?;

    // Validations
    if !platform_authority_info.is_signer {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    // Load pool
    let mut pool_data = RewardPool::try_from_slice(&pool_info.data.borrow())?;

    if pool_data.is_paused {
        return Err(RewardPoolError::PoolPaused.into());
    }

    if pool_data.platform_authority != *platform_authority_info.key {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    // Calculate platform fees
    let platform_fee = (amount * pool_data.platform_fee_percentage as u64) / 100;
    let farmer_amount = amount - platform_fee;

    // Update pool statistics
    pool_data.total_rewards_distributed += farmer_amount;
    pool_data.total_platform_fees_collected += platform_fee;

    // Save pool
    pool_data.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    // Create or update farmer's reward account
    if farmer_reward_account_info.data_is_empty() {
        // Create ATA account for farmer
        let create_ata_ix =
            spl_associated_token_account::instruction::create_associated_token_account(
                platform_authority_info.key,
                &farmer_pubkey,
                &reward_mint_info.key,
                &token_program_info.key,
            );

        solana_program::program::invoke(
            &create_ata_ix,
            &[
                platform_authority_info.clone(),
                farmer_reward_account_info.clone(),
                reward_mint_info.clone(),
                token_program_info.clone(),
                ata_program_info.clone(),
            ],
        )?;
    }

    // Transfer tokens to farmer's reward account
    let transfer_ix = token_instruction::transfer(
        token_program_info.key,
        platform_treasury_info.key,
        farmer_reward_account_info.key,
        platform_authority_info.key,
        &[],
        farmer_amount,
    )?;

    solana_program::program::invoke(
        &transfer_ix,
        &[
            platform_treasury_info.clone(),
            farmer_reward_account_info.clone(),
            platform_authority_info.clone(),
            token_program_info.clone(),
        ],
    )?;

    msg!(
        "Reward recorded: {} tokens for farmer {}",
        farmer_amount,
        farmer_pubkey
    );
    Ok(())
}

// Withdrawing rewards
fn process_withdraw_reward(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    nonce: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let farmer_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let farmer_reward_account_info = next_account_info(account_info_iter)?;
    let farmer_destination_account_info = next_account_info(account_info_iter)?;
    let reward_mint_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let ata_program_info = next_account_info(account_info_iter)?;

    // Validations
    if !farmer_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load pool
    let pool_data = RewardPool::try_from_slice(&pool_info.data.borrow())?;

    if pool_data.is_paused {
        return Err(RewardPoolError::PoolPaused.into());
    }

    if amount < MINIMUM_WITHDRAWAL_AMOUNT {
        return Err(RewardPoolError::InsufficientAmount.into());
    }

    // Check reward account balance
    let token_account = TokenAccount::unpack(&farmer_reward_account_info.data.borrow())?;
    if token_account.amount < amount {
        return Err(RewardPoolError::InsufficientAmount.into());
    }

    // Transfer tokens to farmer's destination account
    let transfer_ix = token_instruction::transfer(
        token_program_info.key,
        farmer_reward_account_info.key,
        farmer_destination_account_info.key,
        farmer_info.key,
        &[],
        amount,
    )?;

    solana_program::program::invoke(
        &transfer_ix,
        &[
            farmer_reward_account_info.clone(),
            farmer_destination_account_info.clone(),
            farmer_info.clone(),
            token_program_info.clone(),
        ],
    )?;

    msg!(
        "Withdrawal completed: {} tokens for farmer {}",
        amount,
        farmer_info.key
    );
    Ok(())
}

// Updating platform fees
fn process_update_platform_fee(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_fee_percentage: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let platform_authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;

    // Validations
    if !platform_authority_info.is_signer {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    if new_fee_percentage > 100 {
        return Err(RewardPoolError::InvalidPlatformFee.into());
    }

    // Load and update pool
    let mut pool_data = RewardPool::try_from_slice(&pool_info.data.borrow())?;

    if pool_data.platform_authority != *platform_authority_info.key {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    pool_data.platform_fee_percentage = new_fee_percentage;
    pool_data.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Platform fees updated: {}%", new_fee_percentage);
    Ok(())
}

// Pausing the pool
fn process_pause_pool(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let platform_authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;

    // Validations
    if !platform_authority_info.is_signer {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    // Load and update pool
    let mut pool_data = RewardPool::try_from_slice(&pool_info.data.borrow())?;

    if pool_data.platform_authority != *platform_authority_info.key {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    pool_data.is_paused = true;
    pool_data.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Pool paused");
    Ok(())
}

// Resuming the pool
fn process_resume_pool(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let platform_authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;

    // Validations
    if !platform_authority_info.is_signer {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    // Load and update pool
    let mut pool_data = RewardPool::try_from_slice(&pool_info.data.borrow())?;

    if pool_data.platform_authority != *platform_authority_info.key {
        return Err(RewardPoolError::InvalidAuthority.into());
    }

    pool_data.is_paused = false;
    pool_data.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Pool resumed");
    Ok(())
}
