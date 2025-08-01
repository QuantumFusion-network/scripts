import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import minimist from 'minimist'

function seedFromNum(seed: number): string {
    return '//user//' + ("0000" + seed).slice(-4);
}

async function getBlockStats(api: ApiPromise, hash?: any): Promise<any> {
    const signedBlock = hash ? await api.rpc.chain.getBlock(hash) : await api.rpc.chain.getBlock();

    // the hash for each extrinsic in the block
    let timestamp = signedBlock.block.extrinsics.find(
        ({ method: { method, section } }: any) => section === 'timestamp' && method === 'set'
    )!.method.args[0].toString();

    let date = new Date(+timestamp);

    return {
        date,
        transactions: signedBlock.block.extrinsics.length,
        parent: signedBlock.block.header.parentHash,
        blockNumber: signedBlock.block.header.number,
    }
}

async function run() {
    var argv = minimist(process.argv.slice(2));

    let TOTAL_TRANSACTIONS = argv.total_transactions ? argv.total_transactions : 25000;
    let TPS = argv.scale ? argv.scale : 100;
    let TOTAL_THREADS = argv.total_threads ? argv.total_threads : 10;
    if (TPS < TOTAL_THREADS) TOTAL_THREADS = TPS;
    let TOTAL_USERS = TPS;
    let USERS_PER_THREAD = Math.ceil(TOTAL_USERS / TOTAL_THREADS);
    let TOTAL_BATCHES = Math.ceil(TOTAL_TRANSACTIONS / TPS);
    let TRANSACTION_PER_BATCH = Math.ceil(TPS / TOTAL_THREADS);
    let WS_URL = argv.url ? argv.url : "ws://localhost:9944";
    let TOKENS_TO_SEND = 1;
    let MEASURE_FINALISATION = argv.finalization ? argv.finalization : false;
    let FINALISATION_TIMEOUT = argv.finalization_timeout ? argv.finalization_timeout : 20000; // 20 seconds
    let FINALISATION_ATTEMPTS = argv.finalization_attempts ? argv.finalization_attempts : 5;

    console.log('🚀 Starting Sub-Flood with full functionality...')
    console.log('📡 Connecting to:', WS_URL)
    
    // Initialize crypto
    await cryptoWaitReady()
    
    // Connect to node
    const provider = new WsProvider(WS_URL)
    const api = await ApiPromise.create({ provider })
    
    // Setup keyring
    const keyring = new Keyring({ type: 'sr25519' })

    // Get nonces for all accounts
    let nonces: number[] = [];
    console.log("Fetching nonces for accounts...");
    for (let i = 0; i <= TOTAL_USERS; i++) {
        let stringSeed = seedFromNum(i);
        let keys = keyring.addFromUri(stringSeed);
        let accountInfo = await api.query.system.account(keys.address) as any;
        let nonce = accountInfo.nonce.toNumber();
        nonces.push(nonce);
    }
    console.log("All nonces fetched!");

    // Endow all users from Alice account
    console.log("Endowing all users from Alice account...");
    let aliceKeyPair = keyring.addFromUri("//Alice");
    let aliceNonce = await api.rpc.system.accountNextIndex(aliceKeyPair.address);
    let keyPairs = new Map<number, any>();
    console.log("Alice nonce is " + aliceNonce.toNumber());

    let finalized_transactions = 0;

    for (let seed = 0; seed <= TOTAL_USERS; seed++) {
        let keypair = keyring.addFromUri(seedFromNum(seed));
        keyPairs.set(seed, keypair);

        // Should be greater than existential deposit
        let existentialDeposit = (api.consts.balances.existentialDeposit as any).toNumber();
        let transfer = api.tx.balances.transferKeepAlive(keypair.address, BigInt(existentialDeposit) * 10n);

        let receiverSeed = seedFromNum(seed);
        console.log(`Alice -> ${receiverSeed} (${keypair.address})`);

        await transfer.signAndSend(aliceKeyPair, { 
            nonce: aliceNonce as any,
            tip: 1
        }, ({ status }) => {
            if (status.isFinalized) {
                finalized_transactions++;
            }
        });
        aliceNonce = await api.rpc.system.accountNextIndex(aliceKeyPair.address);
    }
    console.log("All users endowed from Alice account!");

    console.log("Wait for transactions finalisation");
    await new Promise(r => setTimeout(r, FINALISATION_TIMEOUT));
    console.log(`Finalized transactions ${finalized_transactions}`);

    if (finalized_transactions < TOTAL_USERS + 1) {
        throw Error(`Not all transactions finalized`);
    }

    // Вместо pregenerate и thread_payloads:
    console.log(`Starting to send ${TOTAL_TRANSACTIONS} transactions across ${TOTAL_THREADS} threads...`);
    let nextTime = new Date().getTime();
    let initialTime = new Date();
    const finalisationTime = new Uint32Array(new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
    finalisationTime[0] = 0;
    const finalisedTxs = new Uint16Array(new SharedArrayBuffer(Uint16Array.BYTES_PER_ELEMENT));
    finalisedTxs[0] = 0;

    let txCounter = 0;
    for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo++) {
      while (new Date().getTime() < nextTime) {
        await new Promise(r => setTimeout(r, 5));
      }
      nextTime = nextTime + 1000;
      var errors = [];
      console.log(`Starting batch #${batchNo}`);
      let batchPromises = new Array<Promise<number>>();
      for (let threadNo = 0; threadNo < TOTAL_THREADS; threadNo++) {
        for (let transactionNo = 0; transactionNo < TRANSACTION_PER_BATCH; transactionNo++) {
          let userNo = threadNo * USERS_PER_THREAD + transactionNo;
          if (userNo >= TOTAL_USERS) break;
          if (!keyPairs.has(userNo)) continue;
          let senderKeyPair = keyPairs.get(userNo);
          batchPromises.push(
            new Promise<number>(async resolve => {
              try {
                // Получаем актуальный nonce для пользователя
                let nonce = (await api.rpc.system.accountNextIndex(senderKeyPair.address)).toNumber();
                let transfer = api.tx.balances.transferKeepAlive(aliceKeyPair.address, BigInt(TOKENS_TO_SEND));
                await transfer.signAndSend(senderKeyPair, {
                  nonce,
                  tip: 1
                }, ({ status }) => {
                  if (status.isFinalized) {
                    Atomics.add(finalisedTxs, 0, 1);
                    let finalisationTimeCurrent = new Date().getTime() - initialTime.getTime();
                    if (finalisationTimeCurrent > Atomics.load(finalisationTime, 0)) {
                      Atomics.store(finalisationTime, 0, finalisationTimeCurrent);
                    }
                  }
                });
                txCounter++;
                resolve(1);
              } catch (err: any) {
                errors.push(err);
                resolve(-1);
              }
            })
          );
        }
      }
      await Promise.all(batchPromises);
      if (errors.length > 0) {
        console.log(`${errors.length}/${TRANSACTION_PER_BATCH} errors sending transactions`);
      }
    }

    let finalTime = new Date();
    let diff = finalTime.getTime() - initialTime.getTime();

    var total_transactions = 0;
    var total_blocks = 0;
    var latest_block = await getBlockStats(api);
    console.log(`latest block: ${latest_block.date}`);
    console.log(`initial time: ${initialTime}`);
    let prunedFlag = false;
    for (; latest_block.date > initialTime; ) {
        try {
            latest_block = await getBlockStats(api, latest_block.parent);
        } catch(err: any) {
            console.log("Cannot retrieve block info with error: " + err.toString());
            console.log("Most probably the state is pruned already, stopping");
            prunedFlag = true;
            break;
        }
        if (latest_block.date < finalTime) {
            console.log(`block number ${latest_block.blockNumber}: ${latest_block.transactions} transactions`);
            total_transactions += latest_block.transactions;
            total_blocks++;
        }
    }

    let tps = (total_transactions * 1000) / diff;

    console.log(`TPS from ${total_blocks} blocks: ${tps}`);

    if (MEASURE_FINALISATION && !prunedFlag) {
        let break_condition = false;
        let attempt = 0;
        while (!break_condition) {
            console.log(`Wait ${FINALISATION_TIMEOUT} ms for transactions finalisation, attempt ${attempt} out of ${FINALISATION_ATTEMPTS}`);
            await new Promise(r => setTimeout(r, FINALISATION_TIMEOUT));

            if (Atomics.load(finalisedTxs, 0) < TOTAL_TRANSACTIONS) {
                if (attempt == FINALISATION_ATTEMPTS) {
                    // time limit reached
                    break_condition = true;
                } else {
                    attempt++;
                }
            } else {
                break_condition = true;
            }
        }
        console.log(`Finalized ${Atomics.load(finalisedTxs, 0)} out of ${TOTAL_TRANSACTIONS} transactions, finalization time was ${Atomics.load(finalisationTime, 0)}`);
    }
}

run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});
