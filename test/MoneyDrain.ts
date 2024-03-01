import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMoneyDrainFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, requester, taker, outsider] =
      await hre.viem.getWalletClients();

    const moneydrain = await hre.viem.deployContract("Moneydrain", [], {});
    const moneydrainRequester = await hre.viem.getContractAt(
      "Moneydrain",
      moneydrain.address,
      { walletClient: requester },
    );
    const moneydrainTaker = await hre.viem.getContractAt(
      "Moneydrain",
      moneydrain.address,
      { walletClient: taker },
    );
    const publicClient = await hre.viem.getPublicClient();

    return {
      moneydrain,
      moneydrainRequester,
      moneydrainTaker,
      publicClient,
      owner,
      requester,
      taker,
      outsider,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { moneydrain, owner } = await loadFixture(deployMoneyDrainFixture);
      expect(await moneydrain.read.owner()).to.equal(
        getAddress(owner.account.address),
      );
    });
  });

  describe("bets", function () {
    it("should create bet with correct ammount", async function () {
      const { moneydrain, moneydrainRequester, publicClient } =
        await loadFixture(deployMoneyDrainFixture);
      const hash = await moneydrainRequester.write.requestBet({
        value: parseEther("124"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      expect((await moneydrain.read.ledger([BigInt(1)]))[3]).to.equal(
        parseEther("124"),
      );
    });
    it("should create unique ids for each bet", async function () {
      const { moneydrain, moneydrainRequester, publicClient } =
        await loadFixture(deployMoneyDrainFixture);
      const hash1 = await moneydrainRequester.write.requestBet({
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await moneydrainRequester.write.requestBet({
        value: parseEther("2"),
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });
      const hash3 = await moneydrainRequester.write.requestBet({
        value: parseEther("3"),
      });
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      expect(await moneydrain.read.counter()).to.equal(BigInt(3));
    });
    it("should be able to take a bet and win the correct ammount when manipulating timestamp", async function () {
      const {
        moneydrain,
        moneydrainRequester,
        moneydrainTaker,
        publicClient,
        requester,
        taker,
        owner,
      } = await loadFixture(deployMoneyDrainFixture);
      const startRequesterBalance = await publicClient.getBalance({
        address: getAddress(requester.account.address),
      });
      const startTakerBalance = await publicClient.getBalance({
        address: getAddress(taker.account.address),
      });
      const startOwnerBalance = await publicClient.getBalance({
        address: getAddress(owner.account.address),
      });

      const betAmount = parseEther("42");
      const split = BigInt(Number(betAmount) / 100);

      const hash1 = await moneydrainRequester.write.requestBet({
        value: betAmount,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // make outcome predictable
      const latest = await time.latest();
      await time.setNextBlockTimestamp(
        latest % 2 == 0 ? latest + 2 : latest + 1,
      );

      const hash2 = await moneydrainTaker.write.takeBet([BigInt(1)], {
        value: betAmount,
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      expect((await moneydrain.read.ledger([BigInt(1)]))[2]).to.equal(
        getAddress(requester.account.address),
      );

      const hash3 = await moneydrainRequester.write.withdrawBet([BigInt(1)]);
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      const requesterBalance = await publicClient.getBalance({
        address: getAddress(requester.account.address),
      });
      const takerBalance = await publicClient.getBalance({
        address: getAddress(taker.account.address),
      });
      const ownerBalance = await publicClient.getBalance({
        address: getAddress(owner.account.address),
      });

      expect(requesterBalance).to.equal(10041579771787201916167n);
      expect(takerBalance).to.equal(9957999889403871656640n);
      expect(ownerBalance).to.equal(10000417270722235560336n);
    });
    it("should not be able to take a bet when you don't send enough eth", async function () {
      const {
        moneydrain,
        moneydrainRequester,
        moneydrainTaker,
        publicClient,
        requester,
      } = await loadFixture(deployMoneyDrainFixture);
      const hash1 = await moneydrainRequester.write.requestBet({
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      await expect(
        moneydrainTaker.write.takeBet([BigInt(1)], {
          value: parseEther("0.5"),
        }),
      ).to.be.rejectedWith("You must match the bet value");
      await expect(
        moneydrainTaker.write.takeBet([BigInt(1)], {
          value: parseEther("1.1"),
        }),
      ).to.be.rejectedWith("You must match the bet value");
    });
    it("should not be able to take a bet when it doesn't exist", async function () {
      const { moneydrainTaker } = await loadFixture(deployMoneyDrainFixture);
      await expect(
        moneydrainTaker.write.takeBet([BigInt(42)], {
          value: parseEther("0.5"),
        }),
      ).to.be.rejectedWith("Bet does not exist");
    });
    it("should not be able to withdraw a bet when it doesn't exist", async function () {
      const { moneydrainTaker } = await loadFixture(deployMoneyDrainFixture);
      await expect(
        moneydrainTaker.write.withdrawBet([BigInt(42)]),
      ).to.be.rejectedWith("Bet does not exist");
    });
  });
});
