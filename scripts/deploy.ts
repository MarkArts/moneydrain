import hre from "hardhat";

async function main() {
  const lock = await hre.viem.deployContract("Moneydrain", []);

  console.log(
    `deployed to ${lock.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
