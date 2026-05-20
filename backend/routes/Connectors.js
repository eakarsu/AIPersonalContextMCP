const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'connectors', fields: ['name','provider','status','last_synced'] });
