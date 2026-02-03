const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const config = require('../config');

let connection = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }
  return connection;
}

async function getSolBalance(walletAddress) {
  const conn = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const balance = await conn.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

async function getTokenAccounts(walletAddress) {
  const conn = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const { value } = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  return value.map((account) => {
    const parsed = account.account.data.parsed.info;
    return {
      mint: parsed.mint,
      amount: parsed.tokenAmount.uiAmount,
      decimals: parsed.tokenAmount.decimals,
      address: account.pubkey.toString(),
    };
  }).filter((t) => t.amount > 0);
}

function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

module.exports = { getConnection, getSolBalance, getTokenAccounts, isValidSolanaAddress };
