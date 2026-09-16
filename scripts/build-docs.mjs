import fs from 'node:fs';
import { copy, sections } from '../web/src/protocol-copy.mjs';
import { priceOf, epochStart, epochSize } from '../shared/protocol.mjs';
import { formatEther } from 'ethers';
const table = '| Epoch | NFT numbers | USDC / mint |\n| --- | --- | --- |\n' + Array.from({
  length: 11
}, (_, e) => '| ' + e + ' | ' + epochStart(e) + '–' + String(epochStart(e) + epochSize(e) - 1n) + ' | ' + formatEther(priceOf(epochStart(e))) + ' |').join('\n');
const guide = rules => '# ' + rules.title + '\n\n' + rules.intro + '\n\n' + rules.status + '\n\n' + sections.map(id => '## ' + rules[id][0] + '\n\n' + rules[id].slice(1).join('\n\n') + (id === 'prices' ? '\n\n' + table : '')).join('\n\n') + '\n';
fs.mkdirSync('web/public/docs', {
  recursive: true
});
fs.writeFileSync('web/public/docs/arcfoundry-guide.md', guide(copy));
console.log('ArcFoundry guides built.');
