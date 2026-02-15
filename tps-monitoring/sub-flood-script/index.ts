// === SUB-FLOOD LOAD TESTING SCRIPT ===
// Advanced multi-user blockchain load testing tool
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import minimist from 'minimist'

// === GENERATE USER SEED ===
// Create unique seed for each user account (user0000, user0001, etc.)
function seedFromNum(seed: number): string {
    return '//user//' + ("0000" + seed).slice(-4);
}

// === GET BLOCK STATISTICS ===
// Extract transaction count and timestamp from a blockchain block
async function getBlockStats(api: ApiPromise, hash?: any): Promise<any> {
    // Get block data (current block if no hash provided)
    const signedBlock = hash ? await api.rpc.chain.getBlock(hash) : await api.rpc.chain.getBlock();

    // === EXTRACT TIMESTAMP FROM BLOCK ===
    // Find timestamp extrinsic in block
    let timestamp = signedBlock.block.extrinsics.find(
        ({ method: { method, section } }: any) => section === 'timestamp' && method === 'set'
    )!.method.args[0].toString();

    // Convert timestamp to Date object
    let date = new Date(+timestamp);

    // Return block statistics
    return {
        date,                                           // Block creation time
        transactions: signedBlock.block.extrinsics.length,  // Number of transactions
        parent: signedBlock.block.header.parentHash,    // Previous block hash
        blockNumber: signedBlock.block.header.number,   // Block number
    }
}

// === MAIN LOAD TESTING FUNCTION ===
async function run() {
    // === PARSE COMMAND LINE ARGUMENTS ===
    var argv = minimist(process.argv.slice(2));

    // Load testing configuration with defaults
    let TOTAL_TRANSACTIONS = argv.total_transactions ? argv.total_transactions : 25000;  // Total transactions to send
    let TPS = argv.scale ? argv.scale : 100;                      // Target transactions per second
    let TOTAL_THREADS = argv.total_threads ? argv.total_threads : 10;    // Number of parallel threads
    if (TPS < TOTAL_THREADS) TOTAL_THREADS = TPS;                 // Ensure threads don't exceed TPS
    let TOTAL_USERS = TPS;                                        // One user per TPS target
    let USERS_PER_THREAD = Math.ceil(TOTAL_USERS / TOTAL_THREADS); // Users distributed across threads
    let TOTAL_BATCHES = Math.ceil(TOTAL_TRANSACTIONS / TPS);      // Number of batches needed
    let TRANSACTION_PER_BATCH = Math.ceil(TPS / TOTAL_THREADS);   // Transactions per batch per thread
    let WS_URL = argv.url ? argv.url : "ws://localhost:9944";    // Blockchain node URL
    let TOKENS_TO_SEND = 1;                                       // Amount to transfer (1 unit)
    let MEASURE_FINALISATION = argv.finalization ? argv.finalization : false;  // Track finalization
    let FINALISATION_TIMEOUT = argv.finalization_timeout ? argv.finalization_timeout : 20000; // 20 seconds
    let FINALISATION_ATTEMPTS = argv.finalization_attempts ? argv.finalization_attempts : 5;

    console.log('🚀 Starting Sub-Flood with full functionality...')
    console.log('📡 Connecting to:', WS_URL)
    
    // === INITIALIZE BLOCKCHAIN CONNECTION ===
    // Wait for cryptographic functions to be ready
    await cryptoWaitReady()
    
    // Connect to blockchain node via WebSocket
    const provider = new WsProvider(WS_URL)
    const api = await ApiPromise.create({ provider })
    
    // Setup account keyring for sr25519 signature scheme
    const keyring = new Keyring({ type: 'sr25519' })

    // === PRE-FETCH NONCES FOR ALL USER ACCOUNTS ===
    // This prevents nonce conflicts during batch sending
    let nonces: number[] = [];
    console.log("Fetching nonces for accounts...");
    for (let i = 0; i <= TOTAL_USERS; i++) {
        // Generate user seed and create account
        let stringSeed = seedFromNum(i);
        let keys = keyring.addFromUri(stringSeed);
        
        // Get current nonce from blockchain for this account
        let accountInfo = await api.query.system.account(keys.address) as any;
        let nonce = accountInfo.nonce.toNumber();
        nonces.push(nonce);
    }
    console.log("All nonces fetched!");

    // === FUND ALL USER ACCOUNTS FROM ALICE ===
    // Users need funds to send transactions
    console.log("Endowing all users from Alice account...");
    let aliceKeyPair = keyring.addFromUri("//Alice");           // Alice account (has funds)
    let aliceNonce = await api.rpc.system.accountNextIndex(aliceKeyPair.address);  // Alice's nonce
    let keyPairs = new Map<number, any>();                      // Store all user keypairs
    console.log("Alice nonce is " + aliceNonce.toNumber());

    let finalized_transactions = 0;  // Counter for finalized funding transactions

    // === SEND FUNDS TO EACH USER ===
    for (let seed = 0; seed <= TOTAL_USERS; seed++) {
        // Create user account
        let keypair = keyring.addFromUri(seedFromNum(seed));
        keyPairs.set(seed, keypair);

        // === CALCULATE FUNDING AMOUNT ===
        // Must be greater than existential deposit to keep account alive
        let existentialDeposit = (api.consts.balances.existentialDeposit as any).toNumber();
        let transfer = api.tx.balances.transferKeepAlive(keypair.address, BigInt(existentialDeposit) * 10n);

        let receiverSeed = seedFromNum(seed);
        console.log(`Alice -> ${receiverSeed} (${keypair.address})`);

        // === SEND FUNDING TRANSACTION ===
        await transfer.signAndSend(aliceKeyPair, { 
            nonce: aliceNonce as any,  // Use Alice's current nonce
            tip: 1                     // Small tip for priority
        }, ({ status }) => {
            // Track when transaction is finalized
            if (status.isFinalized) {
                finalized_transactions++;
            }
        });
        
        // === UPDATE ALICE'S NONCE ===
        // Get fresh nonce for next funding transaction
        aliceNonce = await api.rpc.system.accountNextIndex(aliceKeyPair.address);
    }
    console.log("All users endowed from Alice account!");

    // === WAIT FOR FUNDING FINALIZATION ===
    console.log("Wait for transactions finalisation");
    await new Promise(r => setTimeout(r, FINALISATION_TIMEOUT));
    console.log(`Finalized transactions ${finalized_transactions}`);

    // === VERIFY ALL FUNDING COMPLETED ===
    if (finalized_transactions < TOTAL_USERS + 1) {
        throw Error(`Not all transactions finalized`);
    }

    // === SETUP LOAD TESTING ===
    console.log(`Starting to send ${TOTAL_TRANSACTIONS} transactions across ${TOTAL_THREADS} threads...`);
    let nextTime = new Date().getTime();      // Next batch send time
    let initialTime = new Date();             // Test start time
    
    // === SHARED MEMORY FOR THREAD COORDINATION ===
    // Track finalization across multiple threads
    const finalisationTime = new Uint32Array(new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
    finalisationTime[0] = 0;
    const finalisedTxs = new Uint16Array(new SharedArrayBuffer(Uint16Array.BYTES_PER_ELEMENT));
    finalisedTxs[0] = 0;

    let txCounter = 0;  // Total transactions sent

    // === MAIN LOAD TESTING LOOP ===
    // Send transactions in batches, one batch per second
    for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo++) {
        // === TIMING CONTROL ===
        // Wait until it's time to send next batch (1 second intervals)
        while (new Date().getTime() < nextTime) {
            await new Promise(r => setTimeout(r, 5));
        }
        nextTime = nextTime + 1000;  // Schedule next batch 1 second later
        
        var errors = [];
        console.log(`Starting batch #${batchNo}`);
        let batchPromises = new Array<Promise<number>>();

        // === CREATE TRANSACTIONS FOR THIS BATCH ===
        // Distribute transactions across threads
        for (let threadNo = 0; threadNo < TOTAL_THREADS; threadNo++) {
            for (let transactionNo = 0; transactionNo < TRANSACTION_PER_BATCH; transactionNo++) {
                // === CALCULATE USER FOR THIS TRANSACTION ===
                let userNo = threadNo * USERS_PER_THREAD + transactionNo;
                if (userNo >= TOTAL_USERS) break;        // Don't exceed user count
                if (!keyPairs.has(userNo)) continue;     // Skip if user doesn't exist
                
                let senderKeyPair = keyPairs.get(userNo);  // Get user's keypair

                // === CREATE TRANSACTION PROMISE ===
                // Each transaction runs asynchronously
                batchPromises.push(
                    new Promise<number>(async resolve => {
                        try {
                            // === GET CURRENT NONCE FOR THIS USER ===
                            let currentNonce = nonces[userNo];
                            
                            // === CREATE TRANSFER TRANSACTION ===
                            // Send 1 token back to Alice
                            let transfer = api.tx.balances.transferKeepAlive(aliceKeyPair.address, BigInt(TOKENS_TO_SEND));
                            
                            // === SEND TRANSACTION ===
                            await transfer.signAndSend(senderKeyPair, {
                                nonce: currentNonce,  // Use pre-fetched nonce
                                tip: 1               // Small tip for priority
                            }, ({ status }) => {
                                // === UPDATE NONCE AFTER SENDING ===
                                // Increment nonce for this user
                                nonces[userNo]++;
                                
                                // === TRACK FINALIZATION ===
                                if (status.isFinalized) {
                                    Atomics.add(finalisedTxs, 0, 1);  // Atomic increment
                                    let finalisationTimeCurrent = new Date().getTime() - initialTime.getTime();
                                    if (finalisationTimeCurrent > Atomics.load(finalisationTime, 0)) {
                                        Atomics.store(finalisationTime, 0, finalisationTimeCurrent);
                                    }
                                }
                            });
                            txCounter++;
                            resolve(1);  // Success
                        } catch (err: any) {
                            errors.push(err);
                            resolve(-1);  // Error
                        }
                    })
                );
            }
        }
        
        // === WAIT FOR ALL TRANSACTIONS IN BATCH TO COMPLETE ===
        await Promise.all(batchPromises);
        
        // === LOG ERRORS IF ANY ===
        if (errors.length > 0) {
            console.log(`${errors.length}/${TRANSACTION_PER_BATCH} errors sending transactions`);
        }
    }

    // === CALCULATE TEST RESULTS ===
    let finalTime = new Date();
    let diff = finalTime.getTime() - initialTime.getTime();  // Total test duration

    // === COUNT TRANSACTIONS IN BLOCKS ===
    // Walk backwards through blockchain to count our transactions
    var total_transactions = 0;
    var total_blocks = 0;
    var latest_block = await getBlockStats(api);
    console.log(`latest block: ${latest_block.date}`);
    console.log(`initial time: ${initialTime}`);
    
    let prunedFlag = false;
    
    // === TRAVERSE BLOCKS DURING TEST PERIOD ===
    for (; latest_block.date > initialTime; ) {
        try {
            // Get previous block
            latest_block = await getBlockStats(api, latest_block.parent);
        } catch(err: any) {
            console.log("Cannot retrieve block info with error: " + err.toString());
            console.log("Most probably the state is pruned already, stopping");
            prunedFlag = true;
            break;
        }
        
        // === COUNT TRANSACTIONS IN BLOCKS DURING TEST ===
        if (latest_block.date < finalTime) {
            console.log(`block number ${latest_block.blockNumber}: ${latest_block.transactions} transactions`);
            total_transactions += latest_block.transactions;
            total_blocks++;
        }
    }

    // === CALCULATE FINAL TPS ===
    let tps = (total_transactions * 1000) / diff;
    console.log(`TPS from ${total_blocks} blocks: ${tps}`);

    // === WAIT FOR TRANSACTION FINALIZATION (OPTIONAL) ===
    if (MEASURE_FINALISATION && !prunedFlag) {
        let break_condition = false;
        let attempt = 0;
        
        // === WAIT FOR ALL TRANSACTIONS TO FINALIZE ===
        while (!break_condition) {
            console.log(`Wait ${FINALISATION_TIMEOUT} ms for transactions finalisation, attempt ${attempt} out of ${FINALISATION_ATTEMPTS}`);
            await new Promise(r => setTimeout(r, FINALISATION_TIMEOUT));

            // === CHECK FINALIZATION PROGRESS ===
            if (Atomics.load(finalisedTxs, 0) < TOTAL_TRANSACTIONS) {
                if (attempt == FINALISATION_ATTEMPTS) {
                    // Time limit reached
                    break_condition = true;
                } else {
                    attempt++;
                }
            } else {
                // All transactions finalized
                break_condition = true;
            }
        }
        console.log(`Finalized ${Atomics.load(finalisedTxs, 0)} out of ${TOTAL_TRANSACTIONS} transactions, finalization time was ${Atomics.load(finalisationTime, 0)}`);
    }
}

// === RUN THE LOAD TEST ===
// Execute main function with error handling
run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});
