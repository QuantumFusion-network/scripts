import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import {cryptoWaitReady} from '@polkadot/util-crypto';

async function runTpsTest(txCount = 100) {
  await cryptoWaitReady();

  const node = process.env.NODE_URL;
  const _sender = process.env.SENDER;
  const _recipient = process.env.RECEPIENT;

  if (!node) {
    throw "WRONG NODE URL!"
  }

  const wsProvider = new WsProvider(node);
  const api = await ApiPromise.create({provider: wsProvider});

  const keyring = new Keyring({type: 'sr25519'});
  const sender = keyring.addFromUri(_sender);
  const recipient = keyring.addFromUri(_recipient);

  const remarkText = 'tps-test';
  const txs = [];

  const start = Date.now();

  for (let i = 0; i < txCount; i++) {
    const tx = api.tx.system.remark(`${remarkText}-${i}`);

    txs.push(
      tx.signAndSend(sender, {nonce: -1}) // авто-нонсы
    );
  }

  // Запуск всех транзакций
  await Promise.all(txs);

  const end = Date.now();
  const elapsedSeconds = (end - start) / 1000;

  console.log(`⏱  Sent ${txCount} txs in ${elapsedSeconds.toFixed(2)}s`);
  console.log(`⚡ TPS: ${(txCount / elapsedSeconds).toFixed(2)}`);

  await api.disconnect();
}

runTpsTest(100).catch(console.error);
