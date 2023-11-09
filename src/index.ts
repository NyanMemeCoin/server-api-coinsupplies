import Fastify from "fastify";

import { createPublicClient, formatEther, getContract, http } from "viem";

import { mainnet } from "viem/chains";

import { ensRegistryConfig } from "./abi/nyanmemecoin";

///////////////////////////////////////////////////////////////////////////////
//  Addresses

const exchangeWalletAddress = "0xBc69E85091C982B271b1b6860ceDdb85cF294c13";

const address = ensRegistryConfig.address[mainnet.id];
const abi = ensRegistryConfig.abi;

//  Viem contract instance

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const contract = getContract({
  address,
  abi,
  publicClient,
});

///////////////////////////////////////////////////////////////////////////////
//  Fastify init

const fastify = Fastify({
  logger: true,
});

///////////////////////////////////////////////////////////////////////////////
//  Routes

fastify.get("/", async (_request, _reply) => {
  return { nyan: "meooow" };
});

fastify.get("/supplies/total", async (_request, reply) => {
  const totalSupply = await contract.read.totalSupply();
  const total = formatEther(totalSupply);
  reply.send(total);
});

fastify.get("/supplies/circulating", async (_request, reply) => {
  const totalSupply = await contract.read.totalSupply();
  const exchangeHoldings = await contract.read.balanceOf([
    exchangeWalletAddress,
  ]);
  const circulating = formatEther(totalSupply - exchangeHoldings);
  reply.send(circulating);
});

///////////////////////////////////////////////////////////////////////////////
//  WAGMI

const wagmi = async () => {
  try {
    await fastify.listen({ host: "0.0.0.0", port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

wagmi();
