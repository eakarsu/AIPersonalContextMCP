const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'mcp_clients', fields: ['name','public_key','status','last_used'] });
