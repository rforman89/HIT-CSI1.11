// Explicit opt-in only. Both helpers have fixed allowlists and separate credentials.
if (process.env.CSI_BACKEND && !['local', 'hosted'].includes(process.env.CSI_BACKEND)) throw new Error('Unknown test target');
module.exports = process.env.CSI_BACKEND === 'hosted' ? require('./hosted.cjs') : { ...require('./local.cjs'), fixtureFile: '.local/fixture.json', hosted: false, verify: async () => {} };
