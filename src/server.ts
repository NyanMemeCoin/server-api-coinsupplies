import Fastify from 'fastify';
import FastifyCaching from '@fastify/caching';

import {
  createPublicClient,
  formatEther,
  getContract,
  http
} from 'viem';

import { mainnet } from 'viem/chains';

import { ensRegistryConfig } from './abi/nyanmemecoin';

///////////////////////////////////////////////////////////////////////////////
//  Addresses

const burnAddress = '0x0000000000000000000000000000000000000000';
const exchangeWalletAddress = '0xBc69E85091C982B271b1b6860ceDdb85cF294c13';

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
  publicClient
});

///////////////////////////////////////////////////////////////////////////////
//  Fastify init

const fastify = Fastify({
  logger: true
});

///////////////////////////////////////////////////////////////////////////////
//  Routes

fastify.get('/', async (_request, _reply) => {
  return { nyan: 'meooow' };
});

fastify.get('/supplies/total', (_request, reply) => {
  fastify.cache.get('total', async (_err, cachedTotal) => {
    if (!cachedTotal) {
      fastify.log.info('Cache miss, calling blockchain.');
      const total = formatEther((await contract.read.totalSupply()));
      fastify.cache.set('total', total, 300000, (err) => {
        if (err) return err;
        reply.send(total);
      })
    } else {
      fastify.log.info('Cache hit');
      // @ts-ignore
      reply.send(cachedTotal.item);
    }
  });
});

fastify.get('/supplies/circulating', (_request, reply) => {
  fastify.cache.get('circulating', async (_err, cachedTotal) => {
    if (!cachedTotal) {
      fastify.log.info('Cache miss, calling blockchain.');
      const totalSupply = await contract.read.totalSupply();
      const exchangeHoldings = await contract.read.balanceOf(
        [exchangeWalletAddress]
      );
      const burntTokens = await contract.read.balanceOf([burnAddress]);
      const circulating = formatEther(
        totalSupply - exchangeHoldings - burntTokens
      );
      fastify.cache.set('circulating', circulating, 300000, (err) => {
        if (err) return err;
        reply.send(circulating);
      })
    } else {
      fastify.log.info('Cache hit');
      // @ts-ignore
      reply.send(cachedTotal.item);
    }
  });
});

///////////////////////////////////////////////////////////////////////////////
//  WAGMI

const wagmi = async () => {
  try {
    await fastify.register(
      FastifyCaching,
      {
        privacy: FastifyCaching.privacy.PUBLIC,
        expiresIn: 300,
        serverExpiresIn: 300,
      },
    );

    await fastify.listen({ host: '0.0.0.0', port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

wagmi();
