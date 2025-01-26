module 0x0::IBT {
    use sui::coin::{Self, TreasuryCap};
    use sui::event;

    public struct IBT has drop {}

    public struct BridgeAuth has key {
        id: object::UID,
        treasury_cap: TreasuryCap<IBT>,
        admin: address
    }

    public struct MintEvent has copy, drop {
        recipient: address,
        amount: u64
    }

    public struct BurnEvent has copy, drop {
        burner: address,
        amount: u64
    }

    public struct BridgeEvent has copy, drop {
        sui_address: address,
        amount: u64,
        eth_address: vector<u8>, 
    }

    public entry fun burn_and_bridge(
        auth: &mut BridgeAuth,
        mut coin_to_burn: coin::Coin<IBT>, // coin_to_burn is mutable
        eth_address: vector<u8>,       
        amount: u64,                   
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let coin_balance = coin::value(&coin_to_burn);

        // verifying the coin has enough balance to burn
        assert!(coin_balance >= amount, E_INSUFFICIENT_BALANCE);

        // splitting for burning specified amount
        let coin_to_burn_split = coin::split(&mut coin_to_burn, amount, ctx);

        // burning
        coin::burn(&mut auth.treasury_cap, coin_to_burn_split);

        // transfer
        transfer::public_transfer(coin_to_burn, sender);

        event::emit(BridgeEvent {
            sui_address: sender,
            amount,
            eth_address,
        });
    }

    const E_NOT_AUTHORIZED: u64 = 0;
    const E_INSUFFICIENT_BALANCE: u64 = 1;

    // initializing IBT token
    fun init(witness: IBT, ctx: &mut tx_context::TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, 
            b"IBT", 
            b"Inter Blockchain Token", 
            b"A token that can be bridged between chains", 
            option::none(), 
            ctx
        );

        transfer::public_freeze_object(metadata);

        let sender = tx_context::sender(ctx);
        transfer::transfer(BridgeAuth {
            id: object::new(ctx),
            treasury_cap,
            admin: sender
        }, sender);
    }

    // minting
    public entry fun mint(
        auth: &mut BridgeAuth,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == auth.admin, E_NOT_AUTHORIZED); // only callable by admin

        let minted_coin = coin::mint(&mut auth.treasury_cap, amount, ctx);
        transfer::public_transfer(minted_coin, recipient);

        event::emit(MintEvent {
            recipient,
            amount
        });
    }

    // burning
    public entry fun burn(
        auth: &mut BridgeAuth,
        amount: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == auth.admin, E_NOT_AUTHORIZED); // only callable by admin

        let coin_to_burn = coin::mint(&mut auth.treasury_cap, amount, ctx);
        coin::burn(&mut auth.treasury_cap, coin_to_burn);

        event::emit(BurnEvent {
            burner: tx_context::sender(ctx),
            amount
        });
    }

    public fun total_supply(auth: &BridgeAuth): u64 {
        coin::total_supply(&auth.treasury_cap)
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut tx_context::TxContext) {
        init(IBT {}, ctx)
    }
}