import { formatEther, parseEther } from "viem";
import hre from "hardhat";

async function main() {
  const publicClient = await hre.viem.getPublicClient();

  const [owner, otherAccount] = await hre.viem.getWalletClients();

  const lock = await hre.viem.getContractAt("Lock", "0x5FbDB2315678afecb367f032d93F642f64180aa3", { walletClient: owner});

  const hash = await lock.write.withdraw();
  const reciept = await publicClient.waitForTransactionReceipt({ hash });
  console.log(reciept);
  console.group(await lock.getEvents.Withdrawal())
  console.log(`transaction hash ${hash}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
