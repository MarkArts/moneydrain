import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@chainlink/hardhat-chainlink";


const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;