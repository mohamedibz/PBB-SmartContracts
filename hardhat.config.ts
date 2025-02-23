import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

import * as dotenv from "dotenv";
 
// Cargar variables desde el archivo .env
dotenv.config();

const config: HardhatUserConfig = {
  
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 
      }
    }
  },

  networks: {
    hardhat: {
      accounts: {
        count: 500,
        accountsBalance: "10000000000000000000000"
      },
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,  // Identificador de Sepolia
    },

    buildBear: {
      url: process.env.BUILDBEAR_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY2 ? [process.env.PRIVATE_KEY2] : [],
      chainId: 20939,  // Identificador de BUILDBEAR
    },

    alchemy: {
      url: process.env.ALCHEMY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY4 ? [process.env.PRIVATE_KEY4] : [],
      chainId: 11155111,  
    }
  },

  etherscan: {
    apiKey: "AAA6ZCJRDXRSW194X63MU53YPCXYERP5X5",
  },

  gasReporter: {
    enabled: true,
    currency: "EUR", 
    gasPrice: 3.8, 
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: "./reports/gas-report.txt",       
    noColors: true,                     
    showTimeSpent: true,                
    onlyCalledMethods: true, 
  }

};

export default config;
